export type OperatingMode = "auto" | "manual" | "emergency" | "holiday" | "break";
export type ValveState = "open" | "closed" | "partial";
export type AlertSeverity = "critical" | "high" | "medium" | "low" | "info";
export type AlertType =
  | "possible_leak"
  | "continuous_flow"
  | "valve_failure"
  | "communication_failure"
  | "node_offline"
  | "high_usage"
  | "low_usage"
  | "tampering"
  | "ai_prediction";

export interface HydraxNode {
  id: string;
  name: string;
  location: string;
  online: boolean;
  flowRate: number; // L/min
  valveState: ValveState;
  manualOverride: boolean;
  operatingMode: OperatingMode;
  todayUsage: number; // liters
  weeklyUsage: number;
  monthlyUsage: number;
  threshold: number; // L/min
  leakProbability: number; // 0..1
  lastUpdate: number; // epoch ms
  signal: number; // dBm (0..-100 -> 0..100%)
  battery?: number;
  temperature?: number;
}

export interface Thresholds {
  breakTime: number;
  normalTime: number;
  holiday: number;
  specialEvent: number;
  emergency: number;
  custom: number;
}

export interface AlertItem {
  id: string;
  time: number;
  severity: AlertSeverity;
  type: AlertType;
  nodeId: string;
  message: string;
  suggestion: string;
  resolved: boolean;
}

export interface Esp32Status {
  online: boolean;
  aiLearning: boolean;
  predictedPeakHour: number;
  systemHealth: number; // 0..100
  uptimeSec: number;
  lastUpdate: number;
  firmware: string;
  wifi: string;
}

export interface Analytics {
  todayConsumption: number;
  weeklyConsumption: number;
  monthlyConsumption: number;
  averageDaily: number;
  averageHourly: number;
  predictedTomorrow: number;
  predictedWeek: number;
  savingsEstimate: number; // liters saved
  aiConfidence: number; // 0..1
  hourlyToday: { hour: number; liters: number }[];
  weeklyByDay: { day: string; liters: number }[];
  monthlyByWeek: { week: string; liters: number }[];
  forecastNext24h: { hour: number; liters: number }[];
  anomalyScore: { hour: number; score: number }[];
  liveFlow: { t: number; flow: number }[];
}

export interface HydraxSnapshot {
  config: {
    institutionName: string;
    aiEnabled: boolean;
    thresholds: Thresholds;
  };
  esp32: Esp32Status;
  nodes: Record<string, HydraxNode>;
  analytics: Analytics;
  alerts: { active: AlertItem[]; history: AlertItem[] };
}