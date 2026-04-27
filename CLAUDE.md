@AGENTS.md

# Protected Files

NEVER read, edit, or create the following files under any circumstances:
- `next.config.ts`
- `postcss.config` (any extension)
- `tsconfig.json`

# Codebase

**Project:** `chatui` — Next.js 16 + React 19 AI chat UI. Auth via Clerk, backend via Convex, transcripts in Turso SQLite.

## Directory Layout
- `app/` — App Router pages + API routes
- `components/` — All UI components
- `convex/` — Convex schema, queries, mutations
- `hooks/` — All custom React hooks (state lives here)
- `lib/` — Shared utilities, service config parsing, Turso client
- `service-definitions/` — Markdown files defining AI service presets

## Key Components
| File | Role |
|------|------|
| `components/chat-app.tsx` | Root orchestrator — owns all top-level state |
| `components/chat-pane.tsx` | Message list + auto-scroll + bubbles |
| `components/chat-composer.tsx` | Input bar, model selector, error display |
| `components/sidebar.tsx` | Session list (desktop persistent / mobile overlay) |
| `components/settings-panel.tsx` | Service/endpoint/auth/system-prompt config |
| `components/chat-header.tsx` | Top bar: title, service name, connection status |
| `app/layout.tsx` | Root layout: ClerkProvider + AppProviders + GTM |

## State / Data Flow (no global state library)
- **Settings** (`hooks/use-settings.ts`): hydrates from `localStorage`; debounce-saves to Convex (`users:saveApiSettings`) for signed-in users.
- **Chat history** — two implementations behind a shared interface:
  - Guest: `hooks/use-local-chat-history.ts` → `localStorage`, max 10 chats
  - Auth: `hooks/use-authenticated-chat-history.ts` → session metadata in Convex, messages in Turso via `/api/chat-transcripts/[sessionId]`, max 8 chats
- **Chat engine** (`hooks/use-real-chat.ts`): implements `ChatHandler`; builds request via Mustache-style templates from service definitions; handles Ollama NDJSON + OpenAI SSE streaming.
- **Service definitions** (`lib/service-config.ts`): parsed from `service-definitions/*.md` JSON blocks via `/api/service-definitions`.

## API Routes
| Route | Purpose |
|-------|---------|
| `app/api/service-definitions/route.ts` | GET — returns parsed service definitions |
| `app/api/chat-transcripts/[sessionId]/route.ts` | GET/PUT/DELETE — Turso transcript CRUD; PUT enforces 2000-char limit |
| `app/api/proxy/[...path]/route.ts` | Reverse proxy to avoid CORS on local AI backends |

## Env Vars
| Var | Notes |
|-----|-------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Clerk auth |
| `CLERK_JWT_ISSUER_DOMAIN` | Custom Clerk domain (`https://clerk.cheezygo.com`) |
| `NEXT_PUBLIC_CONVEX_URL` | Enables authenticated mode when set |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Transcript storage |
| `NEXT_PUBLIC_GOOGLE_TAG_ID` | GTM — omits scripts if empty |

## Plan Limits (`lib/app-plan.ts`)
- Guest: 10 chats max
- Basic plan: 8 chats, 2000 char/message, ads event every 4 chats

## Update Claude.md Every Update