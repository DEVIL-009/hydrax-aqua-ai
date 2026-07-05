import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Bell, Building2, Cpu, Palette, Wifi } from "lucide-react";
import { GlassCard } from "@/components/hydrax/GlassCard";
import { PageHeader } from "@/components/hydrax/PageHeader";
import { StatusPill } from "@/components/hydrax/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { firebaseConfigured } from "@/lib/firebase";
import { updateInstitution, useHydrax } from "@/lib/hydrax-store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · HYDRAX" },
      { name: "description", content: "Configure institution, ESP32, Firebase, notifications and theme for the HYDRAX dashboard." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const data = useHydrax();
  const [name, setName] = useState(data.config.institutionName);
  const [notif, setNotif] = useState(true);
  const [ai, setAi] = useState(data.config.aiEnabled);

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="System configuration"
        description="Institution info, connectivity, firmware and preferences."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassCard>
          <SectionTitle icon={Building2} label="Institution" />
          <div className="space-y-3">
            <Field label="Institution name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="School logo URL">
              <Input placeholder="https://…/logo.png" />
            </Field>
            <Button
              onClick={() => {
                updateInstitution(name);
                toast.success("Institution updated");
              }}
            >
              Save
            </Button>
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle icon={Cpu} label="Controllers" />
          <div className="space-y-3">
            <Row label="ESP32 status" value={<StatusPill tone={data.esp32.online ? "success" : "danger"} pulse>{data.esp32.online ? "Online" : "Offline"}</StatusPill>} />
            <Row label="Firmware" value={<span className="text-sm">{data.esp32.firmware}</span>} />
            <Row label="Nodes" value={<span className="text-sm">{Object.keys(data.nodes).length}</span>} />
            <Row label="AI learning" value={<Switch checked={ai} onCheckedChange={setAi} />} />
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle icon={Wifi} label="Connectivity" />
          <div className="space-y-3">
            <Row
              label="Firebase Realtime DB"
              value={<StatusPill tone={firebaseConfigured ? "success" : "warning"}>{firebaseConfigured ? "Connected" : "Simulator mode"}</StatusPill>}
            />
            <Row label="WiFi SSID" value={<span className="text-sm">{data.esp32.wifi}</span>} />
            <Row label="System health" value={<span className="text-sm">{data.esp32.systemHealth}%</span>} />
            {!firebaseConfigured && (
              <p className="rounded-lg border border-border/40 bg-black/20 p-3 text-xs text-muted-foreground">
                Set <code className="text-foreground">VITE_FIREBASE_API_KEY</code> and{" "}
                <code className="text-foreground">VITE_FIREBASE_DATABASE_URL</code> to stream live ESP32 data instead of the simulator.
              </p>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle icon={Bell} label="Notifications & theme" />
          <div className="space-y-3">
            <Row label="Toast notifications" value={<Switch checked={notif} onCheckedChange={setNotif} />} />
            <Row label="Theme" value={<span className="inline-flex items-center gap-1 text-sm"><Palette className="h-3.5 w-3.5" /> Dark futuristic</span>} />
            <Row label="Role-based login" value={<StatusPill tone="muted">Coming soon</StatusPill>} />
            <Row label="Multi-institution" value={<StatusPill tone="muted">Coming soon</StatusPill>} />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-base font-semibold">{label}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div>{value}</div>
    </div>
  );
}