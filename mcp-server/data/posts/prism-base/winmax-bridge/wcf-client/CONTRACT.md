# WinMax WCF — Live Contract + C# Shim (slot:echo, 2026-05-30)

The **real, live-captured** WinMax automation contract and the .NET shim that speaks it.
Everything here was proven against a running WinMax stack (PID-hosted `WcfDataService.exe`),
NOT inferred. Earlier guesses in `../winmax.actions.json` (e.g. `LoadProgram`, `GetProgramBlocks`)
were **wrong and have been corrected** — see §Contract below for the actual operations.

## How we got here (the onion, each layer proven)
`dotnet-svcutil net.tcp://localhost:4502/DataServicetcp/mex` → `WinMaxDataService.cs` (the proxy).
Then the shim was driven against live WinMax, peeling one failure at a time:

| Layer | Probe result | Fix |
|-------|--------------|-----|
| net.tcp transport | connects (SOAP exchanged) | — |
| `SecurityMode.None` | fault: server expects security | wrong mode |
| `SecurityMode.Transport` | "upgrade not supported by server" | server has no transport TLS |
| **`SecurityMode.Message`** on .NET 8 | `PlatformNotSupportedException: Message` | **retarget shim to net48** |
| `SecurityMode.Message` on net48 | `SecurityNegotiationException` | negotiation now runs |
| server cert validation | `SecurityTokenValidationException` — `CN=*.hurco.com` chain build failed / expired | set `ServiceCertificate.Authentication.CertificateValidationMode = None` (the **message-negotiated** cert knob, NOT `SslCertificateAuthentication`) |
| endpoint DNS identity | cert claims `machine-connect.hurco.com`, client expected `localhost` | `new EndpointAddress(uri, new DnsEndpointIdentity("machine-connect.hurco.com"))` |
| **VendorId credential** | `MessageSecurityException: unsecured fault … did not specify a Reason` | ⛔ **needs a valid Hurco Vendor ID** — the custom `VendorIdValidatorReadWrite` rejected dummy creds |

**Net result:** the shim negotiates message security, trusts the server cert, passes the DNS
identity check, and reaches the credential validator. The ONLY remaining requirement to read
live data is a valid Hurco **Vendor ID + secret**. That is a licensing/operator step (Hurco
issues vendor IDs to integration partners) — NOT a code gap, and NOT something to extract from
the binary.

## The exact binding (from `WcfDataService.exe.config`, verified)
- **Endpoint:** `net.tcp://localhost:4502/DataServicetcp` (also `+4503-4505`, `net.pipe://localhost/DataService/DataServicePipe`). The HTTP SOAP endpoints (`:80`, `:8080`) in the config are **NOT hosted** by the desktop sim.
- **Binding:** `netTcpBinding`, `transferMode="Buffered"`, `maxReceivedMessageSize≈1 GB`.
- **Security:** `mode="Message"`, `<message clientCredentialType="UserName" />`.
- **Server auth:** custom `WcfDataService.VendorIdValidatorReadWrite` (read-write TCP endpoint) / `VendorIdValidatorRead` (notification). Username = a **Vendor ID**.
- **Server cert:** `cer.pfx` (DevAge.ServiceModel auto-loads it; password `hurco`), subject `CN=*.hurco.com, O="Hurco Companies, Inc."`, DNS claim `machine-connect.hurco.com`, self-signed (and clock/validity-sensitive).
- **Platform:** message security ⇒ **.NET Framework only** (net48). Modern .NET (Core) WCF throws `PlatformNotSupportedException`.

## Contract — `IDataService` (23 ops, live-captured)
A **SID (System-ID) data-point bus** — read/write named control values + structured "bulk" blobs.
It is NOT a "load program / get blocks" API. Read-only ops are served by default; mutating/motion
ops are gated behind `--allow-motion`.

**Liveness / handshake**
- `GetVersion() → string`, `GetServerVersion() → double`, `GetClock() → int`

**Named data points (SIDs)** — read machine state / write values
- `GetSID(name) → {SID, Since, Value}`, `GetIntSID(name) → int`, `GetDoubleSID(name) → double`
- `SetSID(SIDValue)`, `SetIntSID(name,int)`, `SetDoubleSID(name,double)` ⚠ gated (write)
- `StringToGID(name) → uint`

**Structured "bulk" blobs** — tool data, machine position, part setup, **loaded programs**, NC variables, topology, notifications
- `GetBulk(GetBulkParams{SID}) → BulkWrapper`, `GetBulkByXML(name) → XmlElement`
- `SetBulk(SetBulkParams)` ⚠ gated (write)
- `GetChangedBulkByXML(SIDValue) → XmlElement`

**Change-notification / telemetry stream**
- `Subscribe(name)`, `Unsubscribe(name)`, `GetChangedSIDs(csv) → string`, `GetChangedSIDValues(SIDValue[]) → SIDValue[]`

**Program / file**
- `GetCurrentGraphicsProgram() → Stream` — the loaded program's graphics (our compare target)
- `DownloadFile(name) → Stream`

**Machine motion** ⚠⚠ physically moves the machine — gated, operator-supervised ONLY
- `RemoteRapidMove(RemoteRapidMoveData) → bool`, `WirelessJog(WirelessJogData) → bool`, `ProcessCommandRequest(double)`

> Next discovery step (when a Vendor ID is in hand): enumerate the **SID name dictionary** — the
> named data points are the key to reading positions, current tool, units, loaded-program names,
> etc. Likely sources: `GetChangedSIDs`, the WinMax registry (`RegistryLocation=Developer`), or
> Hurco's vendor SID reference.

## Running the shim
```
# build (net48, builds with the .NET SDK via reference-assemblies; runs on in-box Framework)
dotnet build PrismWinMaxShim.csproj -c Release -o bin

# one-shot (read-only by default; message security + cert trust + DNS identity are the defaults)
bin\PrismWinMaxShim.exe --op GetVersion --user <VENDOR_ID> --pass <VENDOR_SECRET>

# long-running JSON-over-stdio for the node bridge:
bin\PrismWinMaxShim.exe --serve --user <VENDOR_ID> --pass <VENDOR_SECRET>
#   stdin : {"op":"GetSID","args":["<sidName>"]}   stdout: {"ok":true,"op":"GetSID","value":{...}}
```
Credentials may also come from env: `WINMAX_VENDOR_ID`, `WINMAX_VENDOR_SECRET`, `WINMAX_DNS_IDENTITY`.
Flags: `--endpoint`, `--security none|transport|message` (default `message`), `--allow-motion` (off by default).

## Safety (load-bearing, R12)
- **Read-only by default.** `SetSID*`/`SetBulk`/`RemoteRapidMove`/`WirelessJog`/`ProcessCommandRequest`
  are refused unless `--allow-motion` is passed (operator-supervised).
- The shim **only connects** to an already-running stack — it never launches `WinMaxMill.exe`/`CNC_RT.exe`.
- No credentials are stored in the repo. `cer.pfx` stays in the Hurco install; we never copy it.

## Node bridge wiring (next unit — mechanical)
`scripts/winmax-bridge.mjs` `wcf` transport spawns `bin/PrismWinMaxShim.exe --serve …` and dispatches
`{op,args}` JSON lines, mapping the bridge actions (`read-datablocks` etc.) onto these ops. The bridge
still NEVER fabricates a result: with no Vendor ID it returns a LOUD warning (confidence 0), same as today.
