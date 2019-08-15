"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:variable-name
var crypto = require("crypto");
var events_1 = require("events");
var net = require("net");
var lib_1 = require("./lib");
// setup debug logging
var debugPackage = require("debug");
var debug = debugPackage("g-homa");
var PREFIX = Buffer.from([0x5A, 0xA5]);
var POSTFIX = Buffer.from([0x5B, 0xB5]);
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
})(Commands = exports.Commands || (exports.Commands = {}));
var SwitchSource;
(function (SwitchSource) {
    SwitchSource[SwitchSource["unknown"] = 0] = "unknown";
    SwitchSource[SwitchSource["local"] = 129] = "local";
    SwitchSource[SwitchSource["remote"] = 17] = "remote";
})(SwitchSource = exports.SwitchSource || (exports.SwitchSource = {}));
function serializeMessage(msg) {
    var data = Buffer.concat([Buffer.from([msg.command]), msg.payload]);
    var lengthBytes = [(data.length >>> 8) & 0xff, data.length & 0xff];
    var checksum = computeChecksum(data);
    return Buffer.concat([
        PREFIX,
        Buffer.from(lengthBytes),
        data,
        Buffer.from([checksum]),
        POSTFIX,
    ]);
}
function computeChecksum(data) {
    return 0xff - data.reduce(function (sum, cur) { return (sum + cur) & 0xff; }, 0);
}
function parseMessage(buf) {
    // the buffer has to be at least 2 (prefix) + 2 (length) + 1 (command) + 1 (checksum) + 2 (postfix) bytes long
    if (buf.length < 8)
        return null;
    if (!buf.slice(0, 2).equals(PREFIX)) {
        debug("invalid data in the receive buffer");
        debug(buf.toString("hex"));
        throw new Error("invalid data in the receive buffer");
    }
    // get length of the payload
    var payloadLength = buf.readUInt16BE(2);
    // check we have enough data
    if (buf.length < 6 + payloadLength)
        return null;
    // extract the payload
    var data = buf.slice(4, 4 + payloadLength);
    var command = data[0];
    var payload = Buffer.from(data.slice(1));
    // actually the buffer should be at least payloadLength + 7 bytes
    // but the firmware has a bug resulting in the 2nd response to INIT2 being 1 byte short
    if (command !== Commands.init2_response && buf.length < 7 + payloadLength)
        return null;
    // make sure the message ends with the postfix
    var getFinalBytes = function () { return buf.slice(4 + payloadLength + 1, 4 + payloadLength + 3); };
    var fail = function () {
        debug("invalid data in the receive buffer");
        debug(buf.toString("hex"));
        throw new Error("invalid data in the receive buffer");
    };
    if (!getFinalBytes().equals(POSTFIX)) {
        // if this is a (potentially bugged) init2_response, try again with a shorter buffer
        if (command === Commands.init2_response) {
            payloadLength--;
            if (!getFinalBytes().equals(POSTFIX)) {
                fail();
            }
            else {
                // that worked, now we need to shorten the data by 1 byte
                data = buf.slice(4, 4 + payloadLength);
                payload = Buffer.from(data.slice(1));
            }
        }
        else {
            fail();
        }
    }
    // extract the checksum and check it
    var checksum = buf[4 + payloadLength];
    if (checksum !== computeChecksum(data)) {
        debug("invalid checksum");
        debug(buf.toString("hex"));
        throw new Error("invalid checksum");
    }
    return {
        msg: {
            command: command,
            payload: payload,
        },
        bytesRead: 4 + payloadLength + 3,
    };
}
exports.parseMessage = parseMessage;
function formatMac(mac) {
    return lib_1.range(0, mac.length - 1)
        .map(function (i) { return mac[i].toString(16).toUpperCase(); })
        .join(":");
}
var PlugType;
(function (PlugType) {
    // Bytes 3-4 of a plug response determine what it supports
    PlugType[PlugType["normal"] = 12835] = "normal";
    PlugType[PlugType["withEnergyMeasurement"] = 13603] = "withEnergyMeasurement";
})(PlugType = exports.PlugType || (exports.PlugType = {}));
var EnergyMeasurementTypes;
(function (EnergyMeasurementTypes) {
    EnergyMeasurementTypes[EnergyMeasurementTypes["power"] = 1] = "power";
    EnergyMeasurementTypes[EnergyMeasurementTypes["energy"] = 2] = "energy";
    EnergyMeasurementTypes[EnergyMeasurementTypes["voltage"] = 3] = "voltage";
    EnergyMeasurementTypes[EnergyMeasurementTypes["current"] = 4] = "current";
    EnergyMeasurementTypes[EnergyMeasurementTypes["frequency"] = 5] = "frequency";
    EnergyMeasurementTypes[EnergyMeasurementTypes["maxPower"] = 7] = "maxPower";
    EnergyMeasurementTypes[EnergyMeasurementTypes["powerFactor"] = 8] = "powerFactor";
})(EnergyMeasurementTypes = exports.EnergyMeasurementTypes || (exports.EnergyMeasurementTypes = {}));
// tslint:disable-next-line:no-namespace
var Plug;
(function (Plug) {
    function from(internal) {
        return {
            id: internal.id,
            ip: internal.ip,
            type: internal.type,
            port: internal.port,
            lastSeen: internal.lastSeen,
            online: internal.online,
            shortmac: formatMac(internal.shortmac),
            mac: formatMac(internal.mac),
            state: internal.state,
            lastSwitchSource: internal.lastSwitchSource,
            firmware: internal.firmware,
            energyMeasurement: internal.energyMeasurement,
        };
    }
    Plug.from = from;
})(Plug || (Plug = {}));
// constant predefined messages
var msgInit1b = {
    command: Commands.init1,
    payload: Buffer.from([]),
};
var msgInit2 = {
    command: Commands.init2,
    payload: Buffer.from([0x01]),
};
var msgHeartbeatResponse = {
    command: Commands.heartbeat_response,
    payload: Buffer.from([]),
};
var msgSwitch_Part1 = Buffer.from([0x01, 0x01, 0x0a, 0xe0]);
var msgSwitch_Part2 = Buffer.from([0xff, 0xfe, 0x00, 0x00, 0x10, 0x11, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00]);
var Server = /** @class */ (function (_super) {
    __extends(Server, _super);
    function Server(port) {
        var _this = _super.call(this) || this;
        _this.plugs = {};
        _this.server = net
            .createServer(_this.server_onConnection.bind(_this))
            .once("listening", _this.server_onListening.bind(_this))
            .once("close", _this.server_onClose.bind(_this));
        if (port != null) {
            _this.server.listen(port);
        }
        else {
            _this.server.listen(0); // listen on a random free port
        }
        _this.checkPlugTimer = setInterval(_this.checkPlugsThread.bind(_this), 10000);
        return _this;
    }
    Server.prototype.close = function () {
        this.server.close();
    };
    // gets called whenever a new client connects
    Server.prototype.server_onConnection = function (socket) {
        var _this = this;
        debug("connection from " + socket.remoteAddress);
        var receiveBuffer = Buffer.from([]);
        var id;
        var plug;
        var isReconnection = false;
        socket.on("data", function (data) {
            // remember the received data
            receiveBuffer = Buffer.concat([receiveBuffer, data]);
            // parse all messages
            var msg = null;
            // parse all complete messages in the buffer
            // tslint:disable-next-line:no-conditional-assignment
            while (true) {
                try {
                    msg = parseMessage(receiveBuffer);
                }
                catch (e) {
                    if (e.message.indexOf("invalid data") > -1) {
                        // This is not a supported G-Homa plug
                        socket.end();
                        return;
                    }
                    // Pass the error through so we know whats going on
                    throw e;
                }
                // Did we receive a message?
                if (!msg)
                    break;
                // handle the message
                handleMessage(msg.msg);
                // and cut it from the buffer
                receiveBuffer = Buffer.from(receiveBuffer.slice(msg.bytesRead));
            }
        });
        socket.on("close", function () {
            if (id != null) {
                // known client, remove it from the list
                if (_this.plugs.hasOwnProperty(id))
                    delete _this.plugs[id];
                // also notify our listeners
                _this.emit("plug disconnected", id);
            }
        });
        socket.on("error", function (err) {
            debug("socket error. mac=" + plug.shortmac.toString("hex") + ". error: " + err);
        });
        // handles incoming messages
        var expectedCommands = [];
        var handleMessage = function (msg) {
            // check if the command was expected
            if (expectedCommands.length > 0 && expectedCommands.indexOf(msg.command) === -1) {
                _this.emit("error", "unexpected command: " + msg.command);
                socket.destroy();
                return;
            }
            // check if the command was sent from the correct plug
            if (plug && plug.shortmac && !msg.payload.slice(5, 8).equals(plug.shortmac)) {
                _this.emit("error", "received a message with a wrong shortmac");
                socket.destroy();
                return;
            }
            // TODO: can we refactor this so it becomes testable?
            switch (msg.command) {
                case Commands.init1_response:
                    // extract the triggercode and shortmac
                    var triggercode = Buffer.from(msg.payload.slice(3, 5));
                    var shortmac = Buffer.from(msg.payload.slice(5, 8));
                    id = shortmac.toString("hex");
                    if (_this.plugs.hasOwnProperty(id)) {
                        isReconnection = true;
                        // reconnection -- reuse plug object
                        plug = _this.plugs[id];
                        // but destroy and forget the old socket
                        if (plug.socket != null) {
                            debug("reconnection -- destroying socket");
                            plug.socket.removeAllListeners();
                            plug.socket.destroy();
                        }
                        // and remember the new one
                        plug.socket = socket;
                    }
                    else {
                        plug = {
                            id: null,
                            ip: socket.remoteAddress,
                            type: PlugType[(triggercode[0] << 8) + (triggercode[1])],
                            port: socket.remotePort,
                            lastSeen: Date.now(),
                            online: true,
                            socket: socket,
                            triggercode: null,
                            shortmac: null,
                            mac: null,
                            state: false,
                            lastSwitchSource: "unknown",
                            firmware: null,
                            energyMeasurement: {},
                        };
                        if (plug.type == null) {
                            debug("unknown plug type detected. triggercode is 0x" + triggercode.toString("hex"));
                            debug("the full payload was: 0x" + msg.payload.toString("hex"));
                        }
                    }
                    plug.id = id;
                    plug.triggercode = triggercode;
                    plug.shortmac = shortmac;
                    _this.onPlugResponse(plug);
                    // send init2 request
                    expectedCommands = [Commands.init2_response, Commands.state_update];
                    socket.write(serializeMessage(msgInit2));
                    break;
                case Commands.init2_response:
                    _this.onPlugResponse(plug);
                    // check if the payload contains the full mac at the end
                    if (msg.payload.slice(-3).equals(plug.shortmac)) {
                        // first reply, extract the full mac
                        plug.mac = Buffer.from(msg.payload.slice(-6));
                    }
                    else {
                        // 2nd reply, handshake is over
                        expectedCommands = [];
                        if (msg.payload.length === 16) {
                            // the last three bytes contain the firmware version
                            var _a = Array.from(msg.payload.slice(-3)), major = _a[0], minor = _a[1], build = _a[2];
                            plug.firmware = major + "." + minor + "." + build;
                        }
                        // remember plug and notify listeners
                        _this.plugs[id] = plug;
                        if (!isReconnection)
                            _this.emit("plug added", id);
                    }
                    break;
                case Commands.heartbeat:
                    _this.onPlugResponse(plug);
                    // reply so the socket doesn't forget us
                    socket.write(serializeMessage(msgHeartbeatResponse));
                    break;
                case Commands.state_update:
                    _this.onPlugResponse(plug);
                    // parse the state and the source of the state change
                    // we have to differentiate two different payloads here
                    if (msg.payload.length === 0x14) {
                        // 1st case: on/off report
                        plug.state = msg.payload[msg.payload.length - 1] > 0;
                        plug.lastSwitchSource = SwitchSource[msg.payload[11]];
                    }
                    else if (msg.payload.length === 0x15) {
                        // 2nd case: energy report
                        var type = msg.payload[16];
                        var value = lib_1.readUInt24(msg.payload, msg.payload.length - 3) / 100;
                        var typeName = EnergyMeasurementTypes[type];
                        plug.energyMeasurement[typeName] = value;
                    }
                    debug("got update: " + msg.payload.toString("hex"));
                    _this.emit("plug updated", Plug.from(plug));
                    break;
                default:
                    debug("received message with unknown command " + msg.command.toString(16));
                    debug(msg.payload.toString("hex"));
                    break;
            }
        };
        // start the handshake
        var msgInit1a = {
            command: Commands.init1,
            payload: crypto.randomBytes(6),
        };
        expectedCommands = [Commands.init1_response];
        socket.write(Buffer.concat([
            serializeMessage(msgInit1a),
            serializeMessage(msgInit1b),
        ]));
    };
    Server.prototype.server_onListening = function () {
        this.emit("server started", this.server.address());
    };
    Server.prototype.server_onClose = function () {
        clearInterval(this.checkPlugTimer);
        this.emit("server closed");
    };
    /**
     * Gets called when a plug sends an expected response
     */
    Server.prototype.onPlugResponse = function (plug) {
        plug.lastSeen = Date.now();
        // if the plug is known and was offline, notify listeners that it is alive
        if (plug.shortmac) {
            var id = plug.shortmac.toString("hex");
            if (!plug.online && this.plugs.hasOwnProperty(id)) {
                plug.online = true;
                this.emit("plug alive", id);
            }
        }
    };
    /**
     * Gets called regularly to clean up dead plugs from the database
     */
    Server.prototype.checkPlugsThread = function () {
        for (var _i = 0, _a = Object.keys(this.plugs); _i < _a.length; _i++) {
            var id = _a[_i];
            var plug = this.plugs[id];
            if (plug.online) {
                if (Date.now() - plug.lastSeen > 60000) {
                    // 1 minute with no response, expect the plug to be dead
                    plug.online = false;
                    this.emit("plug dead", id);
                }
            }
        }
    };
    /**
     * Switch the plug with the given ID to the given state
     */
    Server.prototype.switchPlug = function (id, state) {
        if (this.plugs.hasOwnProperty(id)) {
            var plug = this.plugs[id];
            var payload = Buffer.concat([
                msgSwitch_Part1,
                plug.triggercode,
                plug.shortmac,
                msgSwitch_Part2,
                Buffer.from([state ? 0xff : 0x00]),
            ]);
            var msgSwitch = {
                command: Commands.switch,
                payload: payload,
            };
            plug.socket.write(serializeMessage(msgSwitch));
        }
    };
    return Server;
}(events_1.EventEmitter));
exports.Server = Server;
