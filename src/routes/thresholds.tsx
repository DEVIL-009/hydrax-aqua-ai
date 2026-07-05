import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Coffee, CalendarDays, PartyPopper, Siren, Sliders, Sun } from "lucide-react";
import { GlassCard } from "@/components/hydrax/GlassCard";
import { PageHeader } from "@/components/hydrax/PageHeader";
import { StatusPill } from "@/components/hydrax/StatusPill";
import { Button } from "@/components/ui/button";
import { updateThresholds, useHydrax } from "@/lib/hydrax-store";
import type { Thresholds } from "@/lib/hydrax-types";

export const Route = createFileRoute("/thresholds")({
  head: () => ({
    meta: [
      { title: "Thresholds · HYDRAX" },
      { name: "description", content: "Configure flow thresholds for break time, normal hours, holidays, events and emergency modes." },
    ],
  }),
  component: ThresholdsPage,
});

const items: { key: keyof Thresholds; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "normalTime", label: "Normal time", hint: "Default working hours flow ceiling", icon: Sun },
  { key: "breakTime", label: "Break time", hint: "Elevated flow during recess / lunch", icon: Coffee },
  { key: "holiday", label: "Holiday", hint: "Minimal flow when campus is empty", icon: CalendarDays },
  { key: "specialEvent", label: "Special event", hint: "High-demand events and functions", icon: PartyPopper },
  { key: "emergency", label: "Emergency", hint: "Maximum flow during emergencies", icon: Siren },
  { key: "custom", label: "Custom schedule", hint: "User-defined schedule threshold", icon: Sliders },
];

function ThresholdsPage() {
  const data = useHydrax();
  const [draft, setDraft] = useState<Thresholds>(data.config.thresholds);
  const dirty = JSON.stringify(draft) !== JSON.stringify(data.config.thresholds);

  return (
    <div>
      <PageHeader
        eyebrow="Threshold management"
        title="Flow thresholds by context"
        description="Every context has its own maximum flow. The AI blends these with realtime demand to open, throttle or shut valves."
        actions={
          <>
            <StatusPill tone={dirty ? "warning" : "success"} pulse={dirty}>
              {dirty ? "Unsaved changes" : "In sync with Firebase"}
            </StatusPill>
            <Button
              disabled={!dirty}
              onClick={async () => {
                await updateThresholds(draft);
                toast.success("Thresholds saved to Firebase");
              }}
            >
              Save all
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((it) => (
          <GlassCard key={it.key}>
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
                <it.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold">{it.label}</div>
                <div className="text-xs text-muted-foreground">{it.hint}</div>
              </div>
            </div>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums text-gradient">
                {draft[it.key]}
              </span>
              <span className="text-sm text-muted-foreground">L/min</span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              step={1}
              value={draft[it.key]}
              onChange={(e) => setDraft({ ...draft, [it.key]: Number(e.target.value) })}
              className="mt-3 w-full accent-[color:var(--primary)]"
            />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>0</span><span>30</span><span>60</span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}