"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const management_1 = require("./management");
const mgmt = (new management_1.Manager())
    .once("ready", () => mgmt.beginInclusion("87654321"))
    .on("inclusion finished", (foundDevices) => {
    console.log(`inclusion finished. found ${foundDevices.length} plugs`);
    console.dir(foundDevices);
});
//# sourceMappingURL=index.js.map