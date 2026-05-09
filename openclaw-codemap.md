# OpenClaw Personal AI Assistant - Full System Codemap

OpenClaw is a multi-platform personal AI assistant with a WebSocket Gateway control plane that routes messages from 20+ channels through a plugin-extensible architecture to Pi-based agent execution. Key entry points: Gateway startup [1b], inbound message routing [2c], agent execution [3c], plugin loading [4c], and reply dispatch [6b].

## Trace 1: Gateway Startup & WebSocket Client Handshake

**Description**: Gateway control plane initialization and WebSocket client connection flow. Shows how the single long-lived Gateway server starts and authenticates clients.

```
OpenClaw Gateway Startup & Client Connection
├── CLI Entry Point
│   └── runMainOrRootHelp() <-- 1a
│       └── import cli/run-main.js <-- entry.ts:204
│           └── runCli() <-- run-main.ts:129
│               └── buildProgram() <-- run-main.ts:186
│                   └── Gateway command handler
│                       └── Gateway Server Init <-- 1b
│                           ├── startGatewaySidecars() <-- 1c
│                           │   ├── Start channels
│                           │   ├── Start cron service
│                           │   └── Start discovery
│                           └── attachGatewayWsHandlers() <-- 1d
│                               ├── WebSocket connection
│                               │   ├── connect.challenge event
│                               │   ├── Client connect request
│                               │   └── resolveGatewayAuth() <-- 1e
│                               │       └── Validate token/password
│                               └── listGatewayMethods() <-- 1f
│                                   └── Return hello-ok response
```

**Location 1a**: CLI Entry Point - `/home/debian/sources/openclaw/src/entry.ts:154`
**Description**: Main entry point that routes to CLI command execution or gateway startup

**Location 1b**: Gateway Server Implementation - `/home/debian/sources/openclaw/src/gateway/server.impl.ts:4`
**Description**: Core gateway server that manages all messaging surfaces and control plane

**Location 1c**: Gateway Startup Orchestration - `/home/debian/sources/openclaw/src/gateway/server-startup.ts:1`
**Description**: Coordinates gateway service initialization including channels, cron, and discovery

**Location 1d**: WebSocket Runtime Attachment - `/home/debian/sources/openclaw/src/gateway/server-ws-runtime.ts:1`
**Description**: Attaches WebSocket handlers for client connections and protocol framing

**Location 1e**: Gateway Authentication - `/home/debian/sources/openclaw/src/gateway/auth.ts:1`
**Description**: Validates client authentication via token, password, or Tailscale identity

**Location 1f**: Gateway Method Registry - `/home/debian/sources/openclaw/src/gateway/server-methods-list.ts:122`
**Description**: Enumerates all available WebSocket RPC methods for client discovery

## Trace 2: Inbound Message Routing & Session Resolution

**Description**: Message flow from channel receipt through routing to session/agent targeting. Demonstrates how messages from WhatsApp, Telegram, etc. are routed to the correct agent session.

```
Inbound Message Flow (Trace 2)
├── Channel Plugin receives message <-- 2a
│   └── ChannelPlugin interface contract <-- types.plugin.ts:83
├── Auto-reply inbound processor <-- 2b
│   ├── Debouncing & media handling <-- inbound-debounce.ts:1
│   ├── Command detection <-- command-detection.ts:1
│   └── Calls routing layer
├── Route resolution <-- 2c
│   ├── Resolve agent/session from bindings <-- bindings.ts:1
│   ├── Check allowlists <-- allowlist-match.ts:1
│   └── Calls session key derivation
├── Session key derivation <-- 2d
│   ├── Derives from channel ID <-- session-key.ts:1
│   ├── Derives from account ID <-- account-id.ts:1
│   └── Derives from conversation ID <-- conversation-label.ts:1
├── Auto-reply dispatcher <-- 2e
│   ├── Dispatches to agent execution <-- dispatch.ts:1
│   └── Or dispatches to command handlers <-- command-auth.ts:1
└── Agent command invocation <-- 2f
    ├── Loads session state <-- session-utils.ts:1
    ├── Applies configuration <-- agent-scope.ts:1
    └── Invokes Pi agent runner <-- run.ts:104
```

**Location 2a**: Channel Plugin Contract - `/home/debian/sources/openclaw/src/channels/plugins/types.plugin.ts:83`
**Description**: Defines the interface that all messaging channel plugins implement

**Location 2b**: Inbound Message Handler - `/home/debian/sources/openclaw/src/auto-reply/inbound.test.ts:1`
**Description**: Processes incoming messages with debouncing, media handling, and command detection

**Location 2c**: Message Route Resolution - `/home/debian/sources/openclaw/src/routing/resolve-route.ts:1`
**Description**: Resolves inbound messages to target agent/session based on bindings and allowlists

**Location 2d**: Session Key Derivation - `/home/debian/sources/openclaw/src/routing/session-key.ts:1`
**Description**: Derives session keys from channel, account, and conversation identifiers

**Location 2e**: Auto-Reply Dispatcher - `/home/debian/sources/openclaw/src/auto-reply/dispatch.ts:1`
**Description**: Dispatches resolved messages to agent execution or command handlers

**Location 2f**: Agent Command Invocation - `/home/debian/sources/openclaw/src/agents/agent-command.ts:1`
**Description**: Invokes agent with message context, session state, and configuration

## Trace 3: Pi Agent Execution & Model Inference Loop

**Description**: Core agent execution flow from invocation through model provider streaming to tool execution. Shows the heart of the AI assistant's processing pipeline.

```
Pi Agent Execution & Model Inference Loop
├── Agent Command Entry <-- 3a
│   └── runEmbeddedPiAgent() invocation <-- 3b
│       ├── Session lane queueing <-- run.ts:107
│       ├── Workspace & config resolution <-- run.ts:146
│       └── Retry loop with failover <-- run.ts:145
│           ├── runEmbeddedAttempt() <-- 3c
│           │   ├── Model selection & auth <-- setup.ts:1
│           │   ├── Build request payloads <-- payloads.ts:1
│           │   └── Provider transport stream <-- 3d
│           │       └── subscribeEmbeddedPiSession() <-- 3e
│           │           ├── Stream text blocks <-- pi-embedded-subscribe.handlers.messages.ts:1
│           │           ├── Handle tool calls <-- 3g
│           │           │   └── Execute bash tools <-- 3f
│           │           └── Process completion <-- pi-embedded-subscribe.ts:1
│           └── Handle failover & retry <-- assistant-failover.ts:1
└── Return final result with usage <-- run.ts:150
```

**Location 3a**: Agent Command Entry - `/home/debian/sources/openclaw/src/agents/agent-command.ts:1`
**Description**: Entry point for agent execution with message and session context

**Location 3b**: Pi Agent Runner - `/home/debian/sources/openclaw/src/agents/pi-embedded-runner/run.ts:104`
**Description**: Main agent execution loop with retry, failover, and model selection

**Location 3c**: Single Execution Attempt - `/home/debian/sources/openclaw/src/agents/pi-embedded-runner/run/attempt.ts:1`
**Description**: Executes one attempt with model provider, handling streaming and tools

**Location 3d**: Model Provider Transport - `/home/debian/sources/openclaw/src/agents/openai-transport-stream.ts:1`
**Description**: Streams responses from OpenAI-compatible model providers

**Location 3e**: Agent Event Subscription - `/home/debian/sources/openclaw/src/agents/pi-embedded-subscribe.ts:1`
**Description**: Subscribes to agent events for streaming text, tool calls, and completion

**Location 3f**: Tool Execution Handler - `/home/debian/sources/openclaw/src/agents/bash-tools.exec.ts:1`
**Description**: Executes bash commands and other agent tools with approval and sandboxing

**Location 3g**: Tool Call Processing - `/home/debian/sources/openclaw/src/agents/pi-embedded-subscribe.handlers.tools.ts:1`
**Description**: Processes tool calls from model, executes tools, and returns results

## Trace 4: Plugin Discovery, Loading & Capability Registration

**Description**: Plugin system architecture showing how bundled and third-party plugins are discovered, loaded, and registered. Core to OpenClaw's extensibility model.

```
Plugin System Architecture
├── Plugin Discovery <-- 4a
│   ├── Scan bundled extensions/ <-- discovery.ts:1
│   ├── Scan workspace plugins <-- discovery.ts:1
│   └── Scan global plugin paths <-- discovery.ts:1
│       └── Read openclaw.plugin.json <-- 4b
├── Plugin Loading Pipeline
│   ├── Manifest validation <-- manifest.ts:1
│   ├── Load plugin module via jiti <-- 4c
│   └── Invoke plugin.register(api) <-- loader.ts:1
│       └── Build plugin API object <-- 4d
│           ├── api.registerProvider() <-- api-builder.ts:1
│           ├── api.registerChannel() <-- api-builder.ts:1
│           ├── api.registerTool() <-- api-builder.ts:1
│           └── api.registerHook() <-- api-builder.ts:1
└── Plugin Registry <-- 4e
    ├── Store providers by capability <-- registry.ts:132
    ├── Store channels by id <-- registry.ts:115
    ├── Store tools by name <-- registry.ts:86
    └── Expose runtime access <-- 4f
```

**Location 4a**: Plugin Discovery - `/home/debian/sources/openclaw/src/plugins/discovery.ts:1`
**Description**: Discovers plugins from bundled extensions, workspace, and global paths

**Location 4b**: Manifest Parsing - `/home/debian/sources/openclaw/src/plugins/manifest.ts:1`
**Description**: Parses openclaw.plugin.json manifests for metadata and contracts

**Location 4c**: Plugin Runtime Loading - `/home/debian/sources/openclaw/src/plugins/loader.ts:1`
**Description**: Loads plugin modules via jiti and invokes register() function

**Location 4d**: Plugin API Construction - `/home/debian/sources/openclaw/src/plugins/api-builder.ts:1`
**Description**: Builds the api object passed to plugin register() with registration methods

**Location 4e**: Plugin Registry - `/home/debian/sources/openclaw/src/plugins/registry.ts:1`
**Description**: Central registry storing all registered plugins, providers, channels, and tools

**Location 4f**: Plugin Runtime Types - `/home/debian/sources/openclaw/src/plugins/runtime/types.ts:1`
**Description**: Type definitions for plugin runtime access to core services

## Trace 5: Channel Plugin Registration & Message Handling

**Description**: How messaging channel plugins (Telegram, WhatsApp, Discord, etc.) register and handle inbound/outbound messages through the plugin system.

```
Channel Plugin System
├── Plugin Registration Flow
│   ├── Telegram channel plugin entry <-- 5a
│   │   └── implements ChannelPlugin contract <-- types.plugin.ts:83
│   │       └── register via api.registerChannel()
│   ├── Channel plugin registry <-- 5b
│   │   ├── stores all channel plugins
│   │   └── provides lookup/enumeration <-- index.ts:1
│   └── Gateway integration
│       └── Channel manager <-- 5c
│           ├── initializes channels at startup
│           ├── monitors channel health <-- server.impl.ts:84
│           └── routes messages to/from channels
├── Channel Lifecycle
│   └── Startup maintenance <-- 5d
│       ├── restores channel sessions
│       ├── reconnects to services
│       └── validates credentials
└── Message Delivery Features
    └── Typing indicator management <-- 5e
        ├── starts typing on message receipt
        ├── maintains typing during processing
        └── stops typing on reply sent
```

**Location 5a**: Telegram Channel Plugin - `/home/debian/sources/openclaw/extensions/telegram/src/channel.ts:1`
**Description**: Example channel plugin implementing the ChannelPlugin contract

**Location 5b**: Channel Plugin Registry - `/home/debian/sources/openclaw/src/channels/plugins/registry.ts:1`
**Description**: Registry of all registered channel plugins with lookup and enumeration

**Location 5c**: Channel Manager - `/home/debian/sources/openclaw/src/gateway/server-channels.ts:1`
**Description**: Manages channel lifecycle, startup, monitoring, and message routing

**Location 5d**: Channel Startup Maintenance - `/home/debian/sources/openclaw/src/channels/plugins/lifecycle-startup.ts:1`
**Description**: Runs channel-specific startup tasks like session restoration

**Location 5e**: Typing Indicator Management - `/home/debian/sources/openclaw/src/channels/typing.ts:1`
**Description**: Manages typing indicators for natural conversation flow

## Trace 6: Outbound Reply Dispatch & Channel Delivery

**Description**: How agent responses flow from generation through dispatch to channel-specific delivery with typing indicators and chunking.

```
Outbound Reply Flow (Trace 6)
├── Agent Message Stream
│   └── pi-embedded-subscribe handlers <-- 6a
│       └── onBlockReply / onFinalReply events
│           └── createReplyDispatcher() <-- 6b
│               ├── normalizeReplyPayload() <-- 6c
│               │   ├── Apply response prefix
│               │   ├── Transform payload
│               │   └── Strip heartbeat markers
│               ├── enqueue(kind, payload) <-- reply-dispatcher.ts:142
│               │   ├── Human delay calculation <-- reply-dispatcher.ts:29
│               │   └── sendChain serialization <-- reply-dispatcher.ts:116
│               └── deliver(payload, info) <-- 6d
│                   ├── chunk.ts chunking <-- 6e
│                   │   └── Split by channel limits <-- chunk.ts:1
│                   ├── Channel-specific delivery
│                   │   ├── Telegram sendMessage
│                   │   ├── WhatsApp sendText
│                   │   └── Discord channel.send
│                   └── updateStatusReaction() <-- 6f
│                       └── Set ✓ / ⏳ / ❌ reactions <-- status-reactions.ts:1
└── Typing Indicator Controller
    ├── onReplyStart() <-- reply-dispatcher.ts:64
    ├── Periodic typing signals <-- typing.ts:1
    └── onCleanup() <-- reply-dispatcher.ts:67
```

**Location 6a**: Message Event Handler - `/home/debian/sources/openclaw/src/agents/pi-embedded-subscribe.handlers.messages.ts:1`
**Description**: Handles streaming message events from agent for reply dispatch

**Location 6b**: Reply Dispatcher Creation - `/home/debian/sources/openclaw/src/auto-reply/reply/reply-dispatcher.ts:115`
**Description**: Creates dispatcher that queues and delivers tool results, blocks, and final replies

**Location 6c**: Reply Normalization - `/home/debian/sources/openclaw/src/auto-reply/reply/normalize-reply.ts:1`
**Description**: Normalizes reply payloads with prefix templates and transformations

**Location 6d**: Channel Reply Delivery - `/home/debian/sources/openclaw/src/auto-reply/reply/directives.ts:1`
**Description**: Delivers replies to specific channels with chunking and rate limiting

**Location 6e**: Message Chunking - `/home/debian/sources/openclaw/src/auto-reply/chunk.ts:1`
**Description**: Chunks long messages for channel-specific size limits

**Location 6f**: Status Reaction Updates - `/home/debian/sources/openclaw/src/channels/status-reactions.ts:1`
**Description**: Updates message reactions to show processing status (thinking, done, error)

## Trace 7: CLI Command Execution & Gateway RPC

**Description**: Command-line interface flow from parsing through gateway RPC to response formatting. Shows how CLI commands interact with the running gateway.

```
CLI Command Execution & Gateway RPC
├── CLI Entry Point
│   ├── runCli() parses argv <-- 7a
│   ├── buildProgram() creates Commander <-- 7b
│   │   └── registers all commands <-- command-registry.ts:1
│   └── program.parseAsync(argv) <-- run-main.ts:242
│       └── routes to command handler
│
├── Command Handler Layer
│   ├── agent command handler <-- 7c
│   │   ├── resolves gateway connection <-- agent-via-gateway.ts:1
│   │   └── calls gateway.call() <-- agent-via-gateway.ts:1
│   └── status command handler <-- 7f
│       └── formats output for terminal <-- status.command.ts:1
│
├── Gateway RPC Client
│   └── call() sends WebSocket request <-- 7d
│       ├── connects to ws://127.0.0.1:18789 <-- call.ts:1
│       ├── sends {type:"req", method, params} <-- call.ts:1
│       └── awaits {type:"res", payload} <-- call.ts:1
│
└── Gateway Server Side
    └── coreGatewayHandlers map <-- 7e
        ├── handles "agent" method <-- agent.ts:1
        ├── handles "status" method <-- status.ts:1
        └── returns response payload <-- types.ts:1
```

**Location 7a**: CLI Entry Point - `/home/debian/sources/openclaw/src/cli/run-main.ts:129`
**Description**: Main CLI execution that parses commands and routes to handlers

**Location 7b**: CLI Program Builder - `/home/debian/sources/openclaw/src/cli/program.ts:1`
**Description**: Builds Commander.js program with all registered commands

**Location 7c**: Agent CLI Command - `/home/debian/sources/openclaw/src/commands/agent.ts:1`
**Description**: CLI command that sends messages to agent via gateway or direct execution

**Location 7d**: Gateway RPC Client - `/home/debian/sources/openclaw/src/gateway/call.ts:1`
**Description**: Makes WebSocket RPC calls to running gateway server

**Location 7e**: Gateway Method Handlers - `/home/debian/sources/openclaw/src/gateway/server-methods.ts:1`
**Description**: Core gateway WebSocket method handlers for RPC requests

**Location 7f**: Status Command Formatting - `/home/debian/sources/openclaw/src/commands/status.command.ts:1`
**Description**: Formats gateway status, channels, and sessions for CLI output

## Trace 8: Model Provider Selection & Authentication

**Description**: How OpenClaw selects model providers, resolves authentication profiles, and establishes streaming connections. Critical for multi-provider support.

```
Model Provider Selection & Authentication Flow
├── Agent invokes model inference <-- agent-command.ts:1
│   └── Model selection logic <-- 8a
│       ├── Resolve model from config/overrides <-- setup.ts:1
│       └── Select provider for model <-- model-selection.ts:39
│           └── Auth resolution <-- 8b
│               ├── Load auth profile store <-- 8c
│               │   ├── OAuth credentials <-- types.ts:10
│               │   ├── API key credentials <-- types.ts:8
│               │   └── Rotation & cooldown state <-- auth-profiles.ts:19
│               └── Build provider request <-- 8d
│                   ├── Headers & authentication <-- model-auth.ts:32
│                   ├── Base URL & endpoints <-- provider-request-config.ts:1
│                   └── Provider-specific config <-- provider-request-config.ts:15
│                       └── Transport stream <-- 8e
│                           ├── HTTP/SSE connection <-- provider-transport-fetch.ts:1
│                           ├── Streaming response <-- provider-transport-stream.ts:1
│                           └── Error handling <-- failover-error.ts:27
│                               └── Failover logic <-- 8f
│                                   ├── Rate limit retry <-- pi-embedded-helpers.ts:52
│                                   ├── Auth error rotation <-- pi-embedded-helpers.ts:48
│                                   └── Context overflow fallback <-- pi-embedded-helpers.ts:51
```

**Location 8a**: Model Selection Logic - `/home/debian/sources/openclaw/src/agents/model-selection.ts:1`
**Description**: Selects model based on config, session overrides, and fallback policies

**Location 8b**: Model Auth Resolution - `/home/debian/sources/openclaw/src/agents/model-auth.ts:1`
**Description**: Resolves authentication profiles with rotation and failover support

**Location 8c**: Auth Profile Store - `/home/debian/sources/openclaw/src/agents/auth-profiles.ts:1`
**Description**: Manages OAuth and API key credentials with cooldown and rotation

**Location 8d**: Provider Request Configuration - `/home/debian/sources/openclaw/src/agents/provider-request-config.ts:1`
**Description**: Builds provider-specific request configuration and headers

**Location 8e**: Provider Transport Layer - `/home/debian/sources/openclaw/src/agents/provider-transport-stream.ts:1`
**Description**: Establishes streaming connection to model provider APIs

**Location 8f**: Model Failover Logic - `/home/debian/sources/openclaw/src/agents/model-fallback.ts:1`
**Description**: Handles model failover on errors, rate limits, and context overflow

---

*Generated from OpenClaw Personal AI Assistant system architecture*