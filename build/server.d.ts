/// <reference types="node" />
import { EventEmitter } from "events";
import * as net from "net";
export interface ServerAddress {
    port: number;
    family: string;
    address: string;
}
export interface Client {
    ip: string;
    port: number;
    lastHeartbeat: number;
    socket: net.Socket;
}
export declare class Server extends EventEmitter {
    constructor();
    private server;
    private clients;
    private server_onConnection(socket);
    private server_onListening();
}
