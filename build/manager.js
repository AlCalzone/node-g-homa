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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t;
    return { next: verb(0), "throw": verb(1), "return": verb(2) };
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var dgram = require("dgram");
var events_1 = require("events");
var lib_1 = require("./lib");
var DiscoverResponse;
(function (DiscoverResponse) {
    function parse(response) {
        try {
            var parts = response.split(",");
            return {
                ip: parts[0],
                mac: parts[1],
                type: parts[2]
            };
        }
        catch (e) {
            return null;
        }
    }
    DiscoverResponse.parse = parse;
})(DiscoverResponse || (DiscoverResponse = {}));
var Manager = (function (_super) {
    __extends(Manager, _super);
    function Manager() {
        var _this = _super.call(this) || this;
        _this.broadcastAddress = lib_1.getBroadcastAddresses()[0];
        console.log("broadcast address = " + _this.broadcastAddress);
        _this.udp = dgram
            .createSocket("udp4")
            .once("listening", _this.udp_onListening.bind(_this))
            .on("error", function (e) {
            console.log("error: " + e);
            throw e;
        });
        _this.udp.bind(); // doesn't matter which address
        return _this;
    }
    Manager.prototype.close = function () {
        this.udp.close();
        this.emit("closed");
        console.log("socket closed");
    };
    Manager.prototype.udp_onListening = function () {
        console.log("manager socket ready");
        this.emit("ready");
    };
    Manager.prototype.send = function (msg, ip) {
        if (ip === void 0) { ip = this.broadcastAddress; }
        console.log("sending message \"" + msg + "\" to " + ip);
        var buf = Buffer.from(msg, "ascii");
        this.udp.send(buf, 0, buf.length, 48899, ip);
    };
    /**
     * Finds all active G-Homa plugs on the network
     * @param duration - The time to wait for all responses
     */
    Manager.prototype.findAllPlugs = function (duration) {
        if (duration === void 0) { duration = 1000; }
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (res, rej) { return __awaiter(_this, void 0, void 0, function () {
                        var responses, handleDiscoverResponse;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    responses = [];
                                    handleDiscoverResponse = function (msg, rinfo) {
                                        if (msg.length && rinfo.port === 48899) {
                                            console.log("received response: " + msg.toString("ascii"));
                                            var response = DiscoverResponse.parse(msg.toString("ascii"));
                                            if (response)
                                                responses.push(response);
                                        }
                                    };
                                    this.udp.on("message", handleDiscoverResponse);
                                    this.udp.setBroadcast(true);
                                    this.send("HF-A11ASSISTHREAD");
                                    // Give the plugs time to respond
                                    return [4 /*yield*/, lib_1.wait(duration)];
                                case 1:
                                    // Give the plugs time to respond
                                    _a.sent();
                                    this.udp.removeListener("message", handleDiscoverResponse);
                                    // return the scan result
                                    res(responses);
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    /**
     * Sends a request to a socket and waits for a response
     */
    Manager.prototype.request = function (msg, ip, timeout) {
        if (timeout === void 0) { timeout = 1000; }
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (res, rej) { return __awaiter(_this, void 0, void 0, function () {
                        var response, handleResponse, start;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    handleResponse = function (msg, rinfo) {
                                        if (msg.length && rinfo.port === 48899) {
                                            response = msg.toString("ascii");
                                            console.log("received response: " + response);
                                        }
                                    };
                                    // setup the handler and send the message
                                    this.udp.once("message", handleResponse);
                                    console.log("sending message: " + msg);
                                    this.udp.setBroadcast(false);
                                    this.send(msg, ip);
                                    start = Date.now();
                                    _a.label = 1;
                                case 1:
                                    if (!(Date.now() - start < timeout)) return [3 /*break*/, 3];
                                    return [4 /*yield*/, lib_1.wait(10)];
                                case 2:
                                    _a.sent();
                                    if (response != null)
                                        return [3 /*break*/, 3];
                                    return [3 /*break*/, 1];
                                case 3:
                                    // remove handler
                                    this.udp.removeListener("message", handleResponse);
                                    // and fulfill the promise
                                    res(response);
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    /**
     * Configures the plug at the given IP to talk to a new server
     * @param ip
     * @param serverAddress
     * @param serverPort
     */
    Manager.prototype.configurePlug = function (ip, serverAddress, serverPort) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                // ensure the port is a string
                serverPort = "" + serverPort;
                return [2 /*return*/, new Promise(function (res, rej) { return __awaiter(_this, void 0, void 0, function () {
                        var response, newParams;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    // send the password
                                    this.udp.setBroadcast(false);
                                    return [4 /*yield*/, this.request("HF-A11ASSISTHREAD", ip)];
                                case 1:
                                    response = _a.sent();
                                    if (!response)
                                        return [2 /*return*/, res(false)]; //rej("no response");
                                    // confirm receipt of the info 
                                    this.send("+ok", ip);
                                    // wait a bit
                                    return [4 /*yield*/, lib_1.wait(100)];
                                case 2:
                                    // wait a bit
                                    _a.sent();
                                    return [4 /*yield*/, this.request("AT+NETP=TCP,Client," + serverPort + "," + serverAddress + "\r", ip)];
                                case 3:
                                    // set the new parameters
                                    response = _a.sent();
                                    if (!response || !response.startsWith("+ok"))
                                        return [2 /*return*/, res(false)]; //rej("setting new params failed");
                                    return [4 /*yield*/, this.request("AT+NETP\r", ip)];
                                case 4:
                                    // confirm the new parameters
                                    response = _a.sent();
                                    if (!response || !response.startsWith("+ok"))
                                        return [2 /*return*/, res(false)]; //rej("setting new params failed");
                                    newParams = response.trim().split(",");
                                    if (!(newParams.length === 4 &&
                                        newParams[2] === serverPort &&
                                        newParams[3] === serverAddress))
                                        return [2 /*return*/, res(false)]; //rej("new params were not accepted");
                                    // success
                                    res(true);
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    /**
     * Restores the plug at the given IP to its original configuration
     */
    Manager.prototype.restorePlug = function (ip) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.configurePlug(ip, "plug.g-homa.com", 4196)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return Manager;
}(events_1.EventEmitter));
exports.Manager = Manager;
//# sourceMappingURL=manager.js.map