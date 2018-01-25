"use strict";
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
var dgram = require("dgram");
var readline = require("readline");
var lib_1 = require("./lib");
var udp = dgram
    .createSocket("udp4")
    .once("listening", udp_onListening)
    .on("message", udp_onMessage)
    .on("error", function (e) { throw e; });
udp.bind(0); // listen on a random free port
function udp_onListening() {
    main();
}
var lastResponse;
function udp_onMessage(msg, rinfo) {
    if (rinfo.port === 48899) {
        lastResponse = Date.now();
        console.log(rinfo.address + ": " + msg.toString("ascii"));
    }
}
function send(msg, ip) {
    var data = Buffer.from(msg, "ascii");
    udp.send(data, 0, data.length, 48899, ip);
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var running, rl, ask, ip, addresses, ownAddresses, index, i, answer, _a, command;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    running = true;
                    rl = readline
                        .createInterface(process.stdin, process.stdout)
                        .on("close", function () { running = false; udp.close(); process.exit(0); });
                    ask = lib_1.promisifyNoError(rl.question, rl);
                    _b.label = 1;
                case 1:
                    if (!running) return [3 /*break*/, 12];
                    console.log("G-Homa command line serial interface ready...");
                    console.log("");
                    return [4 /*yield*/, ask("Which IP to talk to? [default: Broadcast IP] ")];
                case 2:
                    ip = _b.sent();
                    if (!(!ip || !ip.length)) return [3 /*break*/, 5];
                    addresses = lib_1.getBroadcastAddresses();
                    ownAddresses = lib_1.getOwnIpAddresses();
                    index = 0;
                    if (!(addresses.length > 1)) return [3 /*break*/, 4];
                    console.log("Multiple network interfaces found. You have to select one:");
                    for (i = 0; i < ownAddresses.length; i++) {
                        console.log("  " + i + " => Your IP: " + ownAddresses[i]);
                    }
                    _a = parseInt;
                    return [4 /*yield*/, ask("Which network interface to use? [default: 0]")];
                case 3:
                    answer = _a.apply(void 0, [_b.sent(), 10]);
                    if (!Number.isNaN(answer) && answer >= 0 && answer < addresses.length) {
                        index = answer;
                    }
                    _b.label = 4;
                case 4:
                    ip = lib_1.getBroadcastAddresses()[index];
                    _b.label = 5;
                case 5:
                    console.log("talking to " + ip + ". enter \"QUIT\" to return to IP selection");
                    _b.label = 6;
                case 6:
                    if (!running) return [3 /*break*/, 11];
                    return [4 /*yield*/, ask(ip + " > ")];
                case 7:
                    command = _b.sent();
                    if (command === "QUIT")
                        return [3 /*break*/, 11];
                    command = command.replace("\\r", "\r");
                    lastResponse = Date.now();
                    send(command, ip);
                    _b.label = 8;
                case 8:
                    if (!(Date.now() - lastResponse < 1000)) return [3 /*break*/, 10];
                    return [4 /*yield*/, lib_1.wait(100)];
                case 9:
                    _b.sent();
                    return [3 /*break*/, 8];
                case 10: return [3 /*break*/, 6];
                case 11: return [3 /*break*/, 1];
                case 12: return [2 /*return*/];
            }
        });
    });
}
