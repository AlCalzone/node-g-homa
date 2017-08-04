import * as dgram from "dgram";
import { getBroadcastAddresses } from "./lib";
import { Manager } from "./management";

const mgmt = (new Manager())
	.once("ready", () => mgmt.beginInclusion("87654321"))
	.on("inclusion finished", (foundDevices) => {
		console.log(`inclusion finished. found ${foundDevices.length} plugs`);
		console.dir(foundDevices);
	})
	;