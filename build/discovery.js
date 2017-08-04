"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const dgram = require("dgram");
const events_1 = require("events");
const lib_1 = require("./lib");
const preambleCode = 0;
const preambleTimeout = 10;
const preambleNumPackets = 200;
const pskCodeSemiDigitBefore = 13;
const pskNumSemiDigitsBefore = 3;
const pskCodeSemiDigitAfter = 10;
const pskNumSemiDigitsAfter = 3;
const pskSemiDigitTimeout = 50;
const pskDigitTimeout = 100;
const pskNumChecksumPackets = 3;
const pskBlockTimeout = 500;
/**
 * Provides functions for inclusion and discover of G-Homa WiFi plugs
 * Only works if the discovering device transmits via WiFi or if
 * the router is configured to forward UDP broadcasts over WiFi
 */
class Discovery extends events_1.EventEmitter {
    constructor() {
        super();
        this._inclusionActive = false;
        this.broadcastAddress = lib_1.getBroadcastAddresses()[0];
        this.udp = dgram
            .createSocket("udp4")
            .once("listening", this.udp_onListening.bind(this))
            .on("error", (e) => { throw e; });
        this.udp.bind(49999);
    }
    close() {
        this.udp.close();
        this.emit("closed");
    }
    udp_onListening() {
        this.emit("ready");
    }
    get inclusionActive() { return this._inclusionActive; }
    /**
     * Starts inclusion of G-Homa plugs with the given Wifi psk.
     * @param psk - The wifi password
     * @param stopOnDiscover - Stop the inclusion when a device was found
     */
    beginInclusion(psk, stopOnDiscover = true) {
        this._inclusionActive = true;
        setTimeout(() => this._doInclusion(psk), 0);
    }
    _doInclusion(psk, stopOnDiscover = true) {
        return __awaiter(this, void 0, void 0, function* () {
            this.emit("inclusion started");
            // try to find new plugs, this only works while including
            const foundDevices = {}; // remember ips and mac addresses of found plugs
            const smartlinkHandler = (msg, rinfo) => {
                if (rinfo.port === 48899 && msg.length > 0) {
                    // ignore duplicates
                    if (foundDevices.hasOwnProperty(rinfo.address))
                        return;
                    // extract mac address
                    const data = msg.toString("utf8");
                    if (data.startsWith("smart_config ")) {
                        const mac = data.substring(data.indexOf(" ") + 1);
                        foundDevices[rinfo.address] = mac;
                        if (stopOnDiscover)
                            this.cancelInclusion();
                    }
                }
            };
            this.udp.on("message", smartlinkHandler);
            const smartlinkfindTimer = setInterval(() => this.udp.send("smartlinkfind", 48899, this.broadcastAddress), 1000);
            // start inclusion process
            const endTime = Date.now() + 60000; // default: only 60s inclusion
            while (this._inclusionActive && (Date.now() <= endTime)) {
                // send preamble
                for (let i of lib_1.range(1, preambleNumPackets)) {
                    yield this.sendCodeWithTimeout(preambleCode, preambleTimeout);
                }
                for (let iPSK = 1; iPSK <= 1; iPSK++) {
                    yield this.sendPSK(Buffer.from(psk, "ascii"));
                }
            }
            // the timer is over or the inclusion process has been handled
            clearInterval(smartlinkfindTimer);
            this.udp.removeListener("message", smartlinkHandler);
            this.emit("inclusion finished", foundDevices);
            return;
        });
    }
    sendPSK(psk) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let i of lib_1.range(1, pskNumSemiDigitsBefore)) {
                yield this.sendCodeWithTimeout(pskCodeSemiDigitBefore, (i < pskNumSemiDigitsBefore) ? pskSemiDigitTimeout : pskDigitTimeout);
            }
            for (let i = 0; i < psk.length; i++) {
                yield this.sendCodeWithTimeout(psk[i], pskDigitTimeout);
            }
            for (let i of lib_1.range(1, pskNumSemiDigitsAfter)) {
                yield this.sendCodeWithTimeout(pskCodeSemiDigitAfter, (i < pskNumSemiDigitsAfter) ? pskSemiDigitTimeout : pskDigitTimeout);
            }
            const lenCode = psk.length + 256;
            yield lib_1.wait(pskDigitTimeout);
            for (let i of lib_1.range(1, pskNumChecksumPackets)) {
                yield this.sendCodeWithTimeout(lenCode, (i < pskNumChecksumPackets) ? pskSemiDigitTimeout : pskBlockTimeout);
            }
        });
    }
    sendCodeWithTimeout(code, timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            const buf = Buffer.alloc(76 + code, 5);
            this.udp.setBroadcast(true);
            this.udp.send(buf, 49999, this.broadcastAddress);
            yield lib_1.wait(timeout);
            return null;
        });
    }
    /**
     * Cancels the inclusion process
     */
    cancelInclusion() {
        this._inclusionActive = false;
    }
}
exports.Discovery = Discovery;
//# sourceMappingURL=discovery.js.map