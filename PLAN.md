# GLM for Copilot Chat — Implementation Plan

## Goal
A VS Code extension that registers GLM (Zhipu / Z.ai) models in the GitHub Copilot Chat
model picker, using the user's own API key (BYOK). The user can target **either** the
**GLM Coding Plan** API **or** the **normal/standard GLM API**. Modeled on the
`vizards.deepseek-v4-for-copilot` extension's architecture and UX, adapted for GLM and
the dual-API requirement.

## Mechanism (same as DeepSeek)
Implement `vscode.LanguageModelChatProvider` and register it via
`vscode.lm.registerLanguageModelChatProvider('glm', provider)` plus a
`languageModelChatProviders` manifest contribution. Three methods:
- `provideLanguageModelChatInformation` → model list (warning state when no key).
- `provideLanguageModelChatResponse` → OpenAI-compatible SSE streaming, reporting
  `LanguageModelTextPart` / `LanguageModelThinkingPart` / `LanguageModelToolCallPart` /
  `LanguageModelDataPart('usage')` to `progress`.
- `provideTokenCount` → adaptive chars-per-token estimate (EMA calibrated from usage).

## GLM API facts (confirmed from z.ai docs, June 2026)
- Auth: `Authorization: Bearer <API_KEY>`, `Content-Type: application/json`. Key format `{id}.{secret}`, passed verbatim.
- Endpoints (append `/chat/completions`):
  - Coding Plan: `https://api.z.ai/api/coding/paas/v4`  (z.ai only; coding scenarios only)
  - Standard intl: `https://api.z.ai/api/paas/v4`
  - Standard China: `https://open.bigmodel.cn/api/paas/v4`
- Streaming SSE is OpenAI-compatible: `data: {…}` lines, `data: [DONE]`,
  `choices[0].delta.content`, `choices[0].delta.reasoning_content`, `choices[0].delta.tool_calls[]`,
  `usage` (supports `stream_options:{include_usage:true}`).
- Thinking: top-level `"thinking": {"type":"enabled"|"disabled"}` (binary; default enabled).
- Tools: OpenAI function format (`tools:[{type:'function',function:{name,description,parameters}}]`).
- GLM-4.6: id `glm-4.6`, 200K context, 128K max output, tools yes, vision no.
- GLM-4.5 Air: id `glm-4.5-air`, ~128K context, tools yes, vision no.
- Key pages: coding `https://z.ai/manage-apikey/subscription`,
  standard intl `https://z.ai/manage-apikey/apikey-list`,
  standard China `https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys`.

## Scope

### In scope (v1)
Provider registration; dual-API endpoint routing; BYOK key in SecretStorage; SSE streaming
with thinking + tool calling; per-model thinking on/off control; token counting + usage
reporting; OpenAI-compatible message/tool conversion; commands; onboarding walkthrough
(incl. a dedicated "choose your API" step); settings; i18n (en + zh-cn); robust HTTP/network
error messages; README + CHANGELOG + docs.

### Out of scope (deliberately dropped vs DeepSeek — keep v1 lean)
Vision proxy subsystem (GLM flagship models are text-only); replay markers; cache diagnostics
& request dumps; live balance/currency resolver & pricing display; `stabilizeToolList` preflight;
request classifier / thinking-suppression. These can be added later; none are required for the
core "use GLM in Copilot Chat" goal.

## Settings (config section `glm-copilot`)
- `apiMode`: enum `["coding-plan","standard"]`, default `"coding-plan"`. Selects endpoint family.
- `region`: enum `["international","china"]`, default `"international"`. Applies to **standard** mode
  (intl → api.z.ai, china → open.bigmodel.cn). Coding plan always uses z.ai.
- `baseUrl`: string, default `""`. Override; when set, used verbatim (ignores apiMode/region). For proxies.
- `maxTokens`: number, default `0` (0 = API default / no cap).
- `modelIdOverrides`: object `{ "glm-4.6":"glm-4.6", "glm-4.5-air":"glm-4.5-air" }`. Point VS Code model ids at different API model names.
- `debugLogging`: boolean, default `false`. Verbose logs to the GLM output channel.

### Base URL resolution (endpoint.ts)
```
if (override) return normalize(override)
if (apiMode === 'coding-plan') return 'https://api.z.ai/api/coding/paas/v4'
return region === 'china'
  ? 'https://open.bigmodel.cn/api/paas/v4'
  : 'https://api.z.ai/api/paas/v4'
```

## Models (consts.ts `MODELS`)
| VS Code id | name | family | version | maxInput | maxOutput | tools | vision | thinking |
|---|---|---|---|---|---|---|---|---|
| `glm-4.6` | GLM-4.6 | glm | 4.6 | 200000 | 128000 | 128 | false | true |
| `glm-4.5-air` | GLM-4.5 Air | glm | 4.5 | 128000 | 96000 | 128 | false | true |

Model IDs sent to API resolved via `getApiModelId(id)` (modelIdOverrides → id).

## Thinking control
Per-model `configurationSchema` exposes property `thinking` (enum `['enabled','disabled']`,
labels On/Off, default `enabled`). Read back from `options.modelConfiguration?.thinking` /
`options.configuration?.thinking`. Maps to request `thinking:{type:<value>}`.

## File tree (src/, TypeScript, no runtime deps)
```
src/extension.ts            activate/deactivate → runtime
src/consts.ts               CONFIG_SECTION, API_KEY_SECRET, WELCOME_SHOWN_KEY, EXTERNAL_URLS, MODELS, SYSTEM_ROLE=3
src/types.ts                shared interfaces (GLMModel, GLMChatRequest/Message/Tool, StreamCallbacks, Usage…)
src/config.ts               settings readers + getApiModelId
src/endpoint.ts             resolveBaseUrl + host helpers
src/logger.ts               output channel
src/i18n.ts                 t() + en/zh dicts
src/auth.ts                 AuthManager (SecretStorage + settings fallback)
src/client/index.ts         re-export
src/client/core.ts          GLMClient.streamChatCompletion (SSE, AbortController)
src/client/errors.ts        GLMRequestError, createHttpError, normalizeRequestError, createUserFacingError
src/provider/index.ts       GLMChatProvider implements vscode.LanguageModelChatProvider
src/provider/models.ts      toChatInfo, buildThinkingSchema, getConfiguredThinking
src/provider/convert.ts     convertMessages, convertTools, mapRole (system role → 'system')
src/provider/request.ts     prepareChatRequest
src/provider/stream.ts      streamChatCompletion (client callbacks → progress, EMA)
src/provider/tokens.ts      estimateTokenCount
src/runtime/index.ts        re-export activate/deactivate
src/runtime/lifecycle.ts    activate()/deactivate()
src/runtime/provider.ts     registerProvider()
src/runtime/commands.ts     registerCommands()
src/runtime/welcome.ts      showWelcomeIfNeeded()
src/runtime/actions.ts      URI handler (onUri)
```

## Commands
- `glm-copilot.setApiKey` — "GLM: Set API Key"
- `glm-copilot.clearApiKey` — "GLM: Clear API Key"
- `glm-copilot.getApiKey` — "GLM: Get API Key" (opens correct key page by apiMode/region)
- `glm-copilot.openSettings` — "GLM: Open Settings"
- `glm-copilot.showLogs` — "GLM: Show Logs"

## Walkthrough (`glmGettingStarted`)
1. **Set your GLM API key** — get + set key. completionEvent: onCommand:setApiKey.
2. **Choose your GLM API** — coding plan vs standard (+ region). Opens settings. (Surfaces the dual-API feature.)
3. **Show GLM models** — open Language Models manager.

## Build / Verify
- TypeScript → `out/`. Engine `^1.116.0` (match DeepSeek; verify against installed VS Code). `enabledApiProposals: []`. Feature-detect `LanguageModelThinkingPart`.
- `npm run compile` (tsc). `vsce package` → `.vsix`.
- Verify: `code --install-extension <vsix>`; confirm GLM models appear in the Copilot Chat picker; set key; smoke-test a chat turn.

## Parallel implementation strategy
1. Orchestrator writes the foundation + contracts: package.json, tsconfig, consts.ts, types.ts,
   config.ts, endpoint.ts, logger.ts, extension.ts.
2. Parallel Opus agents against those contracts:
   - **client/** (SSE + errors)
   - **provider/** (convert, request, stream, models, tokens, index)
   - **runtime/ + auth.ts** (lifecycle, provider reg, commands, welcome, actions)
   - **copy**: package.nls.json, package.nls.zh-cn.json, i18n.ts dicts, walkthrough md, README, CHANGELOG, docs
3. Orchestrator integrates, runs tsc + lint, packages, installs VSIX, verifies.
