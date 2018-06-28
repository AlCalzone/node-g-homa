/// <reference types="node" />
import { EventEmitter } from "events";
export declare enum Commands {
    init1 = 2,
    init1_response = 3,
    init2 = 5,
    init2_response = 7,
    heartbeat = 4,
    heartbeat_response = 6,
    switch = 16,
    state_update = 144
}
export declare enum SwitchSource {
    unknown = 0,
    local = 129,
    remote = 17
}
export interface Message {
    command: Commands;
    payload: Buffer;
}
export declare function parseMessage(buf: Buffer): {
    msg: Message;
    bytesRead: number;
} | null;
export interface ServerAddress {
    port: number;
    family: string;
    address: string;
}
export declare enum PlugType {
    normal = 12835,
    withEnergyMeasurement = 13603
}
export declare enum EnergyMeasurementTypes {
    power = 1,
    energy = 2,
    voltage = 3,
    current = 4,
    frequency = 5,
    maxPower = 7,
    powerFactor = 8
}
export declare type EnergyMeasurementNames = keyof typeof EnergyMeasurementTypes;
export declare type EnergyMeasurement = {
    [type in EnergyMeasurementNames]?: number;
};
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
export declare class Server extends EventEmitter {
    constructor(port?: number);
    close(): void;
    private server;
    private plugs;
    private checkPlugTimer;
    private server_onConnection;
    private server_onListening;
    private server_onClose;
    /**
     * Gets called when a plug sends an expected response
     */
    private onPlugResponse;
    /**
     * Gets called regularly to clean up dead plugs from the database
     */
    private checkPlugsThread;
    /**
     * Switch the plug with the given ID to the given state
     */
    switchPlug(id: string, state: boolean): void;
}
