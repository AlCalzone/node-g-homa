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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
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
var debugPackage = require("debug");
var dgram = require("dgram");
var events_1 = require("events");
var lib_1 = require("./lib");
var debug = debugPackage("g-homa:discovery");
var preambleCode = 0;
var preambleTimeout = 10;
var preambleNumPackets = 200;
var pskCodeSemiDigitBefore = 13;
var pskNumSemiDigitsBefore = 3;
var pskCodeSemiDigitAfter = 10;
var pskNumSemiDigitsAfter = 3;
var pskSemiDigitTimeout = 50;
var pskDigitTimeout = 100;
var pskNumChecksumPackets = 3;
var pskBlockTimeout = 500;
var DISCOVERY_PORT = 49999;
/**
 * Provides functions for inclusion and discover of G-Homa WiFi plugs
 * Only works if the discovering device transmits via WiFi or if
 * the router is configured to forward UDP broadcasts over WiFi
 */
var Discovery = /** @class */ (function (_super) {
    __extends(Discovery, _super);
    function Discovery(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this) || this;
        _this._inclusionActive = false;
        debug("starting discovery with options:");
        debug(JSON.stringify(options, null, 4));
        if (options.networkInterfaceIndex == null)
            options.networkInterfaceIndex = 0;
        var broadcastAddresses = lib_1.getBroadcastAddresses();
        _this.broadcastAddress = broadcastAddresses[options.networkInterfaceIndex];
        debug("broadcast address: " + broadcastAddresses);
        debug("=> using " + _this.broadcastAddress);
        _this.udp = dgram
            .createSocket("udp4")
            .once("listening", _this.udp_onListening.bind(_this))
            .on("error", function (e) {
            debug("socket error: " + e);
            throw e;
        });
        _this.udp.bind(DISCOVERY_PORT);
        return _this;
    }
    Discovery.prototype.close = function () {
        this.udp.close();
        this.emit("closed");
    };
    Discovery.prototype.udp_onListening = function () {
        debug("now listening on port " + DISCOVERY_PORT);
        this.emit("ready");
    };
    Object.defineProperty(Discovery.prototype, "inclusionActive", {
        get: function () { return this._inclusionActive; },
        enumerable: true,
        configurable: true
    });
    /**
     * Starts inclusion of G-Homa plugs with the given Wifi psk.
     * @param psk - The wifi password
     * @param stopOnDiscover - Stop the inclusion when a device was found
     */
    Discovery.prototype.beginInclusion = function (psk, stopOnDiscover) {
        var _this = this;
        if (stopOnDiscover === void 0) { stopOnDiscover = true; }
        this._inclusionActive = true;
        setTimeout(function () { return _this._doInclusion(psk); }, 0);
    };
    Discovery.prototype._doInclusion = function (psk, stopOnDiscover) {
        if (stopOnDiscover === void 0) { stopOnDiscover = true; }
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var foundDevices, smartlinkHandler, smartlinkfindTimer, endTime, _i, _a, i, iPSK;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.emit("inclusion started");
                        debug("inclusion started");
                        foundDevices = {};
                        smartlinkHandler = function (msg, rinfo) {
                            if (rinfo.port === 48899 && msg.length > 0) {
                                debug("got response from device with address: " + rinfo.address);
                                // ignore duplicates
                                if (foundDevices.hasOwnProperty(rinfo.address))
                                    return;
                                // extract mac address
                                var data = msg.toString("utf8");
                                if (data.startsWith("smart_config ")) {
                                    var mac = data.substring(data.indexOf(" ") + 1);
                                    foundDevices[rinfo.address] = mac;
                                    debug("remembering device: MAC=" + mac + ", IP=" + rinfo.address);
                                    if (stopOnDiscover)
                                        _this.cancelInclusion();
                                }
                            }
                        };
                        this.udp.on("message", smartlinkHandler);
                        smartlinkfindTimer = setInterval(function () {
                            var msg = Buffer.from("smartlinkfind", "ascii");
                            _this.udp.send(msg, 0, msg.length, 48899, _this.broadcastAddress);
                        }, 1000);
                        endTime = Date.now() + 60000;
                        _b.label = 1;
                    case 1:
                        if (!(this._inclusionActive && (Date.now() <= endTime))) return [3 /*break*/, 10];
                        _i = 0, _a = lib_1.range(1, preambleNumPackets);
                        _b.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 5];
                        i = _a[_i];
                        return [4 /*yield*/, this.sendCodeWithTimeout(preambleCode, preambleTimeout)];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5:
                        iPSK = 1;
                        _b.label = 6;
                    case 6:
                        if (!(iPSK <= 1)) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.sendPSK(Buffer.from(psk, "ascii"))];
                    case 7:
                        _b.sent();
                        _b.label = 8;
                    case 8:
                        iPSK++;
                        return [3 /*break*/, 6];
                    case 9: return [3 /*break*/, 1];
                    case 10:
                        // the timer is over or the inclusion process has been handled
                        clearInterval(smartlinkfindTimer);
                        this.udp.removeListener("message", smartlinkHandler);
                        debug("inclusion finished. Found " + Object.keys(foundDevices).length + " devices.");
                        this.emit("inclusion finished", foundDevices);
                        return [2 /*return*/];
                }
            });
        });
    };
    Discovery.prototype.sendPSK = function (psk) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, i, i, _b, _c, i, lenCode, _d, _e, i;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        _i = 0, _a = lib_1.range(1, pskNumSemiDigitsBefore);
                        _f.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        i = _a[_i];
                        return [4 /*yield*/, this.sendCodeWithTimeout(pskCodeSemiDigitBefore, (i < pskNumSemiDigitsBefore) ? pskSemiDigitTimeout : pskDigitTimeout)];
                    case 2:
                        _f.sent();
                        _f.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        i = 0;
                        _f.label = 5;
                    case 5:
                        if (!(i < psk.length)) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.sendCodeWithTimeout(psk[i], pskDigitTimeout)];
                    case 6:
                        _f.sent();
                        _f.label = 7;
                    case 7:
                        i++;
                        return [3 /*break*/, 5];
                    case 8:
                        _b = 0, _c = lib_1.range(1, pskNumSemiDigitsAfter);
                        _f.label = 9;
                    case 9:
                        if (!(_b < _c.length)) return [3 /*break*/, 12];
                        i = _c[_b];
                        return [4 /*yield*/, this.sendCodeWithTimeout(pskCodeSemiDigitAfter, (i < pskNumSemiDigitsAfter) ? pskSemiDigitTimeout : pskDigitTimeout)];
                    case 10:
                        _f.sent();
                        _f.label = 11;
                    case 11:
                        _b++;
                        return [3 /*break*/, 9];
                    case 12:
                        lenCode = psk.length + 256;
                        return [4 /*yield*/, lib_1.wait(pskDigitTimeout)];
                    case 13:
                        _f.sent();
                        _d = 0, _e = lib_1.range(1, pskNumChecksumPackets);
                        _f.label = 14;
                    case 14:
                        if (!(_d < _e.length)) return [3 /*break*/, 17];
                        i = _e[_d];
                        return [4 /*yield*/, this.sendCodeWithTimeout(lenCode, (i < pskNumChecksumPackets) ? pskSemiDigitTimeout : pskBlockTimeout)];
                    case 15:
                        _f.sent();
                        _f.label = 16;
                    case 16:
                        _d++;
                        return [3 /*break*/, 14];
                    case 17: return [2 /*return*/];
                }
            });
        });
    };
    Discovery.prototype.sendCodeWithTimeout = function (code, timeout) {
        return __awaiter(this, void 0, void 0, function () {
            var buf;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        buf = new Buffer(76 + code).fill(5);
                        this.udp.setBroadcast(true);
                        this.udp.send(buf, 0, buf.length, 49999, this.broadcastAddress);
                        return [4 /*yield*/, lib_1.wait(timeout)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, null];
                }
            });
        });
    };
    /**
     * Cancels the inclusion process
     */
    Discovery.prototype.cancelInclusion = function () {
        debug("stopping inclusion...");
        this._inclusionActive = false;
    };
    return Discovery;
}(events_1.EventEmitter));
exports.Discovery = Discovery;
