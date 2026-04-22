---
name: cowork-connectors
description: Reference for PRISM external integration connectors available in Cowork mode -- Fusion 360, hyperMILL, OPC-UA, MQTT, MTConnect, Grafana.
model: haiku
effort: low
allowed-tools: Read, Grep, Glob
---

# PRISM Cowork Connector Reference

Quick reference for all external integration points available when running PRISM in Cowork desktop agent mode.

## Fusion 360 Live Bridge
- **Engine**: Fusion360LiveBridgeEngine
- **Port**: 18360
- **Protocol**: HTTP REST
- **Capabilities**: Real-time CAD control — sketch, extrude, fillet, chamfer, revolve, hole, pattern, combine, shell, export, undo, geometry query
- **Add-in**: scripts/fusion360-addin/ (install in F360 Add-Ins panel)
- **15 endpoints**: /sketch, /extrude, /fillet, /chamfer, /revolve, /hole, /pattern, /combine, /shell, /export, /undo, /geometry, /status, /tools, /sync
- **Skill**: `/fusion-generate --live` for real-time mode
- **Example**: `curl http://localhost:18360/extrude -d '{"sketch":"Sketch1","distance":10}'`

## PostProcessor API
- **Engine**: PostProcessorAPIEngine
- **Port**: 18361
- **Protocol**: HTTP REST
- **Capabilities**: G-code generation with 20 controller dialects, optimization, verification
- **5 endpoints**: /process, /verify, /dialects, /optimize, /status
- **Dialects**: Fanuc 0i/16i/18i/30i/31i, Siemens 828D/840D/ONE, Heidenhain TNC640/7, Haas NGC, Mazak SmoothAi/G, Okuma P300/P500, Brother, Mitsubishi, Fagor, Generic
- **Example**: `curl http://localhost:18361/process -d '{"gcode":"...","dialect":"fanuc_30i"}'`

## OPC-UA Connector
- **Engine**: OpcUaConnectorEngine
- **Protocol**: OPC-UA (node-opcua)
- **Capabilities**: Live CNC machine data — read/write nodes, subscriptions, browse namespace
- **Use case**: Connect to CNC controller OPC-UA server for real-time spindle load, feed override, axis positions
- **Actions**: opcua_connect, opcua_read, opcua_write, opcua_subscribe, opcua_browse, opcua_disconnect
- **Example**: Connect to `opc.tcp://cnc-machine:4840`, read spindle load node

## MQTT Bridge
- **Engine**: MqttBridgeEngine
- **Protocol**: MQTT v3.1.1/v5
- **Capabilities**: Sensor data streams — subscribe to topics, aggregate readings, alert thresholds
- **9 actions**: connect, subscribe, latest, history, alerts, aggregate, vibration, temperature, disconnect
- **Use case**: Subscribe to vibration/temperature sensor topics from CNC machines
- **Example**: Subscribe to `machine/spindle/vibration` topic, set alert at 5 mm/s RMS

## MTConnect Adapter
- **Engine**: MTConnectAdapterEngine
- **Protocol**: HTTP/XML (MTConnect standard)
- **Capabilities**: Machine status polling — probe, current, sample, assets, spindle load, feed override, alarms
- **9 actions**: probe, current, sample, assets, spindle_load, feed_override, machine_status, alarms, history
- **Use case**: Poll MTConnect agent for real-time machine state and alarm history
- **Example**: `GET http://mtconnect-agent:5000/current` for live machine state

## Grafana Bridge
- **Engine**: GrafanaBridgeEngine
- **Protocol**: HTTP REST (Prometheus + Grafana API)
- **Capabilities**: Metrics dashboards — query Prometheus, create/update Grafana dashboards, alert rules
- **9 actions**: query_prometheus, create_dashboard, update_panel, list_dashboards, create_alert, query_range, get_annotations, add_annotation, get_datasources
- **Use case**: Build real-time machining dashboards with force, temperature, vibration panels
- **Example**: Query `spindle_load_percent{machine="DMG_DMU50"}` over last hour

## Connection Patterns

### Start a monitoring session
1. Connect OPC-UA or MTConnect to the target machine
2. Subscribe MQTT for high-frequency sensor data
3. Create Grafana dashboard for visualization
4. Use Fusion 360 bridge if CAD interaction needed

### Post-process and verify
1. Generate G-code via PostProcessor API
2. Simulate with `/cnc-simulate`
3. Send to machine via OPC-UA write (if supported)
4. Monitor execution via MTConnect current/sample
