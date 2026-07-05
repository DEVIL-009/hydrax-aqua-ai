import { createFileRoute } from "@tanstack/react-router";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import { Download } from "lucide-react";
import { GlassCard } from "@/components/hydrax/GlassCard";
import { PageHeader } from "@/components/hydrax/PageHeader";
import { Button } from "@/components/ui/button";
import { useHydrax } from "@/lib/hydrax-store";
import { exportCSV, exportPDF } from "@/lib/export";

export const Route = createFileRoute("/graphs")({
  head: () => ({
    meta: [
      { title: "Water Usage Graphs · HYDRAX" },
      { name: "description", content: "Live, daily, weekly, monthly and comparative water usage graphs across all HYDRAX nodes." },
    ],
  }),
  component: GraphsPage,
});

const tooltip = { contentStyle: { background: "oklch(0.2 0.02 250 / 90%)", border: "1px solid var(--border)", borderRadius: 12 } };
const CH = ["var(--primary)", "var(--accent)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function GraphsPage() {
  const data = useHydrax();
  const a = data.analytics;
  const nodes = Object.values(data.nodes);

  const nodeCompare = nodes.map((n) => ({ name: n.name, today: n.todayUsage, week: n.weeklyUsage / 7 }));
  const pieData = [
    { name: "Washing", value: 420 },
    { name: "Toilets", value: 680 },
    { name: "Kitchen", value: 310 },
    { name: "Garden", value: 210 },
    { name: "Labs", value: 190 },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Charts & reports"
        title="Water usage graphs"
        description="Explore consumption across time, nodes and areas. Export to CSV or print-ready PDF for reports."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => exportCSV("hydrax-hourly.csv", a.hourlyToday)}
            >
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button
              onClick={() =>
                exportPDF("HYDRAX Water Report", [
                  { heading: "Today", lines: [`Consumption: ${a.todayConsumption} L`, `Avg hourly: ${a.averageHourly} L`] },
                  { heading: "Predictions", lines: [`Tomorrow: ${a.predictedTomorrow} L`, `Next week: ${a.predictedWeek} L`, `Confidence: ${(a.aiConfidence * 100).toFixed(0)}%`] },
                  { heading: "Savings", lines: [`Estimated savings: ${a.savingsEstimate} L`] },
                ])
              }
            >
              <Download className="mr-2 h-4 w-4" /> PDF
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Live flow">
          <AreaChart data={a.liveFlow}>
            <defs>
              <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.7} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" })} stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} minTickGap={40} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} width={30} />
            <Tooltip {...tooltip} />
            <Area type="monotone" dataKey="flow" stroke="var(--primary)" fill="url(#g1)" strokeWidth={2} />
          </AreaChart>
        </ChartCard>

        <ChartCard title="Hourly today">
          <BarChart data={a.hourlyToday}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} width={30} />
            <Tooltip {...tooltip} />
            <Bar dataKey="liters" fill="var(--accent)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Weekly consumption">
          <BarChart data={a.weeklyByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} width={40} />
            <Tooltip {...tooltip} />
            <Bar dataKey="liters" radius={[6, 6, 0, 0]}>
              {a.weeklyByDay.map((_, i) => (
                <Cell key={i} fill={CH[i % CH.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Monthly trend">
          <LineChart data={a.monthlyByWeek}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} width={40} />
            <Tooltip {...tooltip} />
            <Line type="monotone" dataKey="liters" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--primary)" }} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Node comparison">
          <BarChart data={nodeCompare}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} width={40} />
            <Tooltip {...tooltip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="today" name="Today L" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="week" name="Daily avg L" fill="var(--accent)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Area breakdown">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={4}>
              {pieData.map((_, i) => (
                <Cell key={i} fill={CH[i % CH.length]} stroke="oklch(0.2 0.02 250)" />
              ))}
            </Pie>
            <Tooltip {...tooltip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ChartCard>

        <ChartCard title="24h forecast">
          <AreaChart data={a.forecastNext24h}>
            <defs>
              <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} axisLine={false} tickLine={false} width={30} />
            <Tooltip {...tooltip} />
            <Area type="monotone" dataKey="liters" stroke="var(--accent)" strokeWidth={2} fill="url(#g2)" />
          </AreaChart>
        </ChartCard>

        <ChartCard title="Anomaly score">
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
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <GlassCard>
      <div className="mb-2 text-sm font-semibold text-muted-foreground">{title}</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}