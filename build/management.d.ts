/// <reference types="node" />
import * as dgram from "dgram";
/**
 * Starts inclusion of G-Homa plugs with the given Wifi psk.
 * This only works if the current device is connected via WiFi or
 * if UDP broadcast packets are forwarded over WiFi
 * @param psk - The wifi password
 */
export declare function beginInclusion(psk: string): void;
/**
 * Cancels the inclusion process
 */
export declare function cancelInclusion(): void;
export declare function discoverDevices(socket: dgram.Socket): Promise<void>;
