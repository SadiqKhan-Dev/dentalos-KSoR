# DentalOS Knowledge System of Record (KSoR)

A multi-tenant, governed knowledge system for dental clinics — powering the DentalOS AI agent with authoritative, cited answers for patient-facing FAQ, booking policies, and clinical procedures.

---

## Table of Contents

- [What This Is](#what-this-is)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Phases](#phases)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [API Reference](#api-reference)
- [Multi-Tenant Architecture](#multi-tenant-architecture)
- [Governance Model](#governance-model)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## What This Is

DentalOS KSoR is a **Knowledge System of Record** that stores governed clinic documents (booking policies, FAQs, procedures, recall rules) and serves them to an AI agent via the **Model Context Protocol (MCP)**. The agent answers patient questions from this record — never from general knowledge — and returns citations for every answer. When the record has no answer, it **abstains honestly** rather than fabricating.

**Key properties:**

- **Multi-tenant**: each clinic owns its own subtree under `knowledge/<clinic-slug>/`
- **Governed**: documents require approval from authorized actors before they become active
- **Cited**: every answer includes source provenance with stable IDs
- **Honest**: a calibrated abstention floor (0.627) ensures the agent refuses out-of-scope questions
- **Auditable**: `build.lock.json` captures every generation's hashes and document status

---

## Architecture

```
+-----------------------------------------------------------+
|                     Patient / Staff                        |
|              (DentalOS App, WhatsApp, Web)                 |
+-----------------------------+-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
|                FastAPI Agent (port 8000)                   |
|  +-----------------+  +------------------------------+    |
|  |  Gemini Tools   |  |  MCP Client (httpx)          |    |
|  |  - query_know.  |--|  - search / outline / read   |    |
|  |  - book_appt.   |  |  - JSON-RPC over HTTP        |    |
|  |  - reschedule   |  +--------------+---------------+    |
|  |  - recall_check |                 |                    |
|  +-----------------+                 |                    |
+--------------------------------------+--------------------+
                                       |
                                       v
+-----------------------------------------------------------+
|              KSoR MCP Server (port 8080)                   |
|              ksor serve --instance instance.md              |
|  +------------+  +------------+  +-------------+           |
|  |  Search     |  |  Outline   |  |  Read        |           |
|  |  (vector + |  |  (tree     |  |  (full doc   |           |
|  |   RRF)     |  |   overview)|  |   retrieval) |           |
|  +-----+------+  +------------+  +-------------+           |
|        |                                                 |
|        v                                                 |
|  +----------------------------------------------+        |
|  |  NeonDB (PostgreSQL + pgvector)               |        |
|  |  - Generations (embedding vectors)            |        |
|  |  - Documents (stable_id, sha256, audience)    |        |
|  |  - Denylist (takedowns)                       |        |
|  +----------------------------------------------+        |
+-----------------------------------------------------------+
                              |
                              v
+-----------------------------------------------------------+
|              Admin Dashboard (port 3001)                   |
|              Next.js + Clerk Auth                          |
|  +------------+  +------------+  +-------------+           |
|  |  Document  |  |  Markdown  |  |  Approval   |           |
|  |  List      |  |  Editor    |  |  Workflow   |           |
|  +------------+  +------------+  +-------------+           |
+-----------------------------------------------------------+
```

---

## Project Structure

```
Q5-KSOR/
├── my-knowledge-sor/              # KSoR instance (the knowledge record)
│   ├── instance.md                # KSoR config and agent instructions
│   ├── build.lock.json            # Build provenance (hashes, generation)
│   ├── package.json               # KSoR toolchain scripts
│   ├── .ksor/
│   │   ├── governance.yaml        # Approval authorities, takedown rules
│   │   └── people.yaml            # Actor display names
│   ├── knowledge/                 # The governed record (CommonMark .md)
│   │   ├── index.md               # Root index (generated)
│   │   └── smile-care-karachi/    # Tenant: Smile Care Karachi
│   │       ├── index.md           # Tenant index (generated)
│   │       ├── booking-policy.md  # Hours, cancellation, deposits
│   │       ├── faq-general.md     # Pricing, insurance, first visits
│   │       ├── faq-procedures.md  # Root canal, whitening, scaling
│   │       ├── recall-reminders.md # Cleaning reminder cadence
│   │       └── refund-and-rescheduling.md # Staff refund rules
│   ├── system/site/               # Fumadocs static site (Next.js)
│   └── .agents/skills/            # Agent skills
│
├── dentalos-agent/                # FastAPI agent service
│   ├── pyproject.toml             # Python project config
│   ├── app/
│   │   ├── main.py                # FastAPI app (/chat, /mcp/search, /health)
│   │   ├── gemini_tools.py        # Gemini function-calling tool definitions
│   │   ├── mcp_client.py          # MCP JSON-RPC client (search/outline/read)
│   │   ├── system_instructions.py # Agent system prompt
│   │   └── tenant_config.py       # Per-tenant KSoR subtree mapping
│   └── tests/
│       └── test_knowledge_tool.py # 6 unit tests (all passing)
│
├── admin-dashboard/               # Next.js admin UI
│   ├── app/
│   │   ├── layout.tsx             # Root layout with Clerk provider
│   │   ├── page.tsx               # Landing page
│   │   ├── dashboard/
│   │   │   ├── layout.tsx         # Sidebar + auth gate
│   │   │   ├── page.tsx           # Dashboard home
│   │   │   └── knowledge/
│   │   │       ├── page.tsx       # Document list (per-tenant)
│   │   │       ├── new/page.tsx   # New document form
│   │   │       └── [...slug]/page.tsx  # Edit document
│   │   └── api/approve/           # Approval API endpoint
│   ├── components/
│   │   └── document-editor.tsx    # Markdown editor with frontmatter
│   ├── lib/
│   │   ├── ksor-api.ts            # KSoR API client
│   │   └── tenant.ts              # Tenant resolution
│   ├── package.json
│   └── .env.example               # Required env vars template
│
├── docs/
│   └── deployment-ksor.md         # Production deployment guide
├── release.sh                     # Unix release script
├── release.bat                    # Windows release script
└── .gitignore
```

---

## Phases

### Phase 1: KSoR Scaffold

- Scaffolded KSoR instance at `my-knowledge-sor/` using `ksor init` (v0.0.60)
- Installed dependencies (`npm install`)
- Verified `npm run dev` serves the documentation site at `http://localhost:3000`
- Node >=24 required by KSoR toolchain; running Node 22.17.1 (works with engine warnings)

### Phase 2: Multi-Tenant Knowledge

- Customized `instance.md` for DentalOS (`name: dentalos-clinic-ksor`, `title: DentalOS Clinic Knowledge`)
- Created `governance.yaml` with multi-tenant approval authorities:
  - `platform-admin` — can approve across all tenants
  - `smile-care-admin` — can approve only `smile-care-karachi/` subtree
- Added 5 documents for Smile Care Karachi:

| Document | Audience | Description |
|----------|----------|-------------|
| `booking-policy.md` | public | Hours, cancellation rules, deposits |
| `faq-general.md` | public | Pricing, insurance, first visits |
| `faq-procedures.md` | public | Root canal, whitening, scaling |
| `recall-reminders.md` | public | Cleaning reminder cadence |
| `refund-and-rescheduling.md` | staff | Internal refund procedures |

- Ran `ksor build` — all documents pass format checks and are admitted

**Frontmatter format (OKF section 2):**

```yaml
---
type: Document
title: Booking Policy
description: Hours of operation, appointment vs. walk-in availability, and cancellation rules.
status: stable
ksor:
  audience: [public]
  owner: human:smile-care-admin
  approval:
    by: human:smile-care-admin
    at: "2026-09-20T22:00:00+05:00"
generated:
  by: human:smile-care-admin
  at: "2026-09-20T22:00:00+05:00"
order: 1
---
```

### Phase 3: MCP Server and Calibration

- Applied schema to NeonDB (`npm run provision`)
- Granted ingest permissions (`npm run grant`)
- Ingested knowledge corpus — **generation 1**: 6 nodes, 23 chunks
- Started MCP server: `ksor serve --instance instance.md`
  - Endpoint: `http://127.0.0.1:8080/mcp`
  - Auth: `KSOR_AUTH=disabled-local` (loopback only)
- **Calibrated abstention floor** using `--queries-file` workaround (free-tier Gemini 429 quota):
  - Floor: **0.627**
  - Model: `gemini-embedding-001/d1536`
  - Generation: 1
  - Digest: `8bfb07d0e6f5`

**Calibration results:**

| Query Type | Expected | Result |
|------------|----------|--------|
| In-corpus (booking policy) | Citation returned | Correct citation |
| In-corpus (root canal procedure) | Citation returned | Correct citation |
| Out-of-corpus (heart surgery) | Abstention | Abstained correctly |
| Out-of-corpus (stock prices) | Abstention | Abstained correctly |

### Phase 4: FastAPI Agent

- Built `dentalos-agent/` from scratch
- FastAPI service with 4 Gemini function-calling tools:

| Tool | Description | Status |
|------|-------------|--------|
| `query_clinic_knowledge` | Search KSoR for policies/FAQs | Implemented |
| `book_appointment` | Book a dental appointment | Stub |
| `reschedule_appointment` | Reschedule an appointment | Stub |
| `check_recall_status` | Check patient recall status | Stub |

- **MCP client** (`mcp_client.py`): JSON-RPC calls to KSoR server via `httpx`
  - `ksor_search()` — vector search with tenant scoping
  - `ksor_outline()` — tree overview of knowledge structure
  - `ksor_read()` — full document retrieval by slug

- **Tenant config** (`tenant_config.py`): maps clinic slugs to KSoR subtrees
  - Currently hardcoded: `smile-care-karachi` maps to `smile-care-karachi`
  - Production: read from NeonDB

- **System instructions**: tells the agent to answer only from KSoR, abstain when unsure, and defer to booking tools for patient-specific queries

- **6 unit tests** — all passing

### Phase 5: Admin Dashboard

- Built `admin-dashboard/` with Next.js 15, Clerk auth, and Tailwind CSS
- **Landing page** (`/`) — sign-in prompt
- **Dashboard** (`/dashboard`) — overview with navigation
- **Document list** (`/dashboard/knowledge`) — shows documents per tenant, with audience badges and status
- **New document** (`/dashboard/knowledge/new`) — form to create new documents
- **Edit document** (`/dashboard/knowledge/[...slug]`) — markdown editor with frontmatter fields
- **Approval API** (`/api/approve/[...slug]`) — marks documents as approved

**Document editor features:**

- Title, description, audience (public/staff) fields
- Markdown content area with auto-resize
- Save as Draft / Submit for Approval buttons
- Frontmatter auto-generated with proper KSoR format

**Auth:**

- Clerk for authentication and session management
- `PLATFORM_ADMIN_IDS` env var for admin access control
- Tenant resolution via document path prefix

### Phase 6: Deployment and Release

- `build.lock.json` — captured with real SHA-256 hashes for all documents
- `docs/deployment-ksor.md` — comprehensive production deployment guide
- `release.sh` / `release.bat` — cross-platform release scripts
- Vercel configuration files created

**Release scripts:**

```bash
# Unix
./release.sh

# Windows
release.bat
```

**What the release scripts do:**

1. Run `ksor build` (validates and generates static site)
2. Run `ksor check` (format validation)
3. Run agent tests (`pytest`)
4. Generate release summary
5. Stage and commit `build.lock.json`

---

## Environment Variables

### KSoR Instance (`my-knowledge-sor/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `KSOR_DB_URL` | Yes | NeonDB connection string |
| `GEMINI_API_KEY` | Yes | Google AI Studio API key (free tier works) |
| `KSOR_AUTH` | Yes | `disabled-local` (dev) or SSO config (prod) |

### FastAPI Agent (`dentalos-agent/`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DENTALOS_KSOR_MCP_URL` | No | KSoR MCP endpoint (default: `http://127.0.0.1:8080/mcp`) |
| `GEMINI_API_KEY` | Yes | Google AI Studio API key |

### Admin Dashboard (`admin-dashboard/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `NEXT_PUBLIC_KSOR_MCP_URL` | No | KSoR MCP endpoint |
| `PLATFORM_ADMIN_IDS` | No | Comma-separated Clerk user IDs for admin access |

---

## Local Development

### 1. Start the KSoR MCP Server

```bash
cd my-knowledge-sor
npm install
cp .env.example .env  # Fill in KSOR_DB_URL and GEMINI_API_KEY

npm run provision      # Schema + grant (once)
npm run refresh        # Build + ingest knowledge
npm run serve          # MCP server on http://127.0.0.1:8080
```

### 2. Start the FastAPI Agent

```bash
cd dentalos-agent
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -e ".[dev]"

uvicorn app.main:app --reload --port 8000
```

### 3. Start the Admin Dashboard

```bash
cd admin-dashboard
npm install
cp .env.example .env  # Fill in Clerk keys

npm run dev --port 3001
```

### 4. Run Tests

```bash
cd dentalos-agent
pytest tests/ -v
```

### 5. Verify the Full Stack

```bash
# Health check
curl http://localhost:8000/health

# Chat with knowledge
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What are your hours?"}], "clinic_slug": "smile-care-karachi"}'

# Direct MCP search
curl -X POST http://localhost:8000/mcp/search \
  -H "Content-Type: application/json" \
  -d '{"query": "cancellation policy", "k": 3, "clinic_slug": "smile-care-karachi"}'
```

---

## API Reference

### FastAPI Agent (`dentalos-agent`)

#### `GET /health`

Returns service status.

```json
{ "status": "ok", "service": "dentalos-agent" }
```

#### `GET /tools`

Lists available Gemini tools.

#### `POST /chat`

Process a chat message through the agent.

**Request:**

```json
{
  "messages": [
    { "role": "user", "content": "What is your cancellation policy?" }
  ],
  "clinic_slug": "smile-care-karachi"
}
```

**Response:**

```json
{
  "response": "Based on our clinic policies:\n\n24-hour notice is required...",
  "tool_calls": [
    {
      "tool": "query_clinic_knowledge",
      "result": {
        "abstained": false,
        "citations": [
          {
            "content": "24-hour notice is required for cancellation...",
            "source": "smile-care-karachi/booking-policy",
            "score": 0.89
          }
        ]
      }
    }
  ],
  "knowledge_used": true
}
```

#### `POST /mcp/search`

Direct MCP search endpoint for testing.

**Request:**

```json
{
  "query": "cancellation policy",
  "k": 3,
  "clinic_slug": "smile-care-karachi"
}
```

### KSoR MCP Server (`ksor serve`)

#### `POST /mcp`

JSON-RPC 2.0 endpoint. Supported methods:

| Method | Description |
|--------|-------------|
| `tools/list` | List available tools |
| `tools/call` | Call a tool (search, outline, read) |

**Search request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search",
    "arguments": {
      "query": "cancellation policy smile-care-karachi",
      "k": 5
    }
  }
}
```

---

## Multi-Tenant Architecture

Each clinic is a **tenant** with its own subtree under `knowledge/<clinic-slug>/`.

### Current Tenants

| Tenant | Slug | Documents |
|--------|------|-----------|
| Smile Care Karachi | `smile-care-karachi` | 5 documents |

### Adding a New Tenant

1. Create a directory: `knowledge/<new-clinic-slug>/`
2. Add an `index.md` (will be generated by `ksor build`)
3. Add documents with proper frontmatter (`ksor.audience`, `ksor.owner`)
4. Update `.ksor/governance.yaml`:

```yaml
approval_authorities:
  - actors: [human:<new-clinic-slug>-admin]
    scope:
      paths: ["<new-clinic-slug>"]
```

5. Update `dentalos-agent/app/tenant_config.py`:

```python
tenant_subtrees: dict[str, str] = {
    "smile-care-karachi": "smile-care-karachi",
    "new-clinic-slug": "new-clinic-slug",
}
```

6. Run `npm run refresh` to rebuild and reingest

### Tenant Scoping

The agent scopes its search to the requesting clinic's subtree. When a patient from Smile Care Karachi asks about cancellation policy, the MCP search query is prefixed with `smile-care-karachi` to ensure only that clinic's knowledge is returned.

---

## Governance Model

### Actors

| Actor | Role | Scope |
|-------|------|-------|
| `human:platform-admin` | Platform administrator | All tenants |
| `human:smile-care-admin` | Smile Care Karachi clinic admin | `smile-care-karachi/` only |

### Document Lifecycle

```
draft --(approval)--> stable --(takedown)--> withdrawn
  |                      |
  |                      +--(deprecation)--> deprecated
  |
  +--(abandoned)--> removed
```

- **draft**: not visible on any machine surface (MCP, llms.txt)
- **stable**: visible on all surfaces, requires approval from authorized actor
- **deprecated**: replaced by another document (`ksor.superseded_by`)
- **withdrawn**: removed via takedown, logged in `.ksor/takedowns.yaml`

### Approval Workflow

1. Author creates document with `status: draft`
2. Author submits for approval via admin dashboard
3. Approver (authorized actor) reviews and approves
4. `ksor.approval: { by, at }` is added to frontmatter
5. `npm run refresh` rebuilds and reingests with the approved document

### Takedown

```bash
npx ksor takedown --instance instance.md --actor human:platform-admin \
  smile-care-karachi/some-doc --reason "Legal request"
```

Takedowns are:

- Logged in `.ksor/takedowns.yaml` (append-only ledger)
- Applied to the database denylist
- Honored by both MCP server (immediate) and static site (next build)

---

## Deployment

See `docs/deployment-ksor.md` for full instructions.

### Quick Start (Vercel)

```bash
# Deploy static site
cd my-knowledge-sor
npx vercel --prod

# Deploy MCP server (Docker)
docker build -t dentalos-ksor-mcp .
docker run --rm -p 8080:80 --env-file .env -e KSOR_AUTH=disabled-public dentalos-ksor-mcp

# Deploy admin dashboard
cd admin-dashboard
npx vercel --prod
```

### Production Database

```bash
export KSOR_DB_URL="your_production_db_url"
npm run provision     # Apply schema
npm run refresh       # Ingest knowledge
npx ksor calibrate --instance instance.md  # Calibrate abstention floor
```

---

## Troubleshooting

### "ksor-refused" errors

- Check `KSOR_DB_URL` is set and accessible
- Verify pgvector extension is enabled (`CREATE EXTENSION vector;`)
- Run `npm run provision` to apply schema

### Abstention too aggressive

- Recalibrate: `npx ksor calibrate --instance instance.md`
- Check floor is not too high for your corpus

### Admin dashboard cannot connect

- Verify `NEXT_PUBLIC_KSOR_MCP_URL` points to your MCP server
- Check CORS settings if needed
- Ensure Clerk is configured correctly

### Agent returns no knowledge

- Verify MCP server is running: `curl http://127.0.0.1:8080/mcp`
- Check `DENTALOS_KSOR_MCP_URL` in agent config
- Verify knowledge was ingested: `npm run refresh`

### Build fails

- Run `npm run check` to see format errors
- Ensure all documents have required frontmatter fields
- Check that `ksor.audience` values are registered in `governance.yaml`

---

## License

Private — DentalOS Clinic Knowledge System
