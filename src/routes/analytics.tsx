import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Brain, Sparkles, TrendingUp } from "lucide-react";
import { GlassCard } from "@/components/hydrax/GlassCard";
import { PageHeader } from "@/components/hydrax/PageHeader";
import { StatusPill } from "@/components/hydrax/StatusPill";
import { useHydrax } from "@/lib/hydrax-store";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "AI Analytics · HYDRAX" },
      { name: "description", content: "AI-powered water usage analytics: patterns, predictions, leak probability and savings estimates." },
    ],
  }),
  component: AnalyticsPage,
});

const tooltip = {
  contentStyle: { background: "oklch(0.2 0.02 250 / 90%)", border: "1px solid var(--border)", borderRadius: 12 },
  labelStyle: { color: "var(--muted-foreground)" },
};

function AnalyticsPage() {
  const data = useHydrax();
  const a = data.analytics;
  const peakHour = a.hourlyToday.reduce((m, h) => (h.liters > m.liters ? h : m), a.hourlyToday[0]);

  const kpis = [
    { label: "Avg daily", value: `${a.averageDaily.toLocaleString()} L` },
    { label: "Avg hourly", value: `${a.averageHourly} L` },
    { label: "Peak hour", value: `${peakHour.hour}:00` },
    { label: "Predicted peak", value: `${data.esp32.predictedPeakHour}:00` },
    { label: "Leak probability", value: `${((Math.max(...Object.values(data.nodes).map((n) => n.leakProbability))) * 100).toFixed(1)}%` },
    { label: "Est. savings", value: `${a.savingsEstimate.toLocaleString()} L` },
    { label: "AI confidence", value: `${(a.aiConfidence * 100).toFixed(0)}%` },
    { label: "Trend", value: a.todayConsumption > a.averageDaily ? "▲ Above avg" : "▼ Below avg" },
  ];

  const maxHourly = Math.max(...a.hourlyToday.map((h) => h.liters));

  return (
    <div>
      <PageHeader
        eyebrow="AI intelligence"
        title="Predictive water analytics"
        description="Edge AI on the ESP32 learns campus water patterns and forecasts demand, anomalies and leaks."
        actions={
          <>
            <StatusPill tone="info" pulse>
              <Brain className="mr-1 h-3 w-3" /> Model live
            </StatusPill>
            <StatusPill tone="success">
              <Sparkles className="mr-1 h-3 w-3" /> {(a.aiConfidence * 100).toFixed(0)}% confidence
            </StatusPill>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <GlassCard key={k.label} className="!p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{k.value}</div>
          </GlassCard>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-lg font-semibold">24h forecast</div>
            <StatusPill tone="info">Next 24h</StatusPill>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={a.forecastNext24h.map((f, i) => ({ ...f, actual: a.hourlyToday[i]?.liters }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} width={30} />
                <Tooltip {...tooltip} />
                <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
                <Line type="monotone" dataKey="actual" name="Actual" stroke="var(--accent)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="liters" name="Forecast" stroke="var(--primary)" strokeWidth={2} strokeDasharray="6 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="mb-2 text-lg font-semibold">Hourly heatmap</div>
          <div className="grid grid-cols-6 gap-1.5">
            {a.hourlyToday.map((h) => {
              const p = h.liters / maxHourly;
              return (
                <div
                  key={h.hour}
                  className="grid aspect-square place-items-center rounded-md text-[10px] font-medium"
                  style={{
                    background: `oklch(0.78 ${0.05 + 0.15 * p} 210 / ${0.15 + 0.75 * p})`,
                    color: p > 0.5 ? "oklch(0.15 0.02 250)" : "var(--foreground)",
                  }}
                  title={`${h.hour}:00 · ${h.liters} L`}
                >
                  {h.hour}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Low</span>
            <div className="mx-2 h-1.5 flex-1 rounded-full" style={{ background: "linear-gradient(90deg, oklch(0.78 0.05 210/.2), oklch(0.78 0.2 210))" }} />
            <span>High</span>
          </div>
        </GlassCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassCard>
          <div className="mb-2 text-lg font-semibold">Weekly comparison</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={a.weeklyByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} width={30} />
                <Tooltip {...tooltip} />
                <Bar dataKey="liters" radius={[8, 8, 0, 0]}>
                  {a.weeklyByDay.map((_, i) => (
                    <Cell key={i} fill={`oklch(0.78 0.16 ${190 + i * 8})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-lg font-semibold">Anomaly detection</div>
            <StatusPill tone="warning">
              <TrendingUp className="mr-1 h-3 w-3" /> 1 anomaly today
            </StatusPill>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={a.anomalyScore}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} width={30} domain={[0, 1]} />
                <Tooltip {...tooltip} />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {a.anomalyScore.map((r, i) => (
                    <Cell key={i} fill={r.score > 0.5 ? "var(--destructive)" : "var(--primary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <div className="mt-4">
        <GlassCard>
          <div className="mb-2 text-lg font-semibold">Monthly trend</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={a.monthlyByWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} width={40} />
                <Tooltip {...tooltip} />
                <Line type="monotone" dataKey="liters" stroke="var(--accent)" strokeWidth={2.5} dot={{ fill: "var(--accent)", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}