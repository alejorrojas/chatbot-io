<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Agent Guide — Simplex

This is a university-focused AI chatbot that teaches students to solve linear programming problems using the Simplex method step by step.

---

## Critical Next.js 16 differences

| Topic | Old (≤15) | This project (16) |
|---|---|---|
| Route protection | `middleware.ts` exporting `middleware` | `proxy.ts` exporting `proxy` |
| Route params | `{ params: { id: string } }` | `{ params: Promise<{ id: string }> }` — must `await params` |
| `cookies()` | sync | `await cookies()` |
| `searchParams` | sync | `await searchParams` |

Always `await` dynamic APIs. Always export `proxy` (not `middleware`) from `proxy.ts`.

---

## Tech stack

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **Vercel AI SDK v6** — `useChat`, `streamText`, `generateText`, tool calling
- **OpenAI** — `gpt-5.5` for chat, `gpt-4.1-mini` for title generation
- **Supabase** — auth (email/password) + Postgres DB + RLS
- **@supabase/ssr** — session management via publishable key + cookies
- **Tailwind CSS v4** + `@tailwindcss/typography`
- **KaTeX** + `react-markdown` — LaTeX rendering in chat
- **Bun** — package manager and runtime

---

## File structure

```
app/
  api/
    chat/route.ts          POST — streams AI response, saves messages on finish
    chats/route.ts         GET (list user's chats), DELETE (one or all)
    chats/[id]/route.ts    PATCH (rename), POST (generate title with AI)
  auth/
    callback/route.ts      Handles Supabase email confirmation callback
  chat/
    page.tsx               Redirects to /chat/[new-uuid]
    [id]/page.tsx          Server component: loads messages from DB → <Chat>
  components/
    chat.tsx               Client component: useChat, message rendering, LaTeX
    sidebar.tsx            Client component: chat history, rename, delete, sign out
    dot-grid.tsx           Canvas animation for landing hero
    icons.tsx              SVG icon components
  login/
    page.tsx               Email/password login + signup
  opengraph-image.tsx      OG image (code-generated, 1200×630)
  icon.png                 Favicon (Next.js App Router auto-detection)
  apple-icon.png           Apple touch icon
  layout.tsx               Root layout + metadata (OG, icons)
  page.tsx                 Landing page
  globals.css

lib/
  supabase/
    server.ts              createSupabaseServerClient() — SSR client with cookies
    client.ts              createSupabaseBrowserClient() — browser client

app/tools/
  simplex.ts               Deterministic Big-M Simplex solver + AI SDK tool

migrations/
  001_create_chats_and_messages.sql

proxy.ts                   Session refresh + /chat/* auth guard
docs/
  simplex-tool.md          Full docs for the solveSimplex tool
public/
  favicon.png              PNG favicon (also referenced in layout metadata)
```

---

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL          https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  sb_publishable_...
SUPABASE_SECRET_KEY               sb_secret_...   (server-side only, not yet used in routes)
OPENAI_API_KEY                    sk-proj-...
```

`NEXT_PUBLIC_*` vars are safe to expose to the browser. Never expose `SUPABASE_SECRET_KEY` or `OPENAI_API_KEY` to the client.

---

## Auth flow

1. User visits `/` → clicks "Iniciar sesión" → `/login`
2. `proxy.ts` runs on every request. If no session and path starts with `/chat`, redirects to `/login`.
3. Login page uses `createBrowserClient` with the publishable key. Email confirmation is disabled in Supabase — `signUp` returns a session immediately and the user is redirected to `/chat`.
4. All server-side DB access uses `createSupabaseServerClient()` (publishable key + cookies). RLS handles data isolation — users can only read/write their own rows.

---

## Database schema

```sql
chats (
  id          UUID PRIMARY KEY,
  user_id     UUID REFERENCES auth.users ON DELETE CASCADE,
  title       TEXT DEFAULT 'Nueva conversación',
  created_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ   -- auto-updated by trigger
)

messages (
  id          TEXT PRIMARY KEY,  -- format: msg_<16 chars>
  chat_id     UUID REFERENCES chats ON DELETE CASCADE,
  role        TEXT CHECK (role IN ('user', 'assistant', 'system')),
  parts       JSONB,             -- UIMessage parts array (Vercel AI SDK format)
  created_at  TIMESTAMPTZ,
  "order"     INTEGER            -- insertion order within the chat
)
```

RLS is enabled on both tables. All policies are based on `auth.uid() = user_id`.

To apply new migrations, use the Supabase MCP tool `apply_migration` with project ID `jonlwefdvapnlggxjolq`.

---

## Chat persistence flow

1. User navigates to `/chat/[id]` (ID generated client-side via `crypto.randomUUID()`).
2. `app/chat/[id]/page.tsx` (server component) loads existing messages from DB and hydrates `<Chat>`.
3. On each message, `useChat` POSTs to `/api/chat` with `{ messages, id }`.
4. The route upserts the chat row (lazy creation), streams the response with `streamText`.
5. `result.consumeStream()` is called so `onFinish` fires even if the client disconnects.
6. In `onFinish`: all messages are deleted and re-inserted (ensures consistency after retries). On the first turn, `generateText` produces a short title via `gpt-4.1-mini` and updates the chat row.
7. After `onFinish`, `router.refresh()` is called client-side to reload the sidebar.

---

## Simplex tool

The `solveSimplex` tool (`app/tools/simplex.ts`) implements Big-M Simplex in TypeScript. It returns the exact optimal value, variable values, and a tableau snapshot per iteration. The AI is instructed to always call this tool instead of computing manually, then explain each tableau step-by-step in LaTeX.

See `docs/simplex-tool.md` for full input/output reference.

---

## Running locally

```bash
bun install
bun dev
```

Make sure `.env.local` is populated (see `.env.example`).

---

## Common tasks

**Add a new API route:** Create `app/api/<name>/route.ts`. Use `createSupabaseServerClient()` and call `getUser()` before any DB access.

**Add a new page that requires auth:** The `proxy.ts` already protects all `/chat/*` paths. For other protected paths, add them to the `proxy.ts` matcher logic.

**Change the AI model:** Update `openai('...')` in `app/api/chat/route.ts`. The system prompt assumes tool calling is available.

**Add a DB migration:** Write a `.sql` file in `migrations/` and apply it with the Supabase MCP `apply_migration` tool (project: `jonlwefdvapnlggxjolq`).
