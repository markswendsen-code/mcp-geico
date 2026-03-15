import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface SessionInfo {
  isLoggedIn: boolean;
  email?: string;
  customerId?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
  lastUpdated?: number;
}

export function getConfigDir(): string {
  return join(homedir(), ".strider", "geico");
}

function getSessionPath(): string {
  return join(getConfigDir(), "session.json");
}

export function saveSession(info: SessionInfo): void {
  const dir = getConfigDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(getSessionPath(), JSON.stringify({ ...info, lastUpdated: Date.now() }, null, 2));
}

export function loadSession(): SessionInfo {
  const path = getSessionPath();
  if (!existsSync(path)) {
    return { isLoggedIn: false };
  }
  try {
    const data = JSON.parse(readFileSync(path, "utf-8")) as SessionInfo;
    // Treat token as expired if past expiry
    if (data.tokenExpiry && Date.now() > data.tokenExpiry) {
      return { isLoggedIn: false };
    }
    return data;
  } catch {
    return { isLoggedIn: false };
  }
}

export function clearSession(): void {
  const path = getSessionPath();
  if (existsSync(path)) {
    rmSync(path);
  }
}

export function hasValidSession(): boolean {
  const session = loadSession();
  return session.isLoggedIn && !!session.accessToken;
}
