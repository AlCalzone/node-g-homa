/// <reference types="node" />
/**
 * Returns the broadcast addresses for all connected interfaces
 */
export declare function getBroadcastAddresses(): string[];
/**
 * Returns the broadcast addresses for all connected interfaces
 */
export declare function getOwnIpAddresses(): string[];
export declare function wait(milliseconds: number): Promise<void>;
export declare function range(start: number, end: number): number[];
export declare function promisifyNoError<T>(fn: any, context: any): (...args: any[]) => Promise<T>;
export declare function readUInt24(buf: Buffer, offset?: number): number;
