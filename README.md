# node-g-homa

NodeJS module to control G-Homa WiFi plugs. Functions include:
* **Inclusion of new Plugs** into an existing WiFi network without using the app. 
Only works if the discovering device transmits via WiFi or 
if the router is configured to forward UDP broadcasts over WiFi.
* Replacement of the default external **C&C server** with a local one, so the plugs don't have to phone home.
* **Command line serial interface** to manually talk to plugs on the local network.

## Credits
Protocol information was adapted from 
* [FHEM](https://svn.fhem.de/trac/browser/trunk/fhem/FHEM/53_GHoma.pm)
* [rodney42](https://github.com/rodney42/node-ghoma/blob/master/ghoma.js)

Big thanks for the original work decoding the protocol!

## Usage

### Inclusion of new plugs (only works on wireless devices):
```ts
const gHoma = require("g-homa");

const discovery = new gHoma.Discovery();
discovery
    .on("inclusion finished", (devices) => {
        // do something with included devices
    })
    .once("ready", () => {
        // start inclusion
        discovery.beginInclusion("psk");
    })
;
```
You have to supply the WiFi key to the `beginInclusion` method. By default, inclusion stops after one device was found.
The overload `beginInclusion("psk", false)` keeps finding new plugs for 60s and then returns.
Discovery works by sending packets to the broadcast address of a network interface. If you have multiple ones, e.g. LAN and WiFi, you can select the one to use by providing options to the constructor:
```ts
const discovery = new gHoma.Discovery({
    networkInterfaceIndex: 0,
});
```

The devices object contains a table of IP and MAC addresses of the found plugs:
```js
{
    "ip#1": "AABBCCDDEEFF",
    "ip#2": "FFEEDDCCBBAA",
    // and so on...
}
```

### Discovery and configuration of included plugs
```ts
const manager = new gHoma.Manager();
manager
    .once("ready", () => {
        // find plugs (promise version)
        manager.findAllPlugs(/* optional duration in ms */)
            .then(plugs => {
                // do something with the plugs
            })
        ;

        // find plugs (async version)
        const plugs = manager.findAllPlugs(/* optional duration in ms */);

        // configure a plug to use the local C&C server
        // async version:
        let success /* boolean */ = manager.configurePlug("plug IP", "server IP", serverPort);

        // restore a plug to use the default external C&C server
        let success /* boolean */ = manager.restorePlug("plug IP");
    })
;
```
Like with Discovery, you can select the network interface the Manager uses by providing options to the constructor:
```ts
const manager = new gHoma.Manager({
    networkInterfaceIndex: 0,
});
```

### Control of configured devices with the local C&C server
```ts
const server = new gHoma.Server(/* optional port number */);
// ...
// close the server when you're done
server.close();
```

The server emits a number of events:
- `server started`: The server has been started. Parameters: `address <{port, family, address}>`.
- `server closed`: The server was shut down.
- `plug added`: A plug has connected to the server. Parameters: `plugId <string>`.
- `plug updated`: A plug was switched. Parameters: `plugInfo <Plug>` (see below).
- `plug dead`: The connection to a plug was lost. Parameters: `plugId <string>`.
- `plug alive`: The connection to a plug was re-established. Parameters: `plugId <string>`.

The Plug object looks as follows:
```js
{
    id: string,        // ID of this plug
    ip: string,        // remote IP address
    port: number,      // remote port number
    lastSeen: number,  // last seen (UNIX time)
    online: boolean,   // if the plug is alive or dead
    lastSwitchSource: "unknown" | "remote" | "local", // where the plug was last switched from
    state: boolean,    // if the plug is on or off
    shortmac: string,  // last 3 bytes of the MAC, e.g. DD:EE:FF
    mac: string,       // e.g. AA:BB:CC:DD:EE:FF
}
```

### Manual serial interface
1. run it from the command line: `node build/serial.js`
1. enter an ip address to talk to, or leave the line blank to broadcast to all plugs
    1. enter password `HF-A11ASSISTHREAD` (default, can be changed)
    1. if the plug responds, confirm the receipt with `+ok`
    1. get a list of commands with `AT+H\r` (all commands need to include `\r` at the end)
    1. ...?
    1. profit

## Changelog

#### 1.2.0 (2019-08-09)
* (AlCalzone) Test all discovered devices instead of assuming they are G-Homa 

#### 1.1.3 (2018-06-28)
* (AlCalzone) Log the payload and triggercode when an unknown plug type is detected.

#### 1.1.2 (2018-01-28)
* (AlCalzone) Added the possibility to select a network interface to use for communication
* (AlCalzone) Added debug logs to `Discovery` and `Manager`

#### 1.0.0 (2018-01-11)
* (AlCalzone) Support energy measurement
* (AlCalzone) Support reading the firmware version

#### 0.0.4 (2017-08-31)
* (AlCalzone) Fix reconnection after power loss of the plug

#### 0.0.3 (2017-08-07)
* (AlCalzone) Fix incompatibility with NodeJS 4.x

#### 0.0.2 (2017-08-05)
* (AlCalzone) Bugfixes and additional logging

#### 0.0.1 (2017-08-05)
* (AlCalzone) Initial release


## License
The MIT License (MIT)

Copyright (c) 2017 AlCalzone <d.griesel@gmx.net>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
