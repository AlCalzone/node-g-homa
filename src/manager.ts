import * as dgram from "dgram";
import { EventEmitter } from "events";
import { wait, range, getBroadcastAddresses } from "./lib";

export interface PlugInfo {
	ip: string,
	mac: string
}

interface DiscoverResponse extends PlugInfo {
	type: string
}
namespace DiscoverResponse {
	export function parse(response: string): DiscoverResponse {
		try {
			const parts = response.split(",");
			return {
				ip: parts[0],
				mac: parts[1],
				type: parts[2]
			};
		} catch (e) {
			return null;
		}
	}
}

export class Manager extends EventEmitter {

	constructor() {
		super();

		this.broadcastAddress = getBroadcastAddresses()[0];

		this.udp = dgram
			.createSocket("udp4")
			.once("listening", this.udp_onListening.bind(this))
			.on("error", (e) => { throw e })
			;
		this.udp.bind(); // doesn't matter which address
	}

	public close() {
		this.udp.close();
		this.emit("closed");
	}

	private udp: dgram.Socket;
	private broadcastAddress: string;


	private udp_onListening() {
		this.emit("ready");
	}

	private send(msg: string, ip: string = this.broadcastAddress) {
		const buf = Buffer.from(msg, "ascii");
		this.udp.send(buf, 0, buf.length, 48899, ip);
	}

	/**
	 * Finds all active G-Homa plugs on the network
	 * @param duration - The time to wait for all responses
	 */
	public async findAllPlugs(duration: number = 1000): Promise<PlugInfo[]> {
		return new Promise<PlugInfo[]>(async (res, rej) => {
			const responses: DiscoverResponse[] = [];
			const handleDiscoverResponse = (msg: Buffer, rinfo: dgram.RemoteInfo) => {
				if (msg.length && rinfo.port === 48899) {
					const response = DiscoverResponse.parse(msg.toString("ascii"))
					if (response) responses.push(response);
				}
			}
			this.udp.on("message", handleDiscoverResponse)
			this.send("HF-A11ASSISTHREAD");

			// Give the plugs time to respond
			await wait(duration);

			this.udp.removeListener("message", handleDiscoverResponse);
			// return the scan result
			res(responses);
		});
    }

	/**
	 * Sends a request to a socket and waits for a response
	 */
    private async request(msg: string, ip: string, timeout: number = 1000): Promise<string> {
        return new Promise<string>(async (res, rej) => {
            let response: string;
            const handleResponse = (msg: Buffer, rinfo: dgram.RemoteInfo) => {
                if (msg.length && rinfo.port === 48899) {
                    response = msg.toString("ascii");
                }
            }

			// setup the handler and send the message
            this.udp.once("message", handleResponse);
            this.send(msg, ip);

			// wait for a receipt (we are only expecting single messages)
            const start = Date.now();
            while (Date.now() - start < timeout) {
                await wait(10);
                if (response != null) break;
            }

			// remove handler
            this.udp.removeListener("message", handleResponse);
			// and fulfill the promise
            res(response);
        })
    }

	/**
	 * Configures the plug at the given IP to talk to a new server
	 * @param ip
	 * @param serverAddress
	 * @param serverPort
	 */
    public async configurePlug(ip: string, serverAddress: string, serverPort: string | number): Promise<void> {
		// ensure the port is a string
        serverPort = "" + serverPort;

		return new Promise<void>(async (res, rej) => {
			// send the password
            let response = await this.request("HF-A11ASSISTHREAD", ip);
            if (!response) return rej("no response");
			// confirm receipt of the info 
            this.send("+ok", ip);
			// wait a bit
            await wait(100);

			// set the new parameters
            response = await this.request(`AT+NETP=TCP,Client,${serverPort},${serverAddress}\r`, ip);
            if (!response || !response.startsWith("+ok")) return rej("setting new params failed");

			// confirm the new parameters
            response = await this.request("AT+NETP\r", ip);
            if (!response || !response.startsWith("+ok")) return rej("setting new params failed");
            const newParams = response.trim().split(",");
            if (!(
                newParams.length === 4 &&
                newParams[2] === serverPort &&
                newParams[3] === serverAddress
            )) return rej("new params were not accepted");

			// success
            res();
		});
    }

	/**
	 * Restores the plug at the given IP to its original configuration
	 */
    public async restorePlug(ip: string): Promise<void> {
        await this.configurePlug(ip, "plug.g-homa.com", 4196);
    }

}