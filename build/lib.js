"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var os = require("os");
/**
 * Returns the broadcast addresses for all connected interfaces
 */
function getBroadcastAddresses() {
    // enumerate interfaces
    var net = os.networkInterfaces();
    var broadcastAddresses = Object.keys(net)
        .map(function (k) { return net[k]; })
        .reduce(function (prev, cur) { return prev.concat.apply(prev, cur); }, [])
        .filter(function (add) { return !add.internal && add.family === "IPv4"; })
        .map(function (k) { return ({
        address: k.address.split(".").map(function (num) { return +num; }),
        netmask: k.netmask.split(".").map(function (num) { return +num; })
    }); })
        .map(function (add) {
        return add.address.map(function (val, i) { return (val | ~add.netmask[i]) & 0xff; });
    })
        .filter(function (add) { return add[0] != 169; })
        .map(function (a) { return a[0] + "." + a[1] + "." + a[2] + "." + a[3]; });
    return broadcastAddresses;
}
exports.getBroadcastAddresses = getBroadcastAddresses;
/**
 * Returns the broadcast addresses for all connected interfaces
 */
function getOwnIpAddresses() {
    // enumerate interfaces
    var net = os.networkInterfaces();
    var addresses = Object.keys(net)
        .map(function (k) { return net[k]; })
        .reduce(function (prev, cur) { return prev.concat.apply(prev, cur); }, [])
        .filter(function (add) { return !add.internal && add.family === "IPv4"; })
        .map(function (k) { return k.address.split(".").map(function (num) { return +num; }); })
        .filter(function (add) { return add[0] != 169; })
        .map(function (a) { return a[0] + "." + a[1] + "." + a[2] + "." + a[3]; });
    return addresses;
}
exports.getOwnIpAddresses = getOwnIpAddresses;
function wait(milliseconds) {
    return new Promise(function (res, rej) {
        setTimeout(res, milliseconds);
    });
}
exports.wait = wait;
function range(start, end) {
    var ret = new Array(end - start + 1);
    for (var i = 0; i < ret.length; i++) {
        ret[i] = start + i;
    }
    return ret;
}
exports.range = range;
//# sourceMappingURL=lib.js.map