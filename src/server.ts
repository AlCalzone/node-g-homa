// tslint:disable:variable-name
import * as crypto from "crypto";
import { EventEmitter } from "events";
import * as net from "net";
import { range, readUInt24 } from "./lib";

// setup debug logging
import * as debugPackage from "debug";
const debug = debugPackage("g-homa");

const PREFIX = Buffer.from([0x5A, 0xA5]);
const POSTFIX = Buffer.from([0x5B, 0xB5]);

export enum Commands {
	init1 = 0x02,
	init1_response = 0x03,
	init2 = 0x05,
	init2_response = 0x07,
	heartbeat = 0x04,
	heartbeat_response = 0x06,
	switch = 0x10,
	state_update = 0x90,
}
export enum SwitchSource {
	unknown = 0x00,
	local = 0x81,
	remote = 0x11,
}
// export type SwitchSource = "unknown" | "remote" | "local";

export interface Message {
	command: Commands;
	payload: Buffer;
}
function serializeMessage(msg: Message): Buffer {
	const data = Buffer.concat([Buffer.from([msg.command]), msg.payload]);

	const lengthBytes = [(data.length >>> 8) & 0xff, data.length & 0xff];
	const checksum = computeChecksum(data);

	return Buffer.concat([
		PREFIX,
		Buffer.from(lengthBytes),
		data,
		Buffer.from([checksum]),
		POSTFIX,
	]);
}
function computeChecksum(data: Buffer): number {
	return 0xff - data.reduce((sum, cur) => (sum + cur) & 0xff, 0);
}

export function parseMessage(buf: Buffer): { msg: Message, bytesRead: number } | null {
	// the buffer has to be at least 2 (prefix) + 2 (length) + 1 (command) + 1 (checksum) + 2 (postfix) bytes long
	if (buf.length < 8) return null;

	if (!buf.slice(0, 2).equals(PREFIX)) {
		debug("invalid data in the receive buffer");
		debug(buf.toString("hex"));
		throw new Error("invalid data in the receive buffer");
	}

	// get length of the payload
	let payloadLength = buf.readUInt16BE(2);
	// check we have enough data
	if (buf.length < 6 + payloadLength) return null;
	// extract the payload
	let data = buf.slice(4, 4 + payloadLength);
	const command = data[0];
	let payload = Buffer.from(data.slice(1));
	// actually the buffer should be at least payloadLength + 7 bytes
	// but the firmware has a bug resulting in the 2nd response to INIT2 being 1 byte short
	if (command !== Commands.init2_response && buf.length < 7 + payloadLength) return null;
	// make sure the message ends with the postfix
	const getFinalBytes = () => buf.slice(4 + payloadLength + 1, 4 + payloadLength + 3);
	const fail = () => {
		debug("invalid data in the receive buffer");
		debug(buf.toString("hex"));
		throw new Error("invalid data in the receive buffer");
	};
	if (!getFinalBytes().equals(POSTFIX)) {
		// if this is a (potentially bugged) init2_response, try again with a shorter buffer
		if (command === Commands.init2_response) {
			payloadLength--;
			if (!getFinalBytes().equals(POSTFIX)) {
				fail();
			} else {
				// that worked, now we need to shorten the data by 1 byte
				data = buf.slice(4, 4 + payloadLength);
				payload = Buffer.from(data.slice(1));
			}
		} else {
			fail();
		}
	}
	// extract the checksum and check it
	const checksum = buf[4 + payloadLength];
	if (checksum !== computeChecksum(data)) {
		debug("invalid checksum");
		debug(buf.toString("hex"));
		throw new Error("invalid checksum");
	}

	return {
		msg: {
			command: command,
			payload: payload,
		},
		bytesRead: 4 + payloadLength + 3,
	};

}

function formatMac(mac: Buffer): string {
	return range(0, mac.length - 1)
		.map(i => mac[i].toString(16).toUpperCase())
		.join(":")
		;
}

export interface ServerAddress {
	port: number;
	family: string;
	address: string;
}
export enum PlugType {
	// Bytes 3-4 of a plug response determine what it supports
	normal = 0x3223,
	withEnergyMeasurement = 0x3523,
}
export enum EnergyMeasurementTypes {
	power = 1,
	energy = 2,
	voltage = 3,
	current = 4,
	frequency = 5,
	maxPower = 7,
	powerFactor = 8,
}
export type EnergyMeasurementNames = keyof typeof EnergyMeasurementTypes;
export type EnergyMeasurement = {[type in EnergyMeasurementNames]?: number};
export interface Plug {
	id: string;
	ip: string;
	type: keyof typeof PlugType;
	port: number;
	lastSeen: number;
	online: boolean;
	lastSwitchSource: keyof typeof SwitchSource;
	state: boolean;
	shortmac: string;
	mac: string;
	firmware: string;
	energyMeasurement: EnergyMeasurement;
}
interface PlugInternal {
	id: string;
	ip: string;
	type: keyof typeof PlugType;
	port: number;
	lastSeen: number;
	online: boolean;
	shortmac: Buffer;
	mac: Buffer;
	firmware: string;
	state: boolean;
	lastSwitchSource: keyof typeof SwitchSource;
	socket: net.Socket;
	triggercode: Buffer;
	energyMeasurement: EnergyMeasurement;
}
// tslint:disable-next-line:no-namespace
namespace Plug {
	export function from(internal: PlugInternal): Plug {
		return {
			id: internal.id!,
			ip: internal.ip,
			type: internal.type,
			port: internal.port,
			lastSeen: internal.lastSeen,
			online: internal.online,
			shortmac: formatMac(internal.shortmac!),
			mac: formatMac(internal.mac!),
			state: internal.state,
			lastSwitchSource: internal.lastSwitchSource,
			firmware: internal.firmware,
			energyMeasurement: internal.energyMeasurement,
		};
	}
}

// constant predefined messages
const msgInit1b: Message = {
	command: Commands.init1,
	payload: Buffer.from([]),
};
const msgInit2: Message = {
	command: Commands.init2,
	payload: Buffer.from([0x01]),
};
const msgHeartbeatResponse: Message = {
	command: Commands.heartbeat_response,
	payload: Buffer.from([]),
};
const msgSwitch_Part1 = Buffer.from([0x01, 0x01, 0x0a, 0xe0]);
const msgSwitch_Part2 = Buffer.from([0xff, 0xfe, 0x00, 0x00, 0x10, 0x11, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00]);

export class Server extends EventEmitter {

	constructor(port?: number) {
		super();

		this.server = net
			.createServer(this.server_onConnection.bind(this))
			.once("listening", this.server_onListening.bind(this))
			.once("close", this.server_onClose.bind(this))
			;
		if (port != null) {
			this.server.listen(port);
		} else {
			this.server.listen(0); // listen on a random free port
		}

		this.checkPlugTimer = setInterval(this.checkPlugsThread.bind(this), 10000);
	}

	public close() {
		this.server.close();
	}

	private server: net.Server;
	private plugs: { [shortmac: string]: PlugInternal } = {};
	private checkPlugTimer: NodeJS.Timer;

	// gets called whenever a new client connects
	private server_onConnection(socket: net.Socket) {

		debug("connection from " + socket.remoteAddress);

		let receiveBuffer = Buffer.from([]);
		let id: string;
		let plug: PlugInternal;
		let isReconnection: boolean = false;

		socket.on("data", (data) => {
			// remember the received data
			receiveBuffer = Buffer.concat([receiveBuffer, data]);
			// parse all messages
			let msg: { msg: Message, bytesRead: number } | null;
			// parse all complete messages in the buffer
			// tslint:disable-next-line:no-conditional-assignment
			while (msg = parseMessage(receiveBuffer)) {
				// handle the message
				handleMessage(msg.msg);
				// and cut it from the buffer
				receiveBuffer = Buffer.from(receiveBuffer.slice(msg.bytesRead));
			}
		});

		socket.on("close", () => {
			if (id != null) {
				// known client, remove it from the list
				if (this.plugs.hasOwnProperty(id)) delete this.plugs[id];

				// also notify our listeners
				this.emit("plug disconnected", id);
			}
		});

		socket.on("error", (err) => {
			debug(`socket error. mac=${plug.shortmac.toString("hex")}. error: ${err}`);
		});

		// handles incoming messages
		let expectedCommands: Commands[] = [];
		const handleMessage = (msg: Message) => {
			// check if the command was expected
			if (expectedCommands.length > 0 && expectedCommands.indexOf(msg.command) === -1) {
				this.emit("error", "unexpected command: " + msg.command);
				socket.destroy();
				return;
			}
			// check if the command was sent from the correct plug
			if (plug && plug.shortmac && !msg.payload.slice(5, 8).equals(plug.shortmac)) {
				this.emit("error", "received a message with a wrong shortmac");
				socket.destroy();
				return;
			}

			// TODO: can we refactor this so it becomes testable?
			switch (msg.command) {

				case Commands.init1_response:
					// extract the triggercode and shortmac
					const triggercode = Buffer.from(msg.payload.slice(3, 5));
					const shortmac = Buffer.from(msg.payload.slice(5, 8));
					id = shortmac.toString("hex");
					if (this.plugs.hasOwnProperty(id)) {
						isReconnection = true;
						// reconnection -- reuse plug object
						plug = this.plugs[id];
						// but destroy and forget the old socket
						if (plug.socket != null) {
							debug("reconnection -- destroying socket");
							plug.socket.removeAllListeners();
							plug.socket.destroy();
						}
						// and remember the new one
						plug.socket = socket;
					} else {
						plug = {
							id: null!,
							ip: socket.remoteAddress,
							type: PlugType[(triggercode[0] << 8) + (triggercode[1])] as keyof typeof PlugType,
							port: socket.remotePort,
							lastSeen: Date.now(),
							online: true,
							socket: socket,
							triggercode: null!,
							shortmac: null!,
							mac: null!,
							state: false,
							lastSwitchSource: "unknown",
							firmware: null!,
							energyMeasurement: {},
						};
					}
					plug.id = id;
					plug.triggercode = triggercode;
					plug.shortmac = shortmac;
					this.onPlugResponse(plug);

					// send init2 request
					expectedCommands = [Commands.init2_response, Commands.state_update];
					socket.write(serializeMessage(msgInit2));

					break;

				case Commands.init2_response:
					this.onPlugResponse(plug);
					// check if the payload contains the full mac at the end
					if (msg.payload.slice(-3).equals(plug.shortmac!)) {
						// first reply, extract the full mac
						plug.mac = Buffer.from(msg.payload.slice(-6));
					} else {
						// 2nd reply, handshake is over
						expectedCommands = [];

						if (msg.payload.length === 16) {
							// the last three bytes contain the firmware version
							const [major, minor, build] = Array.from(msg.payload.slice(-3));
							plug.firmware = `${major}.${minor}.${build}`;
						}

						// remember plug and notify listeners
						this.plugs[id] = plug;
						if (!isReconnection) this.emit("plug added", id);
					}
					break;

				case Commands.heartbeat:
					this.onPlugResponse(plug);
					// reply so the socket doesn't forget us
					socket.write(serializeMessage(msgHeartbeatResponse));
					break;

				case Commands.state_update:
					this.onPlugResponse(plug);
					// parse the state and the source of the state change
					// we have to differentiate two different payloads here
					if (msg.payload.length === 0x14) {
						// 1st case: on/off report
						plug.state = msg.payload[msg.payload.length - 1] > 0;
						plug.lastSwitchSource = SwitchSource[msg.payload[11]] as keyof typeof SwitchSource;
					} else if (msg.payload.length === 0x15) {
						// 2nd case: energy report
						const type = msg.payload[16];
						const value = readUInt24(msg.payload, msg.payload.length - 3) / 100;
						const typeName = EnergyMeasurementTypes[type];
						plug.energyMeasurement[typeName] = value;
					}

					debug("got update: " + msg.payload.toString("hex"));
					this.emit("plug updated", Plug.from(plug));
					break;

				default:
					debug("received message with unknown command " + msg.command.toString(16));
					debug(msg.payload.toString("hex"));
					break;

			}
		};

		// start the handshake
		const msgInit1a: Message = {
			command: Commands.init1,
			payload: crypto.randomBytes(6), // Buffer.from([0x05, 0x0d, 0x07, 0x05, 0x07, 0x12])
		};
		expectedCommands = [Commands.init1_response];
		socket.write(Buffer.concat([
			serializeMessage(msgInit1a),
			serializeMessage(msgInit1b),
		]));

	}
	private server_onListening() {
		this.emit("server started", this.server.address());
	}
	private server_onClose() {
		clearInterval(this.checkPlugTimer);
		this.emit("server closed");
	}

	/**
	 * Gets called when a plug sends an expected response
	 */
	private onPlugResponse(plug: PlugInternal) {
		plug.lastSeen = Date.now();
		// if the plug is known and was offline, notify listeners that it is alive
		if (plug.shortmac) {
			const id = plug.shortmac.toString("hex");
			if (!plug.online && this.plugs.hasOwnProperty(id)) {
				plug.online = true;
				this.emit("plug alive", id);
			}
		}
	}

	/**
	 * Gets called regularly to clean up dead plugs from the database
	 */
	private checkPlugsThread() {
		for (const id of Object.keys(this.plugs)) {
			const plug = this.plugs[id];
			if (plug.online) {
				if (Date.now() - plug.lastSeen > 60000) {
					// 1 minute with no response, expect the plug to be dead
					plug.online = false;
					this.emit("plug dead", id);
				}
			}
		}
	}

	/**
	 * Switch the plug with the given ID to the given state
	 */
	public switchPlug(id: string, state: boolean) {
		if (this.plugs.hasOwnProperty(id)) {
			const plug = this.plugs[id];
			const payload = Buffer.concat([
				msgSwitch_Part1,
				plug.triggercode!,
				plug.shortmac!,
				msgSwitch_Part2,
				Buffer.from([state ? 0xff : 0x00]),
			]);
			const msgSwitch: Message = {
				command: Commands.switch,
				payload: payload,
			};
			plug.socket.write(serializeMessage(msgSwitch));
		}
	}

}
