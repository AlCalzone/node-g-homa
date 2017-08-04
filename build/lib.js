"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
/**
 * Returns the broadcast addresses for all connected interfaces
 */
function getBroadcastAddresses() {
    // enumerate interfaces
    const net = os.networkInterfaces();
    const broadcastAddresses = Object.keys(net)
        .map(k => net[k])
        .reduce((prev, cur) => prev.concat(...cur), [])
        .filter(add => !add.internal && add.family === "IPv4")
        .map(k => ({
        address: k.address.split(".").map(num => +num),
        netmask: k.netmask.split(".").map(num => +num)
    }))
        .map(add => {
        return add.address.map((val, i) => (val | ~add.netmask[i]) & 0xff);
    })
        .filter(add => add[0] != 169)
        .map(a => `${a[0]}.${a[1]}.${a[2]}.${a[3]}`);
    return broadcastAddresses;
}
exports.getBroadcastAddresses = getBroadcastAddresses;
/**
 * Returns the broadcast addresses for all connected interfaces
 */
function getOwnIpAddresses() {
    // enumerate interfaces
    const net = os.networkInterfaces();
    const addresses = Object.keys(net)
        .map(k => net[k])
        .reduce((prev, cur) => prev.concat(...cur), [])
        .filter(add => !add.internal && add.family === "IPv4")
        .map(k => k.address.split(".").map(num => +num))
        .filter(add => add[0] != 169)
        .map(a => `${a[0]}.${a[1]}.${a[2]}.${a[3]}`);
    return addresses;
}
exports.getOwnIpAddresses = getOwnIpAddresses;
function wait(milliseconds) {
    return new Promise((res, rej) => {
        setTimeout(res, milliseconds);
    });
}
exports.wait = wait;
function range(start, end) {
    const ret = new Array(end - start + 1);
    for (let i = 0; i < ret.length; i++) {
        ret[i] = start + i;
    }
    return ret;
}
exports.range = range;
function promisifyNoError(fn, context) {
    return function (...args) {
        context = context || this;
        return new Promise(function (resolve, reject) {
            fn.apply(context, [...args, function (result) {
                    return resolve(result);
                }]);
        });
    };
}
exports.promisifyNoError = promisifyNoError;
//# sourceMappingURL=lib.js.map