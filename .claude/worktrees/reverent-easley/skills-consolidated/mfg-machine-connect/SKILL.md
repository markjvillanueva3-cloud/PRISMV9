---
name: mfg-machine-connect
description: Register, connect, and disconnect CNC machines for real-time monitoring
---

# Machine Connection Manager

## When To Use
- Registering a new CNC machine into the PRISM monitoring network
- Establishing or dropping a live connection to a machine controller
- Removing a machine from monitoring when decommissioned or relocated
- Listing connected machines before querying live status

## How To Use
```
prism_intelligence action=machine_register params={machine_id: "DMG-5X-01", type: "5-axis", controller: "Siemens 840D", ip: "192.168.1.50"}
prism_intelligence action=machine_connect params={machine_id: "DMG-5X-01", protocol: "MTConnect"}
prism_intelligence action=machine_disconnect params={machine_id: "DMG-5X-01"}
```

## What It Returns
- `machine_id` — unique identifier for the registered machine
- `status` — current connection state (connected/disconnected/error)
- `protocol` — communication protocol in use (MTConnect, OPC-UA, FOCAS)
- `last_heartbeat` — timestamp of last successful communication
- `capabilities` — list of available data channels from the machine

## Examples
- Register a Haas VF-2 with FOCAS protocol: `machine_register params={machine_id: "HAAS-VF2-03", type: "3-axis VMC", controller: "Haas NGC", protocol: "FOCAS"}`
- Connect to an already-registered machine: `machine_connect params={machine_id: "HAAS-VF2-03"}`
- Disconnect a machine for maintenance: `machine_disconnect params={machine_id: "HAAS-VF2-03", reason: "scheduled maintenance"}`
