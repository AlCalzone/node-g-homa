import { EventEmitter } from "events";
import * as net from "net";
import * as crypto from "crypto";

const PREFIX = Buffer.from([0x5A, 0xA5]);
const POSTFIX = Buffer.from([0x5B, 0xB5]);

enum Commands {
    init1 = 0x01,
    init1_response = 0x03,
    init2 = 0x05,
    init2_response = 0x07,
    heartbeat = 0x04,
    heartbeat_response = 0x06,
    switch = 0x10,
	state_update = 0x90
}
enum SwitchSource {
    remote = 0x81,
	local = 0x11
}


interface Message {
    command: Commands,
	payload: Buffer
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
        POSTFIX
    ]);
}
function computeChecksum(data: Buffer): number {
    return 256 - data.reduce((sum, cur) => (sum + cur) & 0xff, 0);
}

function parseMessage(buf: Buffer): { msg: Message, bytesRead: number } {
	// the buffer has to be at least 2 (prefix) + 2 (length) + 1 (command) + 1 (checksum) + 2 (postfix) bytes long
    if (buf.length < 8) return null;

    if (!buf.slice(0, 2).equals(PREFIX))
        throw new Error("invalid data in the receive buffer");

	// get length of the payload
    const payloadLength = buf.readUInt16BE(2);
	// check we have enough data
    if (buf.length < 8 + payloadLength) return null;
	// extract the payload
    const data = buf.slice(4, 4 + payloadLength);
    const command = data[0];
    const payload = Buffer.from(data.slice(1));
	// extract the checksum and check it
    const checksum = buf[4 + payloadLength];
    if (checksum !== computeChecksum(data))
        throw new Error("invalid checksum");
	// make sure the message ends with the postfix
    if (!buf.slice(4 + payloadLength + 1, 4 + payloadLength + 3).equals(POSTFIX))
        throw new Error("invalid data in the receive buffer");

    return {
        msg: {
            command: command,
            payload: payload
        },
        bytesRead: 4 + payloadLength + 3
    };

}

export interface ServerAddress {
    port: number,
    family: string,
	address: string
}
export interface Client {
    ip: string,
    port: number,
    lastHeartbeat: number,
	socket: net.Socket
}

export class Server extends EventEmitter {

    constructor() {
        super();

        this.server = net
            .createServer(this.server_onConnection.bind(this))
            .on("listening", this.server_onListening.bind(this))
            ;
        this.server.listen();
    }

    private server: net.Server;
    private clients: { [shortmac: string]: Client } = {};

	// gets called whenever a new client connects
    private server_onConnection(socket: net.Socket) {

        let receiveBuffer = Buffer.from([]);
        let shortmac: string;

        socket.on("data", (data) => {
            // remember the received data
            receiveBuffer = Buffer.concat([receiveBuffer, data]);
            // parse all messages
            let msg: { msg: Message, bytesRead: number };
            while (msg = parseMessage(receiveBuffer)) {
                handleMessage(msg.msg);
                receiveBuffer = Buffer.from(receiveBuffer.slice(msg.bytesRead));
            }
        });

        socket.on("close", () => {
            if (shortmac != null) {
				// known client, remove it from the list
                if (this.clients.hasOwnProperty(shortmac))
                    delete this.clients[shortmac];

				// also notify our listeners
                this.emit("client disconnected", shortmac);
            }
        });

        socket.on("error", (err) => {
            console.log(`socket error. mac=${shortmac}. error: ${err}`);
        });

		// handles incoming messages
        function handleMessage(msg: Message) {
            switch (msg.command) {

            }
        }

		// start the handshake
        const msgInit1a: Message = {
            command: Commands.init1,
            payload: crypto.randomBytes(6)
        };
        const msgInit1b: Message = {
            command: Commands.init1,
            payload: Buffer.from([])
        };
        socket.write(Buffer.concat([
            serializeMessage(msgInit1a),
            serializeMessage(msgInit1b)
        ]));

    }
    private server_onListening() {
        this.emit("server started", this.server.address());
    }

}