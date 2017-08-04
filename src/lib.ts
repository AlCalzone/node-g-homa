import * as os from "os";

/**
 * Returns the broadcast addresses for all connected interfaces
 */
export function getBroadcastAddresses(): string[] {
	// enumerate interfaces
	const net = os.networkInterfaces();
	const broadcastAddresses = Object.keys(net)
		// flatten the array structure
		.map(k => net[k])
		.reduce((prev, cur) => prev.concat(...cur), [])
		// only use external IPv4 ones
		.filter(add => !add.internal && add.family === "IPv4")
		// extract address and subnet as number array
		.map(k => ({
			address: k.address.split(".").map(num => +num),
			netmask: k.netmask.split(".").map(num => +num)
		}))
		// broadcast is address OR (not netmask)
		.map(add => {
			return add.address.map((val, i) => (val | ~add.netmask[i]) & 0xff)
		})
		// ignore unconnected ones
		.filter(add => add[0] != 169)
		// turn the address into a string again
		.map(a => `${a[0]}.${a[1]}.${a[2]}.${a[3]}`)
		;
	return broadcastAddresses;
}

/**
 * Returns the broadcast addresses for all connected interfaces
 */
export function getOwnIpAddresses(): string[] {
	// enumerate interfaces
	const net = os.networkInterfaces();
	const addresses = Object.keys(net)
		// flatten the array structure
		.map(k => net[k])
		.reduce((prev, cur) => prev.concat(...cur), [])
		// only use external IPv4 ones
		.filter(add => !add.internal && add.family === "IPv4")
		// extract address as number array
		.map(k => k.address.split(".").map(num => +num))
		// ignore unconnected ones
		.filter(add => add[0] != 169)
		// turn the address into a string again
		.map(a => `${a[0]}.${a[1]}.${a[2]}.${a[3]}`)
		;
	return addresses;
}



export function wait(milliseconds: number): Promise<void> {
	return new Promise<void>((res, rej) => {
		setTimeout(res, milliseconds);
	});
}

export function range(start: number, end: number): number[] {
	const ret = new Array(end - start + 1);
	for (let i = 0; i < ret.length; i++) {
		ret[i] = start + i;
	}
	return ret;
}

export function promisifyNoError<T>(fn, context): (...args: any[]) => Promise<T>;
export function promisifyNoError(fn, context) {
    return function(...args) {
        context = context || this;
        return new Promise(function(resolve, reject) {
            fn.apply(context, [...args, function(result) {
                return resolve(result);
            }]);
        });
    };
}