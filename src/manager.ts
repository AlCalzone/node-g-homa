import * as dgram from "dgram";
import { EventEmitter } from "events";
import { getBroadcastAddresses, range, wait } from "./lib";

export interface PlugInfo {
	ip: string;
	mac: string;
}

interface DiscoverResponse extends PlugInfo {
	type: string;
}
// tslint:disable-next-line:no-namespace
namespace DiscoverResponse {
	export function parse(response: string): DiscoverResponse {
		try {
			const parts = response.split(",");
			return {
				ip: parts[0],
				mac: parts[1],
				type: parts[2],
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
		console.log("broadcast address = " + this.broadcastAddress);

		this.udp = dgram
			.createSocket("udp4")
			.once("listening", this.udp_onListening.bind(this))
			.on("error", (e) => {
				console.log("error: " + e);
				throw e;
			})
			;
		this.udp.bind(0); // listen on a random free port
	}

	public close() {
		this.udp.close();
		this.emit("closed");
		console.log("socket closed");
	}

	private udp: dgram.Socket;
	private broadcastAddress: string;

	private udp_onListening() {
		console.log("manager socket ready");
		this.emit("ready");
	}

	private send(msg: string, ip: string = this.broadcastAddress) {
		console.log(`sending message "${msg}" to ${ip}`);
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
					console.log("received response: " + msg.toString("ascii"));
					const response = DiscoverResponse.parse(msg.toString("ascii"));
					if (response) responses.push(response);
				}
			};
			this.udp.on("message", handleDiscoverResponse);
			this.udp.setBroadcast(true);
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
			const handleResponse = (resp: Buffer, rinfo: dgram.RemoteInfo) => {
				if (resp.length && rinfo.port === 48899) {
					response = resp.toString("ascii");
					console.log("received response: " + response);
				}
			};

			// setup the handler and send the message
			this.udp.once("message", handleResponse);
			console.log("sending message: " + msg);
			this.udp.setBroadcast(false);
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
		});
	}

	/**
	 * Configures the plug at the given IP to talk to a new server
	 * @param ip
	 * @param serverAddress
	 * @param serverPort
	 */
	public async configurePlug(ip: string, serverAddress: string, serverPort: string | number): Promise<boolean> {
		// ensure the port is a string
		serverPort = "" + serverPort;

		return new Promise<boolean>(async (res, rej) => {
			// send the password
			this.udp.setBroadcast(false);
			let response = await this.request("HF-A11ASSISTHREAD", ip);
			if (!response) return res(false); // rej("no response");
			// confirm receipt of the info
			this.send("+ok", ip);
			// wait a bit
			await wait(100);

			// set the new parameters
			response = await this.request(`AT+NETP=TCP,Client,${serverPort},${serverAddress}\r`, ip);
			if (!response || !response.startsWith("+ok")) return res(false); // rej("setting new params failed");

			// confirm the new parameters
			response = await this.request("AT+NETP\r", ip);
			if (!response || !response.startsWith("+ok")) return res(false); // rej("setting new params failed");
   const newParams = response.trim().split(",");
			if (!(
				newParams.length === 4 &&
				newParams[2] === serverPort &&
				newParams[3] === serverAddress
			)) return res(false); // rej("new params were not accepted");

			// success
   res(true);
		});
	}

	/**
	 * Restores the plug at the given IP to its original configuration
	 */
	public async restorePlug(ip: string): Promise<boolean> {
		return await this.configurePlug(ip, "plug.g-homa.com", 4196);
	}

}
