"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var management_1 = require("./management");
function udp_onListening() {
    management_1.discoverDevices(udp);
}
function udp_onMessage(data, rinfo) {
}
//# sourceMappingURL=index.js.map