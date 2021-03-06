"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
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
exports.Manager = void 0;
var debugPackage = require("debug");
var dgram = require("dgram");
var events_1 = require("events");
var lib_1 = require("./lib");
var debug = debugPackage("g-homa:manager");
// tslint:disable-next-line:no-namespace
var DiscoverResponse;
(function (DiscoverResponse) {
    function parse(response) {
        try {
            var parts = response.split(",");
            return {
                ip: parts[0],
                mac: parts[1],
                type: parts[2],
            };
        }
        catch (e) {
            return null;
        }
    }
    DiscoverResponse.parse = parse;
})(DiscoverResponse || (DiscoverResponse = {}));
var Manager = /** @class */ (function (_super) {
    __extends(Manager, _super);
    function Manager(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this) || this;
        if (options.networkInterfaceIndex == null)
            options.networkInterfaceIndex = 0;
        var broadcastAddresses = lib_1.getBroadcastAddresses();
        if (options.networkInterfaceIndex < 0 || options.networkInterfaceIndex > broadcastAddresses.length - 1) {
            debug("network interface index out of bounds");
            throw new Error("network interface index out of bounds");
        }
        _this.broadcastAddress = broadcastAddresses[options.networkInterfaceIndex];
        debug("broadcast addresses: " + broadcastAddresses);
        debug("=> using " + _this.broadcastAddress);
        _this.udp = dgram
            .createSocket("udp4")
            .once("listening", _this.udp_onListening.bind(_this))
            .on("error", function (e) {
            debug("socket error: " + e);
            throw e;
        });
        _this.udp.bind(0); // listen on a random free port
        return _this;
    }
    Manager.prototype.close = function () {
        this.udp.close();
        this.emit("closed");
        debug("socket closed");
    };
    Manager.prototype.udp_onListening = function () {
        debug("now listening");
        this.emit("ready");
    };
    Manager.prototype.send = function (msg, ip) {
        if (ip === void 0) { ip = this.broadcastAddress; }
        debug("sending message \"" + msg + "\" to " + ip);
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
            var responses, handleDiscoverResponse, actualPlugs, _i, responses_1, device;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        responses = [];
                        handleDiscoverResponse = function (msg, rinfo) {
                            if (msg.length && rinfo.port === 48899) {
                                debug("received response: " + msg.toString("ascii"));
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
                        actualPlugs = [];
                        _i = 0, responses_1 = responses;
                        _a.label = 2;
                    case 2:
                        if (!(_i < responses_1.length)) return [3 /*break*/, 5];
                        device = responses_1[_i];
                        return [4 /*yield*/, this.testPlug(device.ip)];
                    case 3:
                        if (_a.sent())
                            actualPlugs.push(device);
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/, actualPlugs];
                }
            });
        });
    };
    /**
     * Sends a request to a socket and waits for a response
     */
    Manager.prototype.request = function (msg, ip, timeout) {
        if (timeout === void 0) { timeout = 1000; }
        return __awaiter(this, void 0, void 0, function () {
            var response, handleResponse, start;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        handleResponse = function (resp, rinfo) {
                            if (resp.length && rinfo.port === 48899) {
                                response = resp.toString("ascii");
                                debug("received response: " + response);
                            }
                        };
                        // setup the handler and send the message
                        this.udp.once("message", handleResponse);
                        debug("sending message: " + msg);
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
                        return [2 /*return*/, response];
                }
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
            var response, newParams;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // ensure the port is a string
                        serverPort = "" + serverPort;
                        // send the password
                        this.udp.setBroadcast(false);
                        return [4 /*yield*/, this.request("HF-A11ASSISTHREAD", ip)];
                    case 1:
                        response = _a.sent();
                        if (!response)
                            return [2 /*return*/, false]; // rej("no response");
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
                            return [2 /*return*/, false]; // rej("setting new params failed");
                        return [4 /*yield*/, this.request("AT+NETP\r", ip)];
                    case 4:
                        // confirm the new parameters
                        response = _a.sent();
                        if (!response || !response.startsWith("+ok"))
                            return [2 /*return*/, false]; // rej("setting new params failed");
                        newParams = response.trim().split(",");
                        if (!(newParams.length === 4 &&
                            newParams[2] === serverPort &&
                            newParams[3] === serverAddress))
                            return [2 /*return*/, false]; // rej("new params were not accepted");
                        // success
                        return [2 /*return*/, true];
                }
            });
        });
    };
    /**
     * Restores the plug at the given IP to its original configuration
     */
    Manager.prototype.restorePlug = function (ip) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.configurePlug(ip, "plug.g-homa.com", 4196)];
            });
        });
    };
    /**
     * Tests if the device at the given IP is a G-Homa plug or not
     * @param ip
     */
    Manager.prototype.testPlug = function (ip) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // send the password
                        this.udp.setBroadcast(false);
                        return [4 /*yield*/, this.request("HF-A11ASSISTHREAD", ip)];
                    case 1:
                        response = _a.sent();
                        if (!response)
                            return [2 /*return*/, false]; // rej("no response");
                        // confirm receipt of the info
                        this.send("+ok", ip);
                        // wait a bit
                        return [4 /*yield*/, lib_1.wait(100)];
                    case 2:
                        // wait a bit
                        _a.sent();
                        return [4 /*yield*/, this.request("AT+LVER\r", ip)];
                    case 3:
                        // G-Homa devices respond to AT+LVER
                        response = _a.sent();
                        if (!response || !response.startsWith("+ok"))
                            return [2 /*return*/, false];
                        return [4 /*yield*/, this.request("AT+VER\r", ip)];
                    case 4:
                        // and their responde to AT+VER starts with GAO
                        response = _a.sent();
                        if (!response || !response.startsWith("+ok=GAO"))
                            return [2 /*return*/, false];
                        // success
                        return [2 /*return*/, true];
                }
            });
        });
    };
    return Manager;
}(events_1.EventEmitter));
exports.Manager = Manager;
