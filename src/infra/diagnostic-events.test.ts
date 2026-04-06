import { describe, expect, it, vi } from "vitest";
import {
  emitDiagnosticEvent,
  isDiagnosticsEnabled,
  onDiagnosticEvent,
  resetDiagnosticEventsForTest,
} from "./diagnostic-events.js";

describe("diagnostic-events", () => {
  it("keeps listener registration inert", () => {
    const listener = vi.fn();
    const stop = onDiagnosticEvent(listener);
    emitDiagnosticEvent({
      type: "model.usage",
      usage: { total: 1 },
    });
    stop();
    resetDiagnosticEventsForTest();
    emitDiagnosticEvent({
      type: "session.state",
      state: "processing",
    });
    expect(listener).not.toHaveBeenCalled();
  });

  it("requires an explicit true diagnostics flag", () => {
    expect(isDiagnosticsEnabled()).toBe(false);
    expect(isDiagnosticsEnabled({ diagnostics: { enabled: false } } as never)).toBe(false);
    expect(isDiagnosticsEnabled({ diagnostics: { enabled: true } } as never)).toBe(true);
  });
});
