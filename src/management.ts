import * as dgram from "dgram";
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
 * Starts inclusion of G-Homa plugs with the given Wifi psk.
 * This only works if the current device is connected via WiFi or
 * if UDP broadcast packets are forwarded over WiFi
 * @param psk - The wifi password
 */
export function beginInclusion(psk: string): void {
	inclusionActive = true;
	const broadcast = getBroadcastAddresses()[0];

	const udp = dgram
		.createSocket("udp4")
		.once("listening", udp_onListening)
		.on("message", udp_onMessage)
		;

	udp.bind(49999);

	function udp_onListening() {
		_doInclusion();
	}
	function udp_onMessage(data: Buffer, rinfo: dgram.RemoteInfo) {
		// TODO: react to smart_config messages (and send them!)
	}

	async function _doInclusion(): Promise<void> {

		const endTime = Date.now() + 60000; // default: only 60s inclusion
		while (inclusionActive && (Date.now() <= endTime)) {
			// send preamble
			for (let i of range(1, preambleNumPackets)) {
				await sendCodeWithTimeout(preambleCode, preambleTimeout);
			}
			for (let iPSK = 1; iPSK <= 1; iPSK++) {
				await sendPSK(Buffer.from(psk, "ascii"));
			}
		}
		return;

	}

	async function sendPSK(psk: Buffer) {
		for (let i of range(1, pskNumSemiDigitsBefore)) {
			await sendCodeWithTimeout(
				pskCodeSemiDigitBefore,
				(i < pskNumSemiDigitsBefore) ? pskSemiDigitTimeout : pskDigitTimeout
			);
		}

		for (let i = 0; i < psk.length; i++) {
			await sendCodeWithTimeout(psk[i], pskDigitTimeout);
		}

		for (let i of range(1, pskNumSemiDigitsAfter)) {
			await sendCodeWithTimeout(
				pskCodeSemiDigitAfter,
				(i < pskNumSemiDigitsAfter) ? pskSemiDigitTimeout : pskDigitTimeout
			);
		}

		const lenCode = psk.length + 256;
		await wait(pskDigitTimeout);
		for (let i of range(1, pskNumChecksumPackets)) {
			await sendCodeWithTimeout(lenCode,
				(i < pskNumChecksumPackets) ? pskSemiDigitTimeout : pskBlockTimeout
			);
		}

	}

	async function sendCodeWithTimeout(code: number, timeout: number): Promise<void> {
		const buf = Buffer.alloc(76 + code, 5);
		udp.setBroadcast(true);
		udp.send(buf, 49999, broadcast);
		await wait(timeout);
		return null;
	}
}

let inclusionActive: boolean = false;

/**
 * Cancels the inclusion process
 */
export function cancelInclusion() {
	inclusionActive = false;
}

export async function discoverDevices(socket: dgram.Socket): Promise<void> {
	socket.setBroadcast(true);
	const broadcast = getBroadcastAddresses()[0];
	socket.on("message", (data, rinfo) => {
		console.log(data.toString("utf8"));
	});
	socket.send("smartlinkfind", 48899, broadcast);
}