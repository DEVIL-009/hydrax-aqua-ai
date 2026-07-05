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
  return {
    testNode: {
      id: "testNode",
      name: "Main Supply Line",
      location: "Central Pump Room",
      online: true,
      flowRate: 12.4,
      valveState: "open",
      manualOverride: false,
      operatingMode: "auto",
      todayUsage: 1840,
      weeklyUsage: 11250,
      monthlyUsage: 48210,
      threshold: 22,
      leakProbability: 0.08,
      lastUpdate: t,
      signal: 82,
      battery: 96,
      temperature: 27.4,
    },
  };
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
      nodeId: "testNode",
      message: "Continuous low flow detected past midnight",
      suggestion: "Inspect pipe segment B-2 for micro leaks",
      resolved: false,
    },
    {
      id: "a2",
      time: now - 1000 * 60 * 48,
      severity: "medium",
      type: "high_usage",
      nodeId: "testNode",
      message: "Peak flow 32% above weekly average",
      suggestion: "Verify washing-area schedule",
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
    const node = s.nodes.testNode;
    if (!node) return;
    const drift = (Math.random() - 0.5) * 2.5;
    const newFlow = Math.max(0, node.valveState === "closed" ? 0 : node.flowRate + drift);
    const perTick = (newFlow / 60) * 3; // 3s tick, L/min -> L
    const nextLive = [...s.analytics.liveFlow.slice(-59), { t: Date.now(), flow: Number(newFlow.toFixed(2)) }];
    snapshot = {
      ...s,
      nodes: {
        ...s.nodes,
        testNode: {
          ...node,
          flowRate: Number(newFlow.toFixed(2)),
          todayUsage: Math.round(node.todayUsage + perTick),
          lastUpdate: Date.now(),
          signal: Math.max(30, Math.min(100, node.signal + (Math.random() - 0.5) * 4)),
          leakProbability: Math.max(0, Math.min(1, node.leakProbability + (Math.random() - 0.5) * 0.02)),
        },
      },
      analytics: {
        ...s.analytics,
        todayConsumption: Math.round(s.analytics.todayConsumption + perTick),
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