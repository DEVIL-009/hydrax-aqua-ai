/**
 * Firebase Realtime Database wiring for HYDRAX.
 *
 * The dashboard runs in "mock" mode by default so it works out of the box with
 * a single simulated node. Configure real Firebase by setting these env vars
 * (client-safe, publishable):
 *
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_DATABASE_URL
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_APP_ID
 *
 * When present, `getDb()` returns a live Realtime Database instance rooted at
 * `Hydrax/`. When absent, the store falls back to the local simulator.
 */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const firebaseConfigured = Boolean(cfg.apiKey && cfg.databaseURL);

let app: FirebaseApp | null = null;
let db: Database | null = null;

export function getDb(): Database | null {
  if (!firebaseConfigured) return null;
  if (typeof window === "undefined") return null;
  if (!app) {
    app = getApps()[0] ?? initializeApp(cfg as Required<typeof cfg>);
    db = getDatabase(app);
  }
  return db;
}