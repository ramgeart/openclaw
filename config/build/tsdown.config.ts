import fs from "node:fs";
import path from "node:path";
import { defineConfig, type UserConfig } from "tsdown";
import {
  listBundledPluginBuildEntries,
  listBundledPluginRuntimeDependencies,
} from "../../scripts/lib/bundled-plugin-build-entries.mjs";
import { buildPluginSdkEntrySources } from "../../scripts/lib/plugin-sdk-entries.mjs";

type InputOptionsFactory = Extract<NonNullable<UserConfig["inputOptions"]>, Function>;
type InputOptionsArg = InputOptionsFactory extends (
  options: infer Options,
  format: infer _Format,
  context: infer _Context,
) => infer _Return
  ? Options
  : never;
type InputOptionsReturn = InputOptionsFactory extends (
  options: infer _Options,
  format: infer _Format,
  context: infer _Context,
) => infer Return
  ? Return
  : never;
type OnLogFunction = InputOptionsArg extends { onLog?: infer OnLog } ? NonNullable<OnLog> : never;

const env = {
  NODE_ENV: "production",
};
const repoRoot = process.cwd();

const SUPPRESSED_EVAL_WARNING_PATHS = [
  "@protobufjs/inquire/index.js",
  "bottleneck/lib/IORedisConnection.js",
  "bottleneck/lib/RedisConnection.js",
] as const;

function buildInputOptions(options: InputOptionsArg): InputOptionsReturn {
  if (process.env.OPENCLAW_BUILD_VERBOSE === "1") {
    return undefined;
  }

  const previousOnLog = typeof options.onLog === "function" ? options.onLog : undefined;

  function isSuppressedLog(log: {
    code?: string;
    message?: string;
    id?: string;
    importer?: string;
  }) {
    if (log.code === "PLUGIN_TIMINGS") {
      return true;
    }
    if (log.code !== "EVAL") {
      return false;
    }
    const haystack = [log.message, log.id, log.importer].filter(Boolean).join("\n");
    return SUPPRESSED_EVAL_WARNING_PATHS.some((path) => haystack.includes(path));
  }

  return {
    ...options,
    onLog(...args: Parameters<OnLogFunction>) {
      const [level, log, defaultHandler] = args;
      if (isSuppressedLog(log)) {
        return;
      }
      if (typeof previousOnLog === "function") {
        previousOnLog(level, log, defaultHandler);
        return;
      }
      defaultHandler(level, log);
    },
  };
}

function nodeBuildConfig(config: UserConfig): UserConfig {
  return {
    ...config,
    env,
    fixedExtension: false,
    outDir: path.join(repoRoot, "dist"),
    platform: "node",
    inputOptions: buildInputOptions,
  };
}

function toRepoPath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(repoRoot, filePath);
}

const bundledPluginBuildEntries = Object.fromEntries(
  Object.entries(listBundledPluginBuildEntries()).map(([entry, source]) => [
    entry,
    toRepoPath(source),
  ]),
);
const bundledPluginRuntimeDependencies = listBundledPluginRuntimeDependencies();

function buildBundledHookEntries(): Record<string, string> {
  const hooksRoot = path.join(repoRoot, "src", "hooks", "bundled");
  const entries: Record<string, string> = {};

  if (!fs.existsSync(hooksRoot)) {
    return entries;
  }

  for (const dirent of fs.readdirSync(hooksRoot, { withFileTypes: true })) {
    if (!dirent.isDirectory()) {
      continue;
    }

    const hookName = dirent.name;
    const handlerPath = path.join(hooksRoot, hookName, "handler.ts");
    if (!fs.existsSync(handlerPath)) {
      continue;
    }

    entries[`bundled/${hookName}/handler`] = handlerPath;
  }

  return entries;
}

const bundledHookEntries = buildBundledHookEntries();
const bundledPluginRoot = (pluginId: string) => ["extensions", pluginId].join("/");
const bundledPluginFile = (pluginId: string, relativePath: string) =>
  `${bundledPluginRoot(pluginId)}/${relativePath}`;

function buildCoreDistEntries(): Record<string, string> {
  return {
    index: toRepoPath("src/index.ts"),
    entry: toRepoPath("src/entry.ts"),
    // Ensure this module is bundled as an entry so legacy CLI shims can resolve its exports.
    "cli/daemon-cli": toRepoPath("src/cli/daemon-cli.ts"),
    // Keep long-lived lazy runtime boundaries on stable filenames so rebuilt
    // dist/ trees do not strand already-running gateways on stale hashed chunks.
    "agents/auth-profiles.runtime": toRepoPath("src/agents/auth-profiles.runtime.ts"),
    "agents/model-catalog.runtime": toRepoPath("src/agents/model-catalog.runtime.ts"),
    "agents/models-config.runtime": toRepoPath("src/agents/models-config.runtime.ts"),
    "agents/pi-model-discovery-runtime": toRepoPath("src/agents/pi-model-discovery-runtime.ts"),
    "commands/status.summary.runtime": toRepoPath("src/commands/status.summary.runtime.ts"),
    "plugins/provider-discovery.runtime": toRepoPath("src/plugins/provider-discovery.runtime.ts"),
    "plugins/provider-runtime.runtime": toRepoPath("src/plugins/provider-runtime.runtime.ts"),
    extensionAPI: toRepoPath("src/extensionAPI.ts"),
    "infra/warning-filter": toRepoPath("src/infra/warning-filter.ts"),
    "telegram/audit": toRepoPath(bundledPluginFile("telegram", "src/audit.ts")),
    "telegram/token": toRepoPath(bundledPluginFile("telegram", "src/token.ts")),
    "plugins/build-smoke-entry": toRepoPath("src/plugins/build-smoke-entry.ts"),
    "plugins/runtime/index": toRepoPath("src/plugins/runtime/index.ts"),
    "llm-slug-generator": toRepoPath("src/hooks/llm-slug-generator.ts"),
    "mcp/plugin-tools-serve": toRepoPath("src/mcp/plugin-tools-serve.ts"),
  };
}

const coreDistEntries = buildCoreDistEntries();

function buildUnifiedDistEntries(): Record<string, string> {
  return {
    ...coreDistEntries,
    // Internal compat artifact for the root-alias.cjs lazy loader.
    "plugin-sdk/compat": toRepoPath("src/plugin-sdk/compat.ts"),
    ...Object.fromEntries(
      Object.entries(buildPluginSdkEntrySources()).map(([entry, source]) => [
        `plugin-sdk/${entry}`,
        toRepoPath(source),
      ]),
    ),
    ...bundledPluginBuildEntries,
    ...bundledHookEntries,
  };
}

export default defineConfig([
  nodeBuildConfig({
    // Build core entrypoints, plugin-sdk subpaths, bundled plugin entrypoints,
    // and bundled hooks in one graph so runtime singletons are emitted once.
    entry: buildUnifiedDistEntries(),
    deps: {
      neverBundle: [
        "@lancedb/lancedb",
        "@matrix-org/matrix-sdk-crypto-nodejs",
        "matrix-js-sdk",
        ...bundledPluginRuntimeDependencies,
      ],
    },
  }),
]);
