/// <reference types="node" />
import { EventEmitter } from "events";
import { GHomaOptions } from "./lib";
/**
 * Provides functions for inclusion and discover of G-Homa WiFi plugs
 * Only works if the discovering device transmits via WiFi or if
 * the router is configured to forward UDP broadcasts over WiFi
 */
export declare class Discovery extends EventEmitter {
    constructor(options?: GHomaOptions);
    close(): void;
    private udp;
    private broadcastAddress;
    private udp_onListening();
    private _inclusionActive;
    readonly inclusionActive: boolean;
    /**
     * Starts inclusion of G-Homa plugs with the given Wifi psk.
     * @param psk - The wifi password
     * @param stopOnDiscover - Stop the inclusion when a device was found
     */
    beginInclusion(psk: string, stopOnDiscover?: boolean): void;
    private _doInclusion(psk, stopOnDiscover?);
    private sendPSK(psk);
    private sendCodeWithTimeout(code, timeout);
    /**
     * Cancels the inclusion process
     */
    cancelInclusion(): void;
}
