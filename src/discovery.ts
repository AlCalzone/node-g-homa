import * as dgram from "dgram";
import { EventEmitter } from "events";
import { wait, range, getBroadcastAddresses } from "./lib";

const preambleCode = 0;
const preambleTimeout = 10;
const preambleNumPackets = 200;
const pskCodeSemiDigitBefore = 13;
const pskNumSemiDigitsBefore = 3;
const pskCodeSemiDigitAfter = 10;
const pskNumSemiDigitsAfter = 3;
const pskSemiDigitTimeout = 50;
const pskDigitTimeout = 100;
const pskNumChecksumPackets = 3;
const pskBlockTimeout = 500;

/**
 * Provides functions for inclusion and discover of G-Homa WiFi plugs
 * Only works if the discovering device transmits via WiFi or if
 * the router is configured to forward UDP broadcasts over WiFi
 */
export class Discovery extends EventEmitter {

	constructor() {
		super();

		this.broadcastAddress = getBroadcastAddresses()[0];

		this.udp = dgram
			.createSocket("udp4")
			.once("listening", this.udp_onListening.bind(this))
			.on("error", (e) => { throw e })
			;
		this.udp.bind(49999);
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

	private _inclusionActive: boolean = false;
	public get inclusionActive() { return this._inclusionActive; }

	/**
	 * Starts inclusion of G-Homa plugs with the given Wifi psk.
	 * @param psk - The wifi password
	 * @param stopOnDiscover - Stop the inclusion when a device was found
	 */
	public beginInclusion(psk: string, stopOnDiscover: boolean = true): void {
		this._inclusionActive = true;
		setTimeout(() => this._doInclusion(psk), 0);
	}


	private async _doInclusion(psk: string, stopOnDiscover: boolean = true): Promise<void> {

		this.emit("inclusion started");

		// try to find new plugs, this only works while including
		const foundDevices: { [ip: string]: string } = {}; // remember ips and mac addresses of found plugs
		const smartlinkHandler = (msg: Buffer, rinfo: dgram.RemoteInfo) => {
			if (rinfo.port === 48899 && msg.length > 0) {
				// ignore duplicates
				if (foundDevices.hasOwnProperty(rinfo.address)) return;
				// extract mac address
				const data = msg.toString("utf8");
				if (data.startsWith("smart_config ")) {
					const mac = data.substring(data.indexOf(" ") + 1);
					foundDevices[rinfo.address] = mac;
					if (stopOnDiscover) this.cancelInclusion();
				}
			}
		};
		this.udp.on("message", smartlinkHandler);
		const smartlinkfindTimer = setInterval(() => {
			const msg = Buffer.from("smartlinkfind", "ascii");
			this.udp.send(msg, 0, msg.length, 48899, this.broadcastAddress)
		}, 1000);

		// start inclusion process
		const endTime = Date.now() + 60000; // default: only 60s inclusion
		while (this._inclusionActive && (Date.now() <= endTime)) {
			// send preamble
			for (let i of range(1, preambleNumPackets)) {
				await this.sendCodeWithTimeout(preambleCode, preambleTimeout);
			}
			for (let iPSK = 1; iPSK <= 1; iPSK++) {
				await this.sendPSK(Buffer.from(psk, "ascii"));
			}
		}

		// the timer is over or the inclusion process has been handled
		clearInterval(smartlinkfindTimer);
		this.udp.removeListener("message", smartlinkHandler);

		this.emit("inclusion finished", foundDevices);
		return;

	}

	private async sendPSK(psk: Buffer) {
		for (let i of range(1, pskNumSemiDigitsBefore)) {
			await this.sendCodeWithTimeout(
				pskCodeSemiDigitBefore,
				(i < pskNumSemiDigitsBefore) ? pskSemiDigitTimeout : pskDigitTimeout
			);
		}

		for (let i = 0; i < psk.length; i++) {
			await this.sendCodeWithTimeout(psk[i], pskDigitTimeout);
		}

		for (let i of range(1, pskNumSemiDigitsAfter)) {
			await this.sendCodeWithTimeout(
				pskCodeSemiDigitAfter,
				(i < pskNumSemiDigitsAfter) ? pskSemiDigitTimeout : pskDigitTimeout
			);
		}

		const lenCode = psk.length + 256;
		await wait(pskDigitTimeout);
		for (let i of range(1, pskNumChecksumPackets)) {
			await this.sendCodeWithTimeout(lenCode,
				(i < pskNumChecksumPackets) ? pskSemiDigitTimeout : pskBlockTimeout
			);
		}

	}

	private async sendCodeWithTimeout(code: number, timeout: number): Promise<void> {
		const buf = Buffer.alloc(76 + code, 5);
		this.udp.setBroadcast(true);
		this.udp.send(buf, 0, buf.length, 49999, this.broadcastAddress);
		await wait(timeout);
		return null;
	}

	/**
	 * Cancels the inclusion process
	 */
	public cancelInclusion() {
		this._inclusionActive = false;
	}


}