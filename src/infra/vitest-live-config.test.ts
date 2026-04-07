import { describe, expect, it } from "vitest";
import { BUNDLED_PLUGIN_LIVE_TEST_GLOB } from "../../config/vitest/vitest.bundled-plugin-paths.ts";
import liveConfig from "../../config/vitest/vitest.live.config.ts";

describe("live vitest config", () => {
  it("runs as a standalone config instead of inheriting unit projects", () => {
    expect(liveConfig.test?.projects).toBeUndefined();
  });

  it("keeps live tests on thread workers with the non-isolated runner", () => {
    expect(liveConfig.test?.pool).toBe("threads");
    expect(liveConfig.test?.isolate).toBe(false);
    expect(liveConfig.test?.runner).toBe("./test/non-isolated-runner.ts");
  });

  it("includes live test globs and runtime setup", () => {
    const setupFiles = Array.isArray(liveConfig.test?.setupFiles)
      ? liveConfig.test.setupFiles
      : liveConfig.test?.setupFiles
        ? [liveConfig.test.setupFiles]
        : [];
    expect(liveConfig.test?.include).toEqual([
      "src/**/*.live.test.ts",
      BUNDLED_PLUGIN_LIVE_TEST_GLOB,
    ]);
    expect(setupFiles.some((entry) => entry.endsWith("test/setup-openclaw-runtime.ts"))).toBe(true);
  });
});
