import { useState, useCallback } from "react";
import { Card, Button, Spinner, Badge, Tabs, TabList, Tab, TabPanel } from "../components/ui";
import { useIntegrationsCam, useIntegrationsDnc, useIntegrationsErp, useIntegrationsMobile, useIntegrationsMeasurement } from "../hooks/useIntegrations";
import type { IntegrationInput } from "../types/integrations";

export default function IntegrationsPage() {
  const [camInput, setCamInput] = useState<IntegrationInput>({ action: "cam_connect", cam_system: "mastercam", version: "2025" });
  const [dncInput, setDncInput] = useState<IntegrationInput>({ action: "dnc_transfer", machine_id: "", file_name: "", protocol: "ethernet", direction: "upload" });
  const [erpInput, setErpInput] = useState<IntegrationInput>({ action: "erp_sync", erp_system: "sap", entity_type: "work_order", direction: "import" });
  const [mobileInput, setMobileInput] = useState<IntegrationInput>({ action: "mobile_register", device_type: "tablet", machine_id: "" });
  const [measInput, setMeasInput] = useState<IntegrationInput>({ action: "measurement_capture", device_type: "cmm", part_id: "", program_id: "" });

  const cam = useIntegrationsCam();
  const dnc = useIntegrationsDnc();
  const erp = useIntegrationsErp();
  const mobile = useIntegrationsMobile();
  const meas = useIntegrationsMeasurement();

  const updateField = useCallback(<T extends Record<string, unknown>>(setter: React.Dispatch<React.SetStateAction<T>>, field: string, value: unknown) => {
    setter(prev => ({ ...prev, [field]: value }));
  }, []);

  const activeResult = cam.data || dnc.data || erp.data || mobile.data || meas.data;
  const activeError = cam.error || dnc.error || erp.error || mobile.error || meas.error;
  const activeLoading = cam.loading || dnc.loading || erp.loading || mobile.loading || meas.loading;
  const activeLabel = cam.data ? "CAM Integration" : dnc.data ? "DNC Transfer" : erp.data ? "ERP Sync" : mobile.data ? "Mobile Interface" : meas.data ? "Measurement" : "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="space-y-3">
        <Card>
          <h2 className="text-lg font-bold mb-3">Integrations Hub</h2>

          <Tabs defaultValue="cam">
            <TabList>
              <Tab value="cam">CAM</Tab>
              <Tab value="dnc">DNC</Tab>
              <Tab value="erp">ERP</Tab>
              <Tab value="mobile">Mobile</Tab>
              <Tab value="measurement">Measurement</Tab>
            </TabList>

            <TabPanel value="cam">
              <div className="space-y-2 mt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">CAM System</label>
                  <select value={String(camInput.cam_system)} onChange={e => updateField(setCamInput, "cam_system", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded">
                    <option value="mastercam">Mastercam</option>
                    <option value="fusion360">Fusion 360</option>
                    <option value="solidcam">SolidCAM</option>
                    <option value="hypermill">hyperMILL</option>
                    <option value="nx_cam">NX CAM</option>
                    <option value="catia">CATIA</option>
                    <option value="esprit">ESPRIT</option>
                    <option value="powermill">PowerMill</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Version</label>
                  <input type="text" value={String(camInput.version)} onChange={e => updateField(setCamInput, "version", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" />
                </div>
                <Button onClick={() => cam.execute(camInput)} disabled={cam.loading} className="w-full mt-2">
                  {cam.loading ? <><Spinner size="sm" /> Connecting...</> : "Connect CAM"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="dnc">
              <div className="space-y-2 mt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Machine ID</label>
                  <input type="text" value={String(dncInput.machine_id)} onChange={e => updateField(setDncInput, "machine_id", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="e.g. HAAS-VF2" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">File Name</label>
                  <input type="text" value={String(dncInput.file_name)} onChange={e => updateField(setDncInput, "file_name", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="O0001.nc" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Protocol</label>
                    <select value={String(dncInput.protocol)} onChange={e => updateField(setDncInput, "protocol", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded">
                      <option value="serial">Serial (RS-232)</option>
                      <option value="ethernet">Ethernet</option>
                      <option value="ftp">FTP</option>
                      <option value="cifs">CIFS/SMB</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Direction</label>
                    <select value={String(dncInput.direction)} onChange={e => updateField(setDncInput, "direction", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded">
                      <option value="upload">Upload to CNC</option>
                      <option value="download">Download from CNC</option>
                    </select>
                  </div>
                </div>
                <Button onClick={() => dnc.execute(dncInput)} disabled={dnc.loading} className="w-full mt-2">
                  {dnc.loading ? <><Spinner size="sm" /> Transferring...</> : "Start Transfer"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="erp">
              <div className="space-y-2 mt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">ERP System</label>
                  <select value={String(erpInput.erp_system)} onChange={e => updateField(setErpInput, "erp_system", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded">
                    <option value="sap">SAP</option>
                    <option value="oracle">Oracle</option>
                    <option value="epicor">Epicor</option>
                    <option value="infor">Infor</option>
                    <option value="jobboss">JobBOSS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Entity Type</label>
                  <select value={String(erpInput.entity_type)} onChange={e => updateField(setErpInput, "entity_type", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded">
                    <option value="work_order">Work Orders</option>
                    <option value="bom">Bill of Materials</option>
                    <option value="routing">Routings</option>
                    <option value="inventory">Inventory</option>
                    <option value="schedule">Schedule</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Direction</label>
                  <select value={String(erpInput.direction)} onChange={e => updateField(setErpInput, "direction", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded">
                    <option value="import">Import</option>
                    <option value="export">Export</option>
                    <option value="bidirectional">Bidirectional</option>
                  </select>
                </div>
                <Button onClick={() => erp.execute(erpInput)} disabled={erp.loading} className="w-full mt-2">
                  {erp.loading ? <><Spinner size="sm" /> Syncing...</> : "Sync ERP"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="mobile">
              <div className="space-y-2 mt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Device Type</label>
                  <select value={String(mobileInput.device_type)} onChange={e => updateField(setMobileInput, "device_type", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded">
                    <option value="tablet">Tablet</option>
                    <option value="phone">Phone</option>
                    <option value="hmi">HMI Panel</option>
                    <option value="wearable">Wearable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Machine ID</label>
                  <input type="text" value={String(mobileInput.machine_id)} onChange={e => updateField(setMobileInput, "machine_id", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="e.g. DMG-DMU50" />
                </div>
                <Button onClick={() => mobile.execute(mobileInput)} disabled={mobile.loading} className="w-full mt-2">
                  {mobile.loading ? <><Spinner size="sm" /> Registering...</> : "Register Device"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="measurement">
              <div className="space-y-2 mt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Device Type</label>
                  <select value={String(measInput.device_type)} onChange={e => updateField(setMeasInput, "device_type", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded">
                    <option value="cmm">CMM</option>
                    <option value="laser_scanner">Laser Scanner</option>
                    <option value="vision">Vision System</option>
                    <option value="profilometer">Profilometer</option>
                    <option value="caliper">Digital Caliper</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Part ID</label>
                  <input type="text" value={String(measInput.part_id)} onChange={e => updateField(setMeasInput, "part_id", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="Part serial/lot number" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Program ID</label>
                  <input type="text" value={String(measInput.program_id)} onChange={e => updateField(setMeasInput, "program_id", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="Measurement program" />
                </div>
                <Button onClick={() => meas.execute(measInput)} disabled={meas.loading} className="w-full mt-2">
                  {meas.loading ? <><Spinner size="sm" /> Measuring...</> : "Capture Measurement"}
                </Button>
              </div>
            </TabPanel>
          </Tabs>

          {activeError && <p className="mt-2 text-xs text-red-600">{activeError}</p>}
        </Card>
      </div>

      <div className="lg:col-span-2">
        {activeResult ? (
          <Card>
            <h3 className="font-bold mb-3">{activeLabel} Result</h3>
            {cam.data && (
              <div className="flex gap-2 mb-3">
                <Badge color={(cam.data as { connection_status?: string }).connection_status === "connected" ? "green" : "red"}>
                  {(cam.data as { connection_status?: string }).connection_status}
                </Badge>
                <Badge color="blue">{(cam.data as { cam_system?: string }).cam_system}</Badge>
                <Badge color="slate">v{(cam.data as { version?: string }).version}</Badge>
              </div>
            )}
            {dnc.data && (
              <div className="flex gap-2 mb-3">
                <Badge color={(dnc.data as { status?: string }).status === "complete" ? "green" : (dnc.data as { status?: string }).status === "error" ? "red" : "yellow"}>
                  {(dnc.data as { status?: string }).status}
                </Badge>
                <Badge color="blue">{(dnc.data as { protocol?: string }).protocol}</Badge>
                <Badge color="slate">{(dnc.data as { progress_pct?: number }).progress_pct}%</Badge>
              </div>
            )}
            {erp.data && (
              <div className="flex gap-2 mb-3">
                <Badge color={(erp.data as { status?: string }).status === "complete" ? "green" : (erp.data as { status?: string }).status === "error" ? "red" : "yellow"}>
                  {(erp.data as { status?: string }).status}
                </Badge>
                <Badge color="blue">{(erp.data as { records_processed?: number }).records_processed} processed</Badge>
                {(erp.data as { records_failed?: number }).records_failed! > 0 && (
                  <Badge color="red">{(erp.data as { records_failed?: number }).records_failed} failed</Badge>
                )}
              </div>
            )}
            {meas.data && (
              <div className="flex gap-2 mb-3">
                <Badge color={(meas.data as { overall_pass?: boolean }).overall_pass ? "green" : "red"}>
                  {(meas.data as { overall_pass?: boolean }).overall_pass ? "PASS" : "FAIL"}
                </Badge>
                <Badge color="blue">{(meas.data as { device_type?: string }).device_type}</Badge>
              </div>
            )}
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap">{JSON.stringify(activeResult, null, 2)}</pre>
          </Card>
        ) : !activeLoading ? (
          <Card>
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg mb-2">Integrations Hub</p>
              <p className="text-sm">CAM system integration, DNC file transfer, ERP synchronization, mobile device management, and measurement device capture.</p>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
