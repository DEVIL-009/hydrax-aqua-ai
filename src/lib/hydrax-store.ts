/**
 * HYDRAX realtime store.
 *
 * - If Firebase is configured, subscribes to `/Hydrax` and streams live data.
 * - Otherwise runs a client-side simulator so the dashboard is fully alive
 *   with a single "testNode" and realistic AI/analytics values.
 */
import { useEffect, useSyncExternalStore } from "react";
import { firebaseConfigured, getDb } from "./firebase";
import type {
  AlertItem,
  AlertSeverity,
  AlertType,
  Analytics,
  HydraxNode,
  HydraxSnapshot,
  OperatingMode,
  Thresholds,
  ValveState,
} from "./hydrax-types";

function nowHour() {
  return new Date().getHours();
}

function seedNodes(): Record<string, HydraxNode> {
  const t = Date.now();
  const defs: Array<Partial<HydraxNode> & Pick<HydraxNode, "id" | "name" | "location">> = [
    { id: "testNode", name: "Main Supply Line", location: "Central Pump Room", flowRate: 12.4, valveState: "open", operatingMode: "auto", todayUsage: 1840, weeklyUsage: 11250, monthlyUsage: 48210, threshold: 22, leakProbability: 0.08, signal: 82, battery: 96, temperature: 27.4 },
    { id: "blockA", name: "Block A — Washrooms", location: "Academic Block A · Floor 2", flowRate: 6.8, valveState: "open", operatingMode: "auto", todayUsage: 940, weeklyUsage: 6120, monthlyUsage: 25840, threshold: 18, leakProbability: 0.04, signal: 74, battery: 88, temperature: 26.1 },
    { id: "blockB", name: "Block B — Cafeteria", location: "Cafeteria · Ground Floor", flowRate: 18.2, valveState: "open", operatingMode: "auto", todayUsage: 2650, weeklyUsage: 15840, monthlyUsage: 62310, threshold: 30, leakProbability: 0.12, signal: 68, battery: 91, temperature: 28.9 },
    { id: "hostel1", name: "Hostel 1 — Boys", location: "Hostel Complex · North Wing", flowRate: 9.4, valveState: "partial", operatingMode: "break", todayUsage: 3120, weeklyUsage: 21440, monthlyUsage: 89210, threshold: 25, leakProbability: 0.21, signal: 61, battery: 78, temperature: 29.4 },
    { id: "hostel2", name: "Hostel 2 — Girls", location: "Hostel Complex · South Wing", flowRate: 8.1, valveState: "open", operatingMode: "auto", todayUsage: 2840, weeklyUsage: 19820, monthlyUsage: 82140, threshold: 25, leakProbability: 0.06, signal: 72, battery: 84, temperature: 28.2 },
    { id: "labBlock", name: "Science Labs", location: "Research Wing · Floor 1", flowRate: 3.2, valveState: "open", operatingMode: "auto", todayUsage: 410, weeklyUsage: 2810, monthlyUsage: 11040, threshold: 12, leakProbability: 0.03, signal: 89, battery: 94, temperature: 24.6 },
    { id: "garden", name: "Garden Irrigation", location: "Campus Grounds · Zone C", flowRate: 0, valveState: "closed", operatingMode: "holiday", todayUsage: 620, weeklyUsage: 4380, monthlyUsage: 17820, threshold: 40, leakProbability: 0.01, signal: 55, battery: 42, temperature: 31.8 },
    { id: "sportsBlock", name: "Sports Complex", location: "Gymnasium & Pool", flowRate: 14.6, valveState: "open", operatingMode: "auto", todayUsage: 1980, weeklyUsage: 12640, monthlyUsage: 51380, threshold: 28, leakProbability: 0.09, signal: 66, battery: 87, temperature: 27.9 },
    { id: "adminBlock", name: "Admin Block", location: "Administration · Floor 1", flowRate: 2.1, valveState: "open", operatingMode: "auto", todayUsage: 280, weeklyUsage: 1940, monthlyUsage: 8210, threshold: 10, leakProbability: 0.02, signal: 91, battery: 97, temperature: 25.3 },
    { id: "library", name: "Central Library", location: "Library Building", flowRate: 1.4, valveState: "open", operatingMode: "auto", todayUsage: 210, weeklyUsage: 1420, monthlyUsage: 6180, threshold: 8, leakProbability: 0.02, signal: 84, battery: 92, temperature: 24.9 },
    { id: "guestHouse", name: "Guest House", location: "Faculty Residency", flowRate: 4.6, valveState: "open", operatingMode: "auto", todayUsage: 720, weeklyUsage: 4820, monthlyUsage: 19410, threshold: 15, leakProbability: 0.05, signal: 77, battery: 89, temperature: 26.8 },
    { id: "auditorium", name: "Auditorium", location: "Cultural Center", flowRate: 0.6, valveState: "closed", operatingMode: "holiday", todayUsage: 90, weeklyUsage: 640, monthlyUsage: 2810, threshold: 12, leakProbability: 0.01, signal: 58, battery: 71, temperature: 25.1 },
    { id: "workshop", name: "Engineering Workshop", location: "Technical Block", flowRate: 5.3, valveState: "open", operatingMode: "auto", todayUsage: 810, weeklyUsage: 5480, monthlyUsage: 22140, threshold: 16, leakProbability: 0.07, signal: 63, battery: 81, temperature: 29.1, online: true },
    { id: "medicalBay", name: "Medical Bay", location: "Health Center", flowRate: 1.9, valveState: "open", operatingMode: "auto", todayUsage: 260, weeklyUsage: 1810, monthlyUsage: 7620, threshold: 10, leakProbability: 0.02, signal: 86, battery: 95, temperature: 24.4 },
    { id: "kitchen", name: "Mess Kitchen", location: "Hostel Mess · Ground", flowRate: 22.4, valveState: "open", operatingMode: "auto", todayUsage: 3980, weeklyUsage: 26410, monthlyUsage: 108420, threshold: 35, leakProbability: 0.14, signal: 70, battery: 83, temperature: 30.2 },
    { id: "rooftopTank", name: "Rooftop Tank Feed", location: "Overhead Tank · Block C", flowRate: 0, valveState: "closed", operatingMode: "auto", todayUsage: 5820, weeklyUsage: 38210, monthlyUsage: 152840, threshold: 60, leakProbability: 0.03, signal: 49, battery: 38, temperature: 33.6, online: false },
  ];
  const out: Record<string, HydraxNode> = {};
  for (const d of defs) {
    out[d.id] = {
      online: true,
      flowRate: 0,
      valveState: "open",
      manualOverride: false,
      operatingMode: "auto",
      todayUsage: 0,
      weeklyUsage: 0,
      monthlyUsage: 0,
      threshold: 20,
      leakProbability: 0,
      lastUpdate: t,
      signal: 80,
      battery: 90,
      temperature: 26,
      ...d,
    } as HydraxNode;
  }
  return out;
}

function seedAnalytics(): Analytics {
  const hourlyToday = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    liters: Math.round(60 + 220 * Math.exp(-Math.pow((h - 11) / 3.2, 2)) + 80 * Math.exp(-Math.pow((h - 18) / 2.5, 2)) + Math.random() * 25),
  }));
  const weeklyByDay = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => ({
    day: d,
    liters: 1200 + Math.round(600 * Math.sin(i / 1.4) + Math.random() * 300),
  }));
  const monthlyByWeek = ["W1", "W2", "W3", "W4"].map((w, i) => ({
    week: w,
    liters: 9000 + i * 800 + Math.round(Math.random() * 1200),
  }));
  const forecastNext24h = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    liters: Math.round(70 + 210 * Math.exp(-Math.pow((h - 11) / 3, 2)) + 90 * Math.exp(-Math.pow((h - 19) / 2.8, 2))),
  }));
  const anomalyScore = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    score: Math.max(0, Math.min(1, 0.1 + (h === 3 ? 0.7 : 0) + Math.random() * 0.15)),
  }));
  const liveFlow = Array.from({ length: 40 }, (_, i) => ({
    t: Date.now() - (40 - i) * 1500,
    flow: 10 + Math.sin(i / 3) * 3 + Math.random() * 1.5,
  }));
  return {
    todayConsumption: 1840,
    weeklyConsumption: 11250,
    monthlyConsumption: 48210,
    averageDaily: 1608,
    averageHourly: 67,
    predictedTomorrow: 1720,
    predictedWeek: 11800,
    savingsEstimate: 3820,
    aiConfidence: 0.92,
    hourlyToday,
    weeklyByDay,
    monthlyByWeek,
    forecastNext24h,
    anomalyScore,
    liveFlow,
  };
}

function seedAlerts(): { active: AlertItem[]; history: AlertItem[] } {
  const now = Date.now();
  const active: AlertItem[] = [
    {
      id: "a1",
      time: now - 1000 * 60 * 12,
      severity: "high",
      type: "possible_leak",
      nodeId: "hostel1",
      message: "Continuous low flow detected past midnight",
      suggestion: "Inspect pipe segment B-2 for micro leaks",
      resolved: false,
    },
    {
      id: "a2",
      time: now - 1000 * 60 * 48,
      severity: "medium",
      type: "high_usage",
      nodeId: "kitchen",
      message: "Peak flow 32% above weekly average",
      suggestion: "Verify washing-area schedule",
      resolved: false,
    },
    {
      id: "a3",
      time: now - 1000 * 60 * 5,
      severity: "critical",
      type: "node_offline",
      nodeId: "rooftopTank",
      message: "Rooftop Tank Feed node stopped reporting 4m ago",
      suggestion: "Check WiFi mesh and PoE injector on Block C roof",
      resolved: false,
    },
    {
      id: "a4",
      time: now - 1000 * 60 * 90,
      severity: "low",
      type: "ai_prediction",
      nodeId: "blockB",
      message: "AI expects cafeteria demand +18% at 13:00",
      suggestion: "Pre-open Block B valve at 12:45",
      resolved: false,
    },
    {
      id: "a5",
      time: now - 1000 * 60 * 30,
      severity: "medium",
      type: "continuous_flow",
      nodeId: "blockA",
      message: "Tap left open in Block A washroom 2F",
      suggestion: "Dispatch caretaker; auto-close in 5 minutes",
      resolved: false,
    },
  ];
  const history: AlertItem[] = [
    {
      id: "h1",
      time: now - 1000 * 60 * 60 * 20,
      severity: "low",
      type: "ai_prediction",
      nodeId: "testNode",
      message: "AI predicted peak demand at 11:00",
      suggestion: "No action needed",
      resolved: true,
    },
    {
      id: "h2",
      time: now - 1000 * 60 * 60 * 32,
      severity: "high",
      type: "possible_leak",
      nodeId: "garden",
      message: "Overnight irrigation leak auto-shut",
      suggestion: "Valve closed; segment flagged for maintenance",
      resolved: true,
    },
    {
      id: "h3",
      time: now - 1000 * 60 * 60 * 50,
      severity: "medium",
      type: "tampering",
      nodeId: "sportsBlock",
      message: "Manual valve override detected out of hours",
      suggestion: "Reviewed with facilities team",
      resolved: true,
    },
  ];
  return { active, history };
}

function initialSnapshot(): HydraxSnapshot {
  return {
    config: {
      institutionName: "HYDRAX Institute Campus",
      aiEnabled: true,
      thresholds: {
        breakTime: 28,
        normalTime: 22,
        holiday: 10,
        specialEvent: 35,
        emergency: 45,
        custom: 20,
      },
    },
    esp32: {
      online: true,
      aiLearning: true,
      predictedPeakHour: 11,
      systemHealth: 96,
      uptimeSec: 60 * 60 * 42 + 813,
      lastUpdate: Date.now(),
      firmware: "hydrax-esp32 v0.4.2",
      wifi: "HYDRAX-MESH-5G",
    },
    nodes: seedNodes(),
    analytics: seedAnalytics(),
    alerts: seedAlerts(),
  };
}

// -------- Simple pub/sub store --------
let snapshot: HydraxSnapshot = initialSnapshot();
const listeners = new Set<() => void>();
function emit() {
  snapshot = { ...snapshot };
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
function getSnapshot() {
  return snapshot;
}
function getServerSnapshot() {
  return snapshot;
}

// -------- Simulator (used when Firebase not configured) --------
let simTimer: ReturnType<typeof setInterval> | null = null;
function startSimulator() {
  if (simTimer) return;
  simTimer = setInterval(() => {
    const s = snapshot;
    const nextNodes: Record<string, HydraxNode> = {};
    let totalPerTick = 0;
    let totalFlow = 0;
    for (const [id, node] of Object.entries(s.nodes)) {
      if (!node.online) { nextNodes[id] = node; continue; }
      const drift = (Math.random() - 0.5) * Math.max(1, node.flowRate * 0.15);
      const newFlow = Math.max(0, node.valveState === "closed" ? 0 : node.flowRate + drift);
      const perTick = (newFlow / 60) * 3;
      totalPerTick += perTick;
      totalFlow += newFlow;
      nextNodes[id] = {
        ...node,
        flowRate: Number(newFlow.toFixed(2)),
        todayUsage: Math.round(node.todayUsage + perTick),
        lastUpdate: Date.now(),
        signal: Math.max(30, Math.min(100, node.signal + (Math.random() - 0.5) * 3)),
        leakProbability: Math.max(0, Math.min(1, node.leakProbability + (Math.random() - 0.5) * 0.015)),
      };
    }
    const nextLive = [...s.analytics.liveFlow.slice(-59), { t: Date.now(), flow: Number(totalFlow.toFixed(2)) }];
    snapshot = {
      ...s,
      nodes: nextNodes,
      analytics: {
        ...s.analytics,
        todayConsumption: Math.round(s.analytics.todayConsumption + totalPerTick),
        liveFlow: nextLive,
      },
      esp32: { ...s.esp32, uptimeSec: s.esp32.uptimeSec + 3, lastUpdate: Date.now() },
    };
    listeners.forEach((l) => l());
  }, 3000);
}

// -------- Firebase subscription --------
let fbBound = false;
async function bindFirebase() {
  if (fbBound) return;
  const db = getDb();
  if (!db) return;
  fbBound = true;
  const { ref, onValue } = await import("firebase/database");
  onValue(ref(db, "/"), (snap) => {
    const val = snap.val();
    if (!val) return;
    snapshot = { ...snapshot, ...val };
    listeners.forEach((l) => l());
  });
}

let bootstrapped = false;
function ensureStarted() {
  if (bootstrapped) return;
  bootstrapped = true;
  if (firebaseConfigured) bindFirebase();
  else startSimulator();
}

export function useHydrax(): HydraxSnapshot {
  useEffect(() => {
    ensureStarted();
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// -------- Mutations --------
export async function setValve(nodeId: string, state: ValveState) {
  const n = snapshot.nodes[nodeId];
  if (!n) return;
  snapshot.nodes[nodeId] = { ...n, valveState: state, manualOverride: true };
  emit();
  const db = getDb();
  if (db) {
    const { ref, update } = await import("firebase/database");
    await update(ref(db, `/nodes/${nodeId}`), { valveState: state, manualOverride: true });
  }
}

export async function setNodeMode(nodeId: string, mode: OperatingMode) {
  const n = snapshot.nodes[nodeId];
  if (!n) return;
  snapshot.nodes[nodeId] = { ...n, operatingMode: mode, manualOverride: mode === "manual" };
  emit();
  const db = getDb();
  if (db) {
    const { ref, update } = await import("firebase/database");
    await update(ref(db, `/nodes/${nodeId}`), { operatingMode: mode });
  }
}

export async function updateThresholds(next: Thresholds) {
  snapshot.config.thresholds = next;
  emit();
  const db = getDb();
  if (db) {
    const { ref, update } = await import("firebase/database");
    await update(ref(db, `/config/thresholds`), next);
  }
}

export async function resolveAlert(id: string) {
  const found = snapshot.alerts.active.find((a) => a.id === id);
  if (!found) return;
  snapshot.alerts.active = snapshot.alerts.active.filter((a) => a.id !== id);
  snapshot.alerts.history = [{ ...found, resolved: true }, ...snapshot.alerts.history];
  emit();
  const db = getDb();
  if (db) {
    const { ref, remove, set } = await import("firebase/database");
    await remove(ref(db, `/alerts/active/${id}`));
    await set(ref(db, `/alerts/history/${id}`), { ...found, resolved: true });
  }
}

export function updateInstitution(name: string) {
  snapshot.config.institutionName = name;
  emit();
}

export function severityColor(s: AlertSeverity) {
  return {
    critical: "text-destructive",
    high: "text-destructive",
    medium: "text-warning",
    low: "text-info",
    info: "text-muted-foreground",
  }[s];
}

export function alertTypeLabel(t: AlertType) {
  return {
    possible_leak: "Possible Leak",
    continuous_flow: "Continuous Flow",
    valve_failure: "Valve Failure",
    communication_failure: "Communication Failure",
    node_offline: "Node Offline",
    high_usage: "High Usage",
    low_usage: "Low Usage",
    tampering: "Tampering Detected",
    ai_prediction: "AI Prediction",
  }[t];
}

export { nowHour };