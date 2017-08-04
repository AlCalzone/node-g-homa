"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const net = require("net");
const crypto = require("crypto");
const PREFIX = Buffer.from([0x5A, 0xA5]);
const POSTFIX = Buffer.from([0x5B, 0xB5]);
var Commands;
(function (Commands) {
    Commands[Commands["init1"] = 1] = "init1";
    Commands[Commands["init1_response"] = 3] = "init1_response";
    Commands[Commands["init2"] = 5] = "init2";
    Commands[Commands["init2_response"] = 7] = "init2_response";
    Commands[Commands["heartbeat"] = 4] = "heartbeat";
    Commands[Commands["heartbeat_response"] = 6] = "heartbeat_response";
    Commands[Commands["switch"] = 16] = "switch";
    Commands[Commands["state_update"] = 144] = "state_update";
})(Commands || (Commands = {}));
var SwitchSource;
(function (SwitchSource) {
    SwitchSource[SwitchSource["remote"] = 129] = "remote";
    SwitchSource[SwitchSource["local"] = 17] = "local";
})(SwitchSource || (SwitchSource = {}));
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
    return 256 - data.reduce((sum, cur) => (sum + cur) & 0xff, 0);
}
function parseMessage(buf) {
    // the buffer has to be at least 2 (prefix) + 2 (length) + 1 (command) + 1 (checksum) + 2 (postfix) bytes long
    if (buf.length < 8)
        return null;
    if (!buf.slice(0, 2).equals(PREFIX))
        throw new Error("invalid data in the receive buffer");
    // get length of the payload
    const payloadLength = buf.readUInt16BE(2);
    // check we have enough data
    if (buf.length < 8 + payloadLength)
        return null;
    // extract the payload
    const data = buf.slice(4, 4 + payloadLength);
    const command = data[0];
    const payload = Buffer.from(data.slice(1));
    // extract the checksum and check it
    const checksum = buf[4 + payloadLength];
    if (checksum !== computeChecksum(data))
        throw new Error("invalid checksum");
    // make sure the message ends with the postfix
    if (!buf.slice(4 + payloadLength + 1, 4 + payloadLength + 3).equals(POSTFIX))
        throw new Error("invalid data in the receive buffer");
    return {
        msg: {
            command: command,
            payload: payload
        },
        bytesRead: 4 + payloadLength + 3
    };
}
class Server extends events_1.EventEmitter {
    constructor() {
        super();
        this.clients = {};
        this.server = net
            .createServer(this.server_onConnection.bind(this))
            .on("listening", this.server_onListening.bind(this));
        this.server.listen();
    }
    // gets called whenever a new client connects
    server_onConnection(socket) {
        let receiveBuffer = Buffer.from([]);
        let shortmac;
        socket.on("data", (data) => {
            // remember the received data
            receiveBuffer = Buffer.concat([receiveBuffer, data]);
            // parse all messages
            let msg;
            while (msg = parseMessage(receiveBuffer)) {
                handleMessage(msg.msg);
                receiveBuffer = Buffer.from(receiveBuffer.slice(msg.bytesRead));
            }
        });
        socket.on("close", () => {
            if (shortmac != null) {
                // known client, remove it from the list
                if (this.clients.hasOwnProperty(shortmac))
                    delete this.clients[shortmac];
                // also notify our listeners
                this.emit("client disconnected", shortmac);
            }
        });
        socket.on("error", (err) => {
            console.log(`socket error. mac=${shortmac}. error: ${err}`);
        });
        // handles incoming messages
        function handleMessage(msg) {
            switch (msg.command) {
            }
        }
        // start the handshake
        const msgInit1a = {
            command: Commands.init1,
            payload: crypto.randomBytes(6)
        };
        const msgInit1b = {
            command: Commands.init1,
            payload: Buffer.from([])
        };
        socket.write(Buffer.concat([
            serializeMessage(msgInit1a),
            serializeMessage(msgInit1b)
        ]));
    }
    server_onListening() {
        this.emit("server started", this.server.address());
    }
}
exports.Server = Server;
//# sourceMappingURL=server.js.map