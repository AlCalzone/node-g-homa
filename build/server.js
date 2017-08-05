"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const net = require("net");
const crypto = require("crypto");
const lib_1 = require("./lib");
const PREFIX = Buffer.from([0x5A, 0xA5]);
const POSTFIX = Buffer.from([0x5B, 0xB5]);
var Commands;
(function (Commands) {
    Commands[Commands["init1"] = 2] = "init1";
    Commands[Commands["init1_response"] = 3] = "init1_response";
    Commands[Commands["init2"] = 5] = "init2";
    Commands[Commands["init2_response"] = 7] = "init2_response";
    Commands[Commands["heartbeat"] = 4] = "heartbeat";
    Commands[Commands["heartbeat_response"] = 6] = "heartbeat_response";
    Commands[Commands["switch"] = 16] = "switch";
    Commands[Commands["state_update"] = 144] = "state_update";
})(Commands || (Commands = {}));
var SwitchSourceInternal;
(function (SwitchSourceInternal) {
    SwitchSourceInternal[SwitchSourceInternal["unknown"] = 0] = "unknown";
    SwitchSourceInternal[SwitchSourceInternal["remote"] = 129] = "remote";
    SwitchSourceInternal[SwitchSourceInternal["local"] = 17] = "local";
})(SwitchSourceInternal || (SwitchSourceInternal = {}));
function serializeMessage(msg) {
    const data = Buffer.concat([Buffer.from([msg.command]), msg.payload]);
    const lengthBytes = [(data.length >>> 8) & 0xff, data.length & 0xff];
    const checksum = computeChecksum(data);
    return Buffer.concat([
        PREFIX,
        Buffer.from(lengthBytes),
        data,
        Buffer.from([checksum]),
        POSTFIX
    ]);
}
function computeChecksum(data) {
    return 0xff - data.reduce((sum, cur) => (sum + cur) & 0xff, 0);
}
function parseMessage(buf) {
    // the buffer has to be at least 2 (prefix) + 2 (length) + 1 (command) + 1 (checksum) + 2 (postfix) bytes long
    if (buf.length < 8)
        return null;
    if (!buf.slice(0, 2).equals(PREFIX)) {
        console.log("invalid data in the receive buffer");
        console.log(buf.toString("hex"));
        throw new Error("invalid data in the receive buffer");
    }
    // get length of the payload
    const payloadLength = buf.readUInt16BE(2);
    // check we have enough data
    if (buf.length < 7 + payloadLength)
        return null;
    // extract the payload
    const data = buf.slice(4, 4 + payloadLength);
    const command = data[0];
    const payload = Buffer.from(data.slice(1));
    // extract the checksum and check it
    const checksum = buf[4 + payloadLength];
    if (checksum !== computeChecksum(data)) {
        console.log("invalid checksum");
        console.log(buf.toString("hex"));
        throw new Error("invalid checksum");
    }
    // make sure the message ends with the postfix
    if (!buf.slice(4 + payloadLength + 1, 4 + payloadLength + 3).equals(POSTFIX)) {
        console.log("invalid data in the receive buffer");
        console.log(buf.toString("hex"));
        throw new Error("invalid data in the receive buffer");
    }
    return {
        msg: {
            command: command,
            payload: payload
        },
        bytesRead: 4 + payloadLength + 3
    };
}
function formatMac(mac) {
    return lib_1.range(0, mac.length - 1)
        .map(i => mac[i].toString(16).toUpperCase())
        .join(":");
}
var Plug;
(function (Plug) {
    function from(internal) {
        return {
            id: internal.id,
            ip: internal.ip,
            port: internal.port,
            lastSeen: internal.lastSeen,
            online: internal.online,
            shortmac: formatMac(internal.shortmac),
            mac: formatMac(internal.mac),
            state: internal.state,
            lastSwitchSource: (() => {
                switch (internal.lastSwitchSource) {
                    case SwitchSourceInternal.unknown: return "unknown";
                    case SwitchSourceInternal.remote: return "remote";
                    case SwitchSourceInternal.local: return "local";
                }
            })(),
        };
    }
    Plug.from = from;
})(Plug || (Plug = {}));
// constant predefined messages
const msgInit1b = {
    command: Commands.init1,
    payload: Buffer.from([])
};
const msgInit2 = {
    command: Commands.init2,
    payload: Buffer.from([0x01])
};
const msgHeartbeatResponse = {
    command: Commands.heartbeat_response,
    payload: Buffer.from([])
};
const msgSwitch_Part1 = Buffer.from([0x01, 0x01, 0x0a, 0xe0]);
const msgSwitch_Part2 = Buffer.from([0xff, 0xfe, 0x00, 0x00, 0x10, 0x11, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00]);
class Server extends events_1.EventEmitter {
    constructor(port) {
        super();
        this.plugs = {};
        this.server = net
            .createServer(this.server_onConnection.bind(this))
            .once("listening", this.server_onListening.bind(this))
            .once("close", this.server_onClose.bind(this));
        if (port != null)
            this.server.listen(port);
        else
            this.server.listen();
        this.checkPlugTimer = setInterval(this.checkPlugsThread.bind(this), 10000);
    }
    close() {
        this.server.close();
    }
    // gets called whenever a new client connects
    server_onConnection(socket) {
        console.log("connection from " + socket.remoteAddress);
        let receiveBuffer = Buffer.from([]);
        let id;
        let plug;
        let isReconnection = false;
        socket.on("data", (data) => {
            // remember the received data
            receiveBuffer = Buffer.concat([receiveBuffer, data]);
            // parse all messages
            let msg;
            // parse all complete messages in the buffer
            while (msg = parseMessage(receiveBuffer)) {
                // handle the message
                handleMessage(msg.msg);
                // and cut it from the buffer
                receiveBuffer = Buffer.from(receiveBuffer.slice(msg.bytesRead));
            }
        });
        socket.on("close", () => {
            if (id != null) {
                // known client, remove it from the list
                if (this.plugs.hasOwnProperty(id))
                    delete this.plugs[id];
                // also notify our listeners
                this.emit("plug disconnected", id);
            }
        });
        socket.on("error", (err) => {
            console.log(`socket error. mac=${plug.shortmac}. error: ${err}`);
        });
        // handles incoming messages
        let expectedCommands = [];
        const handleMessage = (msg) => {
            // check if the command was expected
            if (expectedCommands.length > 0 && expectedCommands.indexOf(msg.command) === -1) {
                this.emit("error", "unexpected command: " + msg.command);
                socket.destroy();
                return;
            }
            // check if the command was sent from the correct plug
            if (plug && plug.shortmac && !msg.payload.slice(5, 8).equals(plug.shortmac)) {
                this.emit("error", "received a message with a wrong shortmac");
                socket.destroy();
                return;
            }
            switch (msg.command) {
                case Commands.init1_response:
                    // extract the triggercode and shortmac
                    let triggercode = Buffer.from(msg.payload.slice(3, 5));
                    let shortmac = Buffer.from(msg.payload.slice(5, 8));
                    id = shortmac.toString("hex");
                    if (this.plugs.hasOwnProperty(id)) {
                        isReconnection = true;
                        plug = this.plugs[id];
                    }
                    else {
                        plug = {
                            id: null,
                            ip: socket.address().address,
                            port: socket.address().port,
                            lastSeen: Date.now(),
                            online: true,
                            socket: socket,
                            triggercode: null,
                            shortmac: null,
                            mac: null,
                            state: false,
                            lastSwitchSource: SwitchSourceInternal.unknown
                        };
                    }
                    plug.id = id;
                    plug.triggercode = triggercode;
                    plug.shortmac = shortmac;
                    this.onPlugResponse(plug);
                    // send init2 request
                    expectedCommands = [Commands.init2_response, Commands.state_update];
                    socket.write(serializeMessage(msgInit2));
                    break;
                case Commands.init2_response:
                    this.onPlugResponse(plug);
                    // check if the payload contains the full mac at the end
                    if (msg.payload.slice(-3).equals(plug.shortmac)) {
                        // first reply, extract the full mac
                        plug.mac = Buffer.from(msg.payload.slice(-6));
                    }
                    else {
                        // 2nd reply, handshake is over
                        expectedCommands = [];
                        // remember plug and notify listeners
                        this.plugs[id] = plug;
                        if (!isReconnection)
                            this.emit("plug added", id);
                    }
                    break;
                case Commands.heartbeat:
                    this.onPlugResponse(plug);
                    // reply so the socket doesn't forget us
                    socket.write(serializeMessage(msgHeartbeatResponse));
                    break;
                case Commands.state_update:
                    this.onPlugResponse(plug);
                    // parse the state and the source of the state change
                    plug.state = msg.payload[msg.payload.length - 1] > 0;
                    plug.lastSwitchSource = msg.payload[12];
                    this.emit("plug updated", Plug.from(plug));
                    break;
            }
        };
        // start the handshake
        const msgInit1a = {
            command: Commands.init1,
            payload: crypto.randomBytes(6) // Buffer.from([0x05, 0x0d, 0x07, 0x05, 0x07, 0x12])
        };
        expectedCommands = [Commands.init1_response];
        socket.write(Buffer.concat([
            serializeMessage(msgInit1a),
            serializeMessage(msgInit1b)
        ]));
    }
    server_onListening() {
        this.emit("server started", this.server.address());
    }
    server_onClose() {
        clearInterval(this.checkPlugTimer);
        this.emit("server closed");
    }
    /**
     * Gets called when a plug sends an expected response
     */
    onPlugResponse(plug) {
        plug.lastSeen = Date.now();
        // if the plug is known and was offline, notify listeners that it is alive
        if (plug.shortmac) {
            const id = plug.shortmac.toString("hex");
            if (!plug.online && this.plugs.hasOwnProperty(id)) {
                plug.online = true;
                this.emit("plug alive", id);
            }
        }
    }
    /**
     * Gets called regularly to clean up dead plugs from the database
     */
    checkPlugsThread() {
        for (let id of Object.keys(this.plugs)) {
            const plug = this.plugs[id];
            if (plug.online) {
                if (Date.now() - plug.lastSeen > 60000) {
                    // 1 minute with no response, expect the plug to be dead
                    plug.online = false;
                    this.emit("plug dead", id);
                }
            }
        }
    }
    /**
     * Switch the plug with the given ID to the given state
     */
    switchPlug(id, state) {
        if (this.plugs.hasOwnProperty(id)) {
            const plug = this.plugs[id];
            const payload = Buffer.concat([
                msgSwitch_Part1,
                plug.triggercode,
                plug.shortmac,
                msgSwitch_Part2,
                Buffer.from([state ? 0xff : 0x00])
            ]);
            const msgSwitch = {
                command: Commands.switch,
                payload: payload
            };
            plug.socket.write(serializeMessage(msgSwitch));
        }
    }
}
exports.Server = Server;
//# sourceMappingURL=server.js.map