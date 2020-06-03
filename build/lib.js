"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readUInt24 = exports.promisifyNoError = exports.range = exports.wait = exports.getOwnIpAddresses = exports.getBroadcastAddresses = void 0;
var os = require("os");
/**
 * Returns the broadcast addresses for all connected interfaces
 */
function getBroadcastAddresses() {
    // enumerate interfaces
    var net = os.networkInterfaces();
    var broadcastAddresses = Object.keys(net)
        // flatten the array structure
        .map(function (k) { return net[k]; })
        .reduce(function (prev, cur) { return prev.concat.apply(prev, cur); }, [])
        // only use external IPv4 ones
        .filter(function (add) { return !add.internal && add.family === "IPv4"; })
        // extract address and subnet as number array
        .map(function (k) { return ({
        address: k.address.split(".").map(function (num) { return +num; }),
        netmask: k.netmask.split(".").map(function (num) { return +num; }),
    }); })
        // broadcast is address OR (not netmask)
        .map(function (add) {
        return add.address.map(function (val, i) { return (val | ~add.netmask[i]) & 0xff; });
    })
        // ignore unconnected ones
        .filter(function (add) { return add[0] !== 169; })
        // turn the address into a string again
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
        // flatten the array structure
        .map(function (k) { return net[k]; })
        .reduce(function (prev, cur) { return prev.concat.apply(prev, cur); }, [])
        // only use external IPv4 ones
        .filter(function (add) { return !add.internal && add.family === "IPv4"; })
        // extract address as number array
        .map(function (k) { return k.address.split(".").map(function (num) { return +num; }); })
        // ignore unconnected ones
        .filter(function (add) { return add[0] !== 169; })
        // turn the address into a string again
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
function promisifyNoError(fn, context) {
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        context = context || this;
        return new Promise(function (resolve, reject) {
            fn.apply(context, __spreadArrays(args, [function (result) {
                    return resolve(result);
                }]));
        });
    };
}
exports.promisifyNoError = promisifyNoError;
function readUInt24(buf, offset) {
    if (offset === void 0) { offset = 0; }
    var ret = 0;
    for (var i = 0; i < 3; i++) {
        ret <<= 8;
        ret += buf[i + offset];
    }
    return ret;
}
exports.readUInt24 = readUInt24;
