import { EventEmitter } from "events";
export declare type SwitchSource = "unknown" | "remote" | "local";
export interface ServerAddress {
    port: number;
    family: string;
    address: string;
}
export interface Plug {
    id: string;
    ip: string;
    port: number;
    lastSeen: number;
    online: boolean;
    lastSwitchSource: SwitchSource;
    state: boolean;
    shortmac: string;
    mac: string;
}
export declare class Server extends EventEmitter {
    constructor(port?: number);
    close(): void;
    private server;
    private plugs;
    private checkPlugTimer;
    private server_onConnection(socket);
    private server_onListening();
    private server_onClose();
    /**
     * Gets called when a plug sends an expected response
     */
    private onPlugResponse(plug);
    /**
     * Gets called regularly to clean up dead plugs from the database
     */
    private checkPlugsThread();
    /**
     * Switch the plug with the given ID to the given state
     */
    switchPlug(id: string, state: boolean): void;
}
