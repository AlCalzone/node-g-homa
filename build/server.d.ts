/// <reference types="node" />
import { EventEmitter } from "events";
export declare type SwitchSource = "unknown" | "remote" | "local";
export interface ServerAddress {
    port: number;
    family: string;
    address: string;
}
export declare enum PlugType {
    normal = 12835,
    withEnergyMeasurement = 13603,
}
export declare enum EnergyMeasurementTypes {
    power = 1,
    energy = 2,
    voltage = 3,
    current = 4,
    frequency = 5,
    maxPower = 7,
    powerFactor = 8,
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
    lastSwitchSource: SwitchSource;
    state: boolean;
    shortmac: string;
    mac: string;
    energyMeasurement: EnergyMeasurement;
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
