import * as dgram from "dgram";
import { discoverDevices } from "./management";


function udp_onListening() {
	discoverDevices(udp);
}

function udp_onMessage(data, rinfo) {

}