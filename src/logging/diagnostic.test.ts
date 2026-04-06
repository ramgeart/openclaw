import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importFreshModule } from "../../test/helpers/import-fresh.js";
import {
  diagnosticSessionStates,
  getDiagnosticSessionStateCountForTest,
  getDiagnosticSessionState,
  pruneDiagnosticSessionStates,
  resetDiagnosticSessionStateForTest,
} from "./diagnostic-session-state.js";
import {
  diagnosticLogger,
  logSessionStateChange,
  resetDiagnosticStateForTest,
  resolveStuckSessionWarnMs,
  startDiagnosticHeartbeat,
} from "./diagnostic.js";

describe("diagnostic session state pruning", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetDiagnosticSessionStateForTest();
  });

  afterEach(() => {
    resetDiagnosticSessionStateForTest();
    vi.useRealTimers();
  });

  it("evicts stale idle session states", () => {
    getDiagnosticSessionState({ sessionId: "stale-1" });
    expect(getDiagnosticSessionStateCountForTest()).toBe(1);

    vi.advanceTimersByTime(31 * 60 * 1000);
    getDiagnosticSessionState({ sessionId: "fresh-1" });

    expect(getDiagnosticSessionStateCountForTest()).toBe(1);
  });

  it("caps tracked session states to a bounded max", () => {
    const now = Date.now();
    for (let i = 0; i < 2001; i += 1) {
      diagnosticSessionStates.set(`session-${i}`, {
        sessionId: `session-${i}`,
        lastActivity: now + i,
        state: "idle",
        queueDepth: 1,
      });
    }
    pruneDiagnosticSessionStates(now + 2002, true);

    expect(getDiagnosticSessionStateCountForTest()).toBe(2000);
  });

  it("reuses keyed session state when later looked up by sessionId", () => {
    const keyed = getDiagnosticSessionState({
      sessionId: "s1",
      sessionKey: "agent:main:demo-channel:channel:c1",
    });
    const bySessionId = getDiagnosticSessionState({ sessionId: "s1" });

    expect(bySessionId).toBe(keyed);
    expect(bySessionId.sessionKey).toBe("agent:main:demo-channel:channel:c1");
    expect(getDiagnosticSessionStateCountForTest()).toBe(1);
  });
});

describe("logger import side effects", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("does not mkdir at import time", async () => {
    vi.useRealTimers();

    const mkdirSpy = vi.spyOn(fs, "mkdirSync");

    await importFreshModule<typeof import("./logger.js")>(
      import.meta.url,
      "./logger.js?scope=diagnostic-mkdir",
    );

    expect(mkdirSpy).not.toHaveBeenCalled();
  });
});

describe("stuck session diagnostics threshold", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetDiagnosticStateForTest();
  });

  afterEach(() => {
    resetDiagnosticStateForTest();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("uses the configured diagnostics.stuckSessionWarnMs threshold", () => {
    const warnSpy = vi.spyOn(diagnosticLogger, "warn").mockImplementation(() => undefined);
    startDiagnosticHeartbeat({
      diagnostics: {
        enabled: true,
        stuckSessionWarnMs: 30_000,
      },
    });
    logSessionStateChange({ sessionId: "s1", sessionKey: "main", state: "processing" });
    vi.advanceTimersByTime(61_000);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("stuck session:"));
  });

  it("falls back to default threshold when config is absent", () => {
    const warnSpy = vi.spyOn(diagnosticLogger, "warn").mockImplementation(() => undefined);
    startDiagnosticHeartbeat();
    logSessionStateChange({ sessionId: "s2", sessionKey: "main", state: "processing" });
    vi.advanceTimersByTime(31_000);
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining("stuck session:"));
  });

  it("uses default threshold for invalid values", () => {
    expect(resolveStuckSessionWarnMs({ diagnostics: { stuckSessionWarnMs: -1 } })).toBe(120_000);
    expect(resolveStuckSessionWarnMs({ diagnostics: { stuckSessionWarnMs: 0 } })).toBe(120_000);
    expect(resolveStuckSessionWarnMs()).toBe(120_000);
  });
});
