# TaxBuddy — Canadian Tax Research Assistant

> **Status: Archived reference implementation.** The data pipeline that populated the vector database is no longer operational. The live demo runs on a frozen dataset.

**Live demo:** [taxbuddy.online](https://taxbuddy.online)

---

## What This Is

TaxBuddy is an AI-powered research tool for Canadian tax professionals. It uses retrieval-augmented generation (RAG) to answer questions about Canadian tax law, citing the specific source documents behind each answer.

The assistant searches across 7 collections of authoritative Canadian tax sources:

| Collection | Source |
|-----------|--------|
| CRA | Canada Revenue Agency publications and guidance |
| ITA | Income Tax Act |
| ETA | Excise Tax Act |
| DoF | Department of Finance publications |
| Provincial | Provincial tax rules and regulations |
| Tax Law | Canadian tax case law |
| Commentary | Canadian tax commentaries and analyses |

Questions are answered exclusively from retrieved documents — the model is explicitly instructed not to fabricate citations or extrapolate beyond what the sources state.

---

## Why It's Archived

The data pipeline that originally scraped and ingested Canadian government tax sources into Qdrant is no longer operational (government sites now block the scraping approach). The pipeline itself is not included in this repo.

**What works:** the full application stack — chat interface, RAG retrieval, conversation history, authentication, streaming responses.

**What doesn't:** ingesting new or updated source documents. The Qdrant collections contain a frozen snapshot of Canadian tax sources as of early 2026.

This repo is preserved as a reference implementation for anyone building a similar RAG-based research tool.

---

## Architecture

```
User (browser)
    │
    ▼
Next.js on Vercel
    │
    ├── Supabase ────── Auth (email/password + guest mode)
    │                   Conversation history (persisted messages)
    │
    └── API route: /api/chat/retrieval_agents
            │
            ├── Qdrant Cloud ──── Vector search across 7 collections
            │                    (OpenAI text-embedding-3-small for queries)
            │
            └── Anthropic Claude ── LLM (claude-sonnet-4-6 / claude-haiku-4-5)
                                    Streaming responses via Vercel AI SDK
```

The retrieval agent uses LangChain to orchestrate: it embeds the user's query, retrieves the top-k relevant chunks from Qdrant, and passes them as context to Claude along with a strict system prompt requiring citations.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI
- **LLM:** Claude (Anthropic) via `@ai-sdk/anthropic` + LangChain.js
- **Vector search:** Qdrant Cloud (`@qdrant/js-client-rest`)
- **Embeddings:** OpenAI `text-embedding-3-small`
- **Auth + persistence:** Supabase (`@supabase/supabase-js`)
- **Streaming:** Vercel AI SDK
- **Observability:** LangSmith (optional)

---

## Running Locally

**Prerequisites:** Node.js 18+, Yarn

```bash
git clone <this-repo>
cd canadian-tax-research
yarn install
cp .env.example .env.local
# Fill in .env.local — see below
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where to get it |
|----------|----------------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) — used for embeddings only |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project dashboard → Settings → API |
| `QDRANT_URL` | [cloud.qdrant.io](https://cloud.qdrant.io) |
| `QDRANT_API_KEY` | Qdrant Cloud dashboard |

**Note on Qdrant:** The app expects 7 pre-populated collections (`cra-collection`, `dof-collection`, `eta-collection`, `ita-collection`, `provtax-collection`, `taxlaw-collection`, `taxcomment-collection`). Without populated collections the chat will retrieve nothing. To use your own data, set up a Qdrant instance and use the `/api/retrieval/ingest` endpoint to populate collections, or modify `lib/qdrant.ts` to match your collection structure.

**Note on Supabase:** You'll need to run the migrations in `supabase/migrations/` against your Supabase project to create the `conversations` and `messages` tables with the correct schema and RLS policies.

---

## Deploying to Vercel

1. Fork this repo
2. Import into [Vercel](https://vercel.com/new)
3. Add all environment variables from `.env.example` in the Vercel dashboard (Project → Settings → Environment Variables)
4. Deploy

The app uses standard Next.js serverless functions — no special Vercel configuration required.

---

## Known Limitations

- Source documents are frozen as of early 2026; the app does not fetch live CRA updates
- The data ingestion pipeline (scrapers for Canadian government tax sources) is not included in this repo
- LangGraph example routes have been removed; the app exposes only the production RAG chat interface
- Guest mode persists conversations in the browser session only; create an account for history across sessions

---

## Attribution

Built by [Nathan Farquharson](https://github.com/nathanfarq). Originally scaffolded from the [LangChain Next.js Starter Template](https://github.com/langchain-ai/langchain-nextjs-template).

MIT License — see [LICENSE](./LICENSE).
