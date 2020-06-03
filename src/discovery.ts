import * as debugPackage from "debug";
import * as dgram from "dgram";
import { EventEmitter } from "events";
import { getBroadcastAddresses, GHomaOptions, wait } from "./lib";

const debug = debugPackage("g-homa:discovery");

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

const DISCOVERY_PORT = 49999;

/**
 * Provides functions for inclusion and discover of G-Homa WiFi plugs
 * Only works if the discovering device transmits via WiFi or if
 * the router is configured to forward UDP broadcasts over WiFi
 */
export class Discovery extends EventEmitter {

	constructor(options: GHomaOptions = {}) {
		super();

		debug("starting discovery with options:");
		debug(JSON.stringify(options, null, 4));

		if (options.networkInterfaceIndex == null) options.networkInterfaceIndex = 0;
		const broadcastAddresses = getBroadcastAddresses();
		if (options.networkInterfaceIndex < 0 || options.networkInterfaceIndex > broadcastAddresses.length - 1) {
			debug(`network interface index out of bounds`);
			throw new Error(`network interface index out of bounds`);
		}
		this.broadcastAddress = broadcastAddresses[options.networkInterfaceIndex];

		debug(`broadcast addresses: ${broadcastAddresses}`);
		debug(`=> using ${this.broadcastAddress}`);

		this.udp = dgram
			.createSocket("udp4")
			.once("listening", this.udp_onListening.bind(this))
			.on("error", (e) => {
				debug(`socket error: ${e}`);
				throw e;
			})
			;
		this.udp.bind(DISCOVERY_PORT);
	}
	public close() {
		this.udp.close();
		this.emit("closed");
	}

	private udp: dgram.Socket;
	private broadcastAddress: string;

	private udp_onListening() {
		debug(`now listening on port ${DISCOVERY_PORT}`);
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
		debug("inclusion started");

		// try to find new plugs, this only works while including
		const foundDevices: { [ip: string]: string } = {}; // remember ips and mac addresses of found plugs
		const smartlinkHandler = (msg: Buffer, rinfo: dgram.RemoteInfo) => {
			if (rinfo.port === 48899 && msg.length > 0) {
				debug(`got response from device with address: ${rinfo.address}`);
				// ignore duplicates
				if (foundDevices.hasOwnProperty(rinfo.address)) return;
				// extract mac address
				const data = msg.toString("utf8");
				if (data.startsWith("smart_config ")) {
					const mac = data.substring(data.indexOf(" ") + 1);
					foundDevices[rinfo.address] = mac;
					debug(`remembering device: MAC=${mac}, IP=${rinfo.address}`);
					if (stopOnDiscover) this.cancelInclusion();
				}
			}
		};
		this.udp.on("message", smartlinkHandler);
		const smartlinkfindTimer = setInterval(() => {
			const msg = Buffer.from("smartlinkfind", "ascii");
			this.udp.send(msg, 0, msg.length, 48899, this.broadcastAddress);
		}, 1000);

		// start inclusion process
		const endTime = Date.now() + 60000; // default: only 60s inclusion
		while (this._inclusionActive && (Date.now() <= endTime)) {
			// send preamble
			for (let i = 1; i <= preambleNumPackets; i++) {
				await this.sendCodeWithTimeout(preambleCode, preambleTimeout);
			}
			for (let iPSK = 1; iPSK <= 1; iPSK++) {
				await this.sendPSK(Buffer.from(psk, "ascii"));
			}
		}

		// the timer is over or the inclusion process has been handled
		clearInterval(smartlinkfindTimer);
		this.udp.removeListener("message", smartlinkHandler);

		debug(`inclusion finished. Found ${Object.keys(foundDevices).length} devices.`);
		this.emit("inclusion finished", foundDevices);
		return;

	}

	private async sendPSK(psk: Buffer) {
		for (let i = 1; i <= pskNumSemiDigitsBefore; i++) {
			await this.sendCodeWithTimeout(
				pskCodeSemiDigitBefore,
				(i < pskNumSemiDigitsBefore) ? pskSemiDigitTimeout : pskDigitTimeout,
			);
		}

		// tslint:disable-next-line:prefer-for-of
		for (let i = 0; i < psk.length; i++) {
			await this.sendCodeWithTimeout(psk[i], pskDigitTimeout);
		}

		for (let i = 1; i <=pskNumSemiDigitsAfter; i++) {
			await this.sendCodeWithTimeout(
				pskCodeSemiDigitAfter,
				(i < pskNumSemiDigitsAfter) ? pskSemiDigitTimeout : pskDigitTimeout,
			);
		}

		const lenCode = psk.length + 256;
		await wait(pskDigitTimeout);
		for (let i = 1; i <= pskNumChecksumPackets; i++) {
			await this.sendCodeWithTimeout(lenCode,
				(i < pskNumChecksumPackets) ? pskSemiDigitTimeout : pskBlockTimeout,
			);
		}

	}

	private async sendCodeWithTimeout(code: number, timeout: number): Promise<void> {
		const buf = new Buffer(76 + code).fill(5);
		this.udp.setBroadcast(true);
		this.udp.send(buf, 0, buf.length, 49999, this.broadcastAddress);
		await wait(timeout);
	}

	/**
	 * Cancels the inclusion process
	 */
	public cancelInclusion() {
		debug(`stopping inclusion...`);
		this._inclusionActive = false;
	}

}
