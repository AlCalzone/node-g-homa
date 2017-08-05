/// <reference types="node" />
import { EventEmitter } from "events";
export interface PlugInfo {
    ip: string;
    mac: string;
}
export declare class Manager extends EventEmitter {
    constructor();
    close(): void;
    private udp;
    private broadcastAddress;
    private udp_onListening();
    private send(msg, ip?);
    /**
     * Finds all active G-Homa plugs on the network
     * @param duration - The time to wait for all responses
     */
    findAllPlugs(duration?: number): Promise<PlugInfo[]>;
    /**
     * Sends a request to a socket and waits for a response
     */
    private request(msg, ip, timeout?);
    /**
     * Configures the plug at the given IP to talk to a new server
     * @param ip
     * @param serverAddress
     * @param serverPort
     */
    configurePlug(ip: string, serverAddress: string, serverPort: string | number): Promise<boolean>;
    /**
     * Restores the plug at the given IP to its original configuration
     */
    restorePlug(ip: string): Promise<boolean>;
}
