import * as dgram from "dgram";
import * as readline from "readline";
import { getBroadcastAddresses, getOwnIpAddresses, promisifyNoError, wait } from "./lib";

const udp = dgram
	.createSocket("udp4")
	.once("listening", udp_onListening)
	.on("message", udp_onMessage)
	.on("error", (e) => { throw e; })
	;
udp.bind(0); // listen on a random free port

function udp_onListening() {
	main();
}

let lastResponse: number;
function udp_onMessage(msg: Buffer, rinfo: dgram.RemoteInfo) {
	if (rinfo.port === 48899) {
		lastResponse = Date.now();
		console.log(`${rinfo.address}: ${msg.toString("ascii")}`);
	}
}

function send(msg: string, ip: string) {
	const data = Buffer.from(msg, "ascii");
	udp.send(data, 0, data.length, 48899, ip);
}

async function main() {
	let running = true;
	const rl = readline
		.createInterface(process.stdin, process.stdout)
		.on("close", () => { running = false; udp.close(); process.exit(0); })
		;
	const ask = promisifyNoError<string>(rl.question, rl);
	while (running) {
		console.log("G-Homa command line serial interface ready...");
		console.log("");
		let ip = await ask("Which IP to talk to? [default: Broadcast IP] ");
		if (!ip || !ip.length) {
			const addresses = getBroadcastAddresses();
			const ownAddresses = getOwnIpAddresses();
			let index = 0;
			// allow the user to select a network interface if there are multiple ones
			if (addresses.length > 1) {
				console.log("Multiple network interfaces found. You have to select one:");
				for (let i = 0; i < ownAddresses.length; i++) {
					console.log(`  ${i} => Your IP: ${ownAddresses[i]}`);
				}
				const answer = parseInt(await ask("Which network interface to use? [default: 0]"), 10);
				if (!Number.isNaN(answer) && answer >= 0 && answer < addresses.length) {
					index = answer;
				}
			}
			ip = getBroadcastAddresses()[index];
		}
		console.log(`talking to ${ip}. enter "QUIT" to return to IP selection`);

		while (running) {
			let command = await ask(`${ip} > `);
			if (command === "QUIT") break;
			command = command.replace("\\r", "\r");

			lastResponse = Date.now();
			send(command, ip);
			while (Date.now() - lastResponse < 1000) {
				await wait(100);
			}
		}
	}
}
