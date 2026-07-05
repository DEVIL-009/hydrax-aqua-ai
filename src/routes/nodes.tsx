import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, MapPin, Radio, Search, Signal, Thermometer, Timer } from "lucide-react";
import { useMemo, useState } from "react";
import { GlassCard } from "@/components/hydrax/GlassCard";
import { PageHeader } from "@/components/hydrax/PageHeader";
import { StatusPill } from "@/components/hydrax/StatusPill";
import { ValveIcon, WaterFlowIcon } from "@/components/hydrax/WaterFlowIcon";
import { useHydrax } from "@/lib/hydrax-store";
import type { HydraxNode } from "@/lib/hydrax-types";
import { formatDistanceToNowStrict } from "date-fns";

export const Route = createFileRoute("/nodes")({
  head: () => ({
    meta: [
      { title: "Live Nodes · HYDRAX" },
      { name: "description", content: "Live status of every HYDRAX IoT node: flow, valve, threshold, signal and consumption." },
    ],
  }),
  component: NodesPage,
});

function NodesPage() {
  const data = useHydrax();
  const [q, setQ] = useState("");
  const nodes = useMemo(
    () =>
      Object.values(data.nodes).filter((n) =>
        (n.name + n.location + n.id).toLowerCase().includes(q.toLowerCase())
      ),
    [data.nodes, q]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Node telemetry"
        title="Live node monitoring"
        description="Every IoT node reports flow, valve state and threshold in realtime. Expand a card to inspect diagnostics."
        actions={
          <div className="flex items-center gap-2 rounded-full border border-border/50 bg-white/5 px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              placeholder="Search nodes"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-40 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {nodes.map((n) => (
          <NodeCard key={n.id} node={n} />
        ))}
        {nodes.length === 0 && (
          <GlassCard className="md:col-span-2 xl:col-span-3 text-center text-muted-foreground">
            No nodes match "{q}".
          </GlassCard>
        )}
      </div>
    </div>
  );
}

function NodeCard({ node }: { node: HydraxNode }) {
  const [open, setOpen] = useState(false);
  return (
    <GlassCard className="!p-0">
      <div className="p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <WaterFlowIcon active={node.valveState !== "closed" && node.online} size={28} />
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">{node.name}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{node.location}</span>
                </div>
              </div>
            </div>
          </div>
          <StatusPill tone={node.online ? "success" : "danger"} pulse>
            {node.online ? "Online" : "Offline"}
          </StatusPill>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Metric label="Flow" value={`${node.flowRate.toFixed(1)}`} unit="L/m" />
          <Metric label="Threshold" value={`${node.threshold}`} unit="L/m" />
          <Metric label="Today" value={`${node.todayUsage}`} unit="L" />
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-border/40 bg-black/20 p-3">
          <div className="flex items-center gap-3">
            <ValveIcon open={node.valveState !== "closed"} />
            <div>
              <div className="text-xs text-muted-foreground">Valve</div>
              <div className="text-sm font-semibold capitalize">{node.valveState}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Mode</div>
            <div className="text-sm font-semibold capitalize">
              {node.manualOverride ? "Manual" : node.operatingMode}
            </div>
          </div>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-3 flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <span>Diagnostics</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2 pt-2 text-sm">
                <Diag icon={<Signal className="h-3.5 w-3.5" />} label="Signal" value={`${node.signal.toFixed(0)}%`} />
                <Diag icon={<Radio className="h-3.5 w-3.5" />} label="Battery" value={node.battery != null ? `${node.battery}%` : "—"} />
                <Diag icon={<Thermometer className="h-3.5 w-3.5" />} label="Temp" value={node.temperature != null ? `${node.temperature}°C` : "—"} />
                <Diag icon={<Timer className="h-3.5 w-3.5" />} label="Last update" value={formatDistanceToNowStrict(node.lastUpdate, { addSuffix: true })} />
                <Diag label="Weekly" value={`${node.weeklyUsage.toLocaleString()} L`} />
                <Diag label="Monthly" value={`${node.monthlyUsage.toLocaleString()} L`} />
                <Diag label="Leak risk" value={`${(node.leakProbability * 100).toFixed(1)}%`} />
                <Diag label="Manual override" value={node.manualOverride ? "Yes" : "No"} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-black/20 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-base font-semibold tabular-nums">
        {value}
        {unit && <span className="ml-1 text-[10px] text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

function Diag({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-black/15 px-2.5 py-1.5">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}