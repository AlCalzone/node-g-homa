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
var DiscoverResponse;
(function (DiscoverResponse) {
    function parse(response) {
        try {
            const parts = response.split(",");
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
class Manager extends events_1.EventEmitter {
    constructor() {
        super();
        this.broadcastAddress = lib_1.getBroadcastAddresses()[0];
        this.udp = dgram
            .createSocket("udp4")
            .once("listening", this.udp_onListening.bind(this))
            .on("error", (e) => { throw e; });
        this.udp.bind(); // doesn't matter which address
    }
    close() {
        this.udp.close();
        this.emit("closed");
    }
    udp_onListening() {
        this.emit("ready");
    }
    send(msg, ip = this.broadcastAddress) {
        const buf = Buffer.from(msg, "ascii");
        this.udp.send(buf, 0, buf.length, 48899, ip);
    }
    /**
     * Finds all active G-Homa plugs on the network
     * @param duration - The time to wait for all responses
     */
    findAllPlugs(duration = 1000) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((res, rej) => __awaiter(this, void 0, void 0, function* () {
                const responses = [];
                const handleDiscoverResponse = (msg, rinfo) => {
                    if (msg.length && rinfo.port === 48899) {
                        const response = DiscoverResponse.parse(msg.toString("ascii"));
                        if (response)
                            responses.push(response);
                    }
                };
                this.udp.on("message", handleDiscoverResponse);
                this.send("HF-A11ASSISTHREAD");
                // Give the plugs time to respond
                yield lib_1.wait(duration);
                this.udp.removeListener("message", handleDiscoverResponse);
                // return the scan result
                res(responses);
            }));
        });
    }
    /**
     * Sends a request to a socket and waits for a response
     */
    request(msg, ip, timeout = 1000) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((res, rej) => __awaiter(this, void 0, void 0, function* () {
                let response;
                const handleResponse = (msg, rinfo) => {
                    if (msg.length && rinfo.port === 48899) {
                        response = msg.toString("ascii");
                    }
                };
                // setup the handler and send the message
                this.udp.once("message", handleResponse);
                this.send(msg, ip);
                // wait for a receipt (we are only expecting single messages)
                const start = Date.now();
                while (Date.now() - start < timeout) {
                    yield lib_1.wait(10);
                    if (response != null)
                        break;
                }
                // remove handler
                this.udp.removeListener("message", handleResponse);
                // and fulfill the promise
                res(response);
            }));
        });
    }
    /**
     * Configures the plug at the given IP to talk to a new server
     * @param ip
     * @param serverAddress
     * @param serverPort
     */
    configurePlug(ip, serverAddress, serverPort) {
        return __awaiter(this, void 0, void 0, function* () {
            // ensure the port is a string
            serverPort = "" + serverPort;
            return new Promise((res, rej) => __awaiter(this, void 0, void 0, function* () {
                // send the password
                let response = yield this.request("HF-A11ASSISTHREAD", ip);
                if (!response)
                    return rej("no response");
                // confirm receipt of the info 
                this.send("+ok", ip);
                // wait a bit
                yield lib_1.wait(100);
                // set the new parameters
                response = yield this.request(`AT+NETP=TCP,Client,${serverPort},${serverAddress}\r`, ip);
                if (!response || !response.startsWith("+ok"))
                    return rej("setting new params failed");
                // confirm the new parameters
                response = yield this.request("AT+NETP\r", ip);
                if (!response || !response.startsWith("+ok"))
                    return rej("setting new params failed");
                const newParams = response.trim().split(",");
                if (!(newParams.length === 4 &&
                    newParams[2] === serverPort &&
                    newParams[3] === serverAddress))
                    return rej("new params were not accepted");
                // success
                res();
            }));
        });
    }
    /**
     * Restores the plug at the given IP to its original configuration
     */
    restorePlug(ip) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.configurePlug(ip, "plug.g-homa.com", 4196);
        });
    }
}
exports.Manager = Manager;
//# sourceMappingURL=manager.js.map