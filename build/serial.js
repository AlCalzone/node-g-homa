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
const lib_1 = require("./lib");
const readline = require("readline");
const udp = dgram
    .createSocket({
    type: "udp4",
})
    .once("listening", udp_onListening)
    .on("message", udp_onMessage)
    .on("error", (e) => { throw e; });
udp.bind();
function udp_onListening() {
    main();
}
let lastResponse;
function udp_onMessage(msg, rinfo) {
    if (rinfo.port === 48899) {
        lastResponse = Date.now();
        console.log(`${rinfo.address}: ${msg.toString("ascii")}`);
    }
}
function send(msg, ip) {
    const data = Buffer.from(msg, "ascii");
    udp.send(data, 0, data.length, 48899, ip);
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        let running = true;
        const rl = readline
            .createInterface(process.stdin, process.stdout)
            .on("close", () => { running = false; udp.close(); process.exit(0); });
        const ask = lib_1.promisifyNoError(rl.question, rl);
        while (running) {
            console.log("G-Homa command line serial interface ready...");
            console.log("");
            let ip = yield ask("Which IP to talk to? [default: Broadcast IP] ");
            if (!ip || !ip.length)
                ip = lib_1.getBroadcastAddresses()[0];
            console.log(`talking to ${ip}. enter "QUIT" to return to IP selection`);
            while (running) {
                let command = yield ask(`${ip} > `);
                if (command === "QUIT")
                    break;
                command = command.replace("\\r", "\r");
                lastResponse = Date.now();
                send(command, ip);
                while (Date.now() - lastResponse < 1000) {
                    yield lib_1.wait(100);
                }
            }
        }
    });
}
//# sourceMappingURL=serial.js.map