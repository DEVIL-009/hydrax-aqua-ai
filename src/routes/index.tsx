import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Brain,
  Cpu,
  Droplets,
  Gauge as GaugeIcon,
  Sparkles,
  Timer,
  TrendingDown,
  TrendingUp,
  Waves,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GlassCard } from "@/components/hydrax/GlassCard";
import { CircularGauge } from "@/components/hydrax/CircularGauge";
import { StatusPill } from "@/components/hydrax/StatusPill";
import { PageHeader } from "@/components/hydrax/PageHeader";
import { WaterFlowIcon, ValveIcon } from "@/components/hydrax/WaterFlowIcon";
import { useHydrax } from "@/lib/hydrax-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview · HYDRAX Dashboard" },
      { name: "description", content: "Realtime overview of water flow, valve status, AI predictions and consumption across HYDRAX IoT nodes." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const data = useHydrax();
  const nodes = Object.values(data.nodes);
  const totalFlow = nodes.reduce((s, n) => s + n.flowRate, 0);
  const activeNodes = nodes.filter((n) => n.online).length;
  const primaryNode = nodes[0];
  const leakRisk = Math.max(...nodes.map((n) => n.leakProbability), 0);

  const stats = [
    {
      label: "Current Flow",
      value: `${totalFlow.toFixed(1)}`,
      unit: "L/min",
      icon: Waves,
      accent: "from-primary/30 to-accent/20",
    },
    {
      label: "Today's Usage",
      value: data.analytics.todayConsumption.toLocaleString(),
      unit: "L",
      icon: Droplets,
      accent: "from-accent/30 to-primary/20",
      delta: `${(((data.analytics.todayConsumption - data.analytics.averageDaily) / data.analytics.averageDaily) * 100).toFixed(1)}%`,
      trend: data.analytics.todayConsumption > data.analytics.averageDaily ? "up" : "down",
    },
    {
      label: "Active Nodes",
      value: `${activeNodes}`,
      unit: `/ ${nodes.length}`,
      icon: Cpu,
      accent: "from-emerald-400/20 to-primary/10",
    },
    {
      label: "AI Confidence",
      value: (data.analytics.aiConfidence * 100).toFixed(0),
      unit: "%",
      icon: Brain,
      accent: "from-fuchsia-400/20 to-primary/10",
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="System overview"
        title="Realtime water intelligence"
        description="Live flow, valve state, and AI predictions synchronised across every node on the campus."
        actions={
          <>
            <StatusPill tone={data.esp32.online ? "success" : "danger"} pulse>
              ESP32 {data.esp32.online ? "Live" : "Offline"}
            </StatusPill>
            <StatusPill tone="info" pulse>
              Predicted peak {data.esp32.predictedPeakHour}:00
            </StatusPill>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <GlassCard key={s.label} transition={{ delay: i * 0.05, duration: 0.4 }}>
            <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} opacity-40`} />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tabular-nums text-foreground">{s.value}</span>
                  <span className="text-sm text-muted-foreground">{s.unit}</span>
                </div>
                {s.delta && (
                  <div className={`mt-1 inline-flex items-center gap-1 text-xs ${s.trend === "up" ? "text-warning" : "text-[color:var(--success)]"}`}>
                    {s.trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {s.delta} vs avg
                  </div>
                )}
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/5 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Live flow chart */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Live flow</div>
              <div className="text-lg font-semibold">Streaming from ESP32 · {primaryNode?.name}</div>
            </div>
            <StatusPill tone="info" pulse>
              {totalFlow.toFixed(1)} L/min
            </StatusPill>
          </div>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.analytics.liveFlow}>
                <defs>
                  <linearGradient id="flowGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" })} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} minTickGap={40} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.2 0.02 250 / 90%)", border: "1px solid var(--border)", borderRadius: 12 }}
                  labelFormatter={(t) => new Date(Number(t)).toLocaleTimeString()}
                  formatter={(v) => [`${Number(v).toFixed(2)} L/min`, "Flow"]}
                />
                <Area type="monotone" dataKey="flow" stroke="var(--primary)" strokeWidth={2} fill="url(#flowGrad)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Valve + gauge */}
        <GlassCard>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Primary valve</div>
          <div className="mt-1 text-lg font-semibold">{primaryNode?.name}</div>
          <div className="mt-4 flex items-center gap-4">
            <ValveIcon open={primaryNode?.valveState !== "closed"} size={56} />
            <div>
              <div className="text-2xl font-bold capitalize">{primaryNode?.valveState}</div>
              <div className="text-xs text-muted-foreground">Mode: {primaryNode?.operatingMode}</div>
            </div>
          </div>
          <div className="mt-4 flex flex-col items-center">
            <CircularGauge value={primaryNode?.flowRate ?? 0} max={primaryNode?.threshold ?? 30} unit="L/m" label="Flow / Threshold" />
          </div>
        </GlassCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <GaugeIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Current threshold</div>
              <div className="text-lg font-semibold">{data.config.thresholds.normalTime} L/min · Normal</div>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Break" value={`${data.config.thresholds.breakTime} L/m`} />
            <Row label="Holiday" value={`${data.config.thresholds.holiday} L/m`} />
            <Row label="Emergency" value={`${data.config.thresholds.emergency} L/m`} />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Leak risk</div>
              <div className="text-lg font-semibold">{(leakRisk * 100).toFixed(1)}% probability</div>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${leakRisk * 100}%` }}
              transition={{ duration: 0.8 }}
              className="h-full rounded-full bg-gradient-to-r from-primary to-destructive"
            />
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            AI cross-checks flow, time-of-day and threshold to score leak likelihood.
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-fuchsia-400/15 text-fuchsia-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Predicted usage</div>
              <div className="text-lg font-semibold">{data.analytics.predictedTomorrow.toLocaleString()} L tomorrow</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-black/20 p-3">
              <div className="text-xs text-muted-foreground">Next 7d</div>
              <div className="text-base font-semibold">{data.analytics.predictedWeek.toLocaleString()} L</div>
            </div>
            <div className="rounded-lg bg-black/20 p-3">
              <div className="text-xs text-muted-foreground">Est. savings</div>
              <div className="text-base font-semibold text-[color:var(--success)]">{data.analytics.savingsEstimate.toLocaleString()} L</div>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Hourly usage today</div>
            <StatusPill tone="muted">Auto-refresh</StatusPill>
          </div>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.analytics.hourlyToday}>
                <defs>
                  <linearGradient id="hrGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ background: "oklch(0.2 0.02 250 / 90%)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="liters" stroke="var(--accent)" strokeWidth={2} fill="url(#hrGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <WaterFlowIcon />
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Operating mode</div>
              <div className="text-lg font-semibold capitalize">{primaryNode?.operatingMode}</div>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <Row label={<span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> System health</span>} value={`${data.esp32.systemHealth}%`} />
            <Row label={<span className="flex items-center gap-1.5"><Timer className="h-3.5 w-3.5" /> Uptime</span>} value={formatUptime(data.esp32.uptimeSec)} />
            <Row label="Firmware" value={data.esp32.firmware} />
            <Row label="WiFi" value={data.esp32.wifi} />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-black/15 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function formatUptime(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}
