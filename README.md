# CANORA

**The Institutional Music Archive for the Age of Infinite Content**

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen)
![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-private-red)

A cultural decision system that curates AI-generated music through an irreversible three-tier pipeline: JAM → PLATE → CANON.

---

## What This Is

CANORA addresses the crisis of abundance in AI-generated music by implementing a curator-driven archive with permanent cultural commitments. The platform enables creators to submit works, curators to evaluate and promote notable pieces, and the community to discover music through emotion-based search and shadow scoring.

**In the TASTE Ecosystem:** CANORA serves as the credentialing layer—receiving engagement signals from SELECTR (the game layer) and graduating CANON works to ISSUANCE (the settlement layer) for blockchain registration and fractional ownership.

**Audience:** Music creators, cultural curators, AI music platforms, and discovery enthusiasts who want to preserve meaningful works from the infinite stream.

---

## Ecosystem Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TASTE ECOSYSTEM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐       │
│   │   SELECTR    │ ──────► │   CANORA     │ ──────► │  ISSUANCE    │       │
│   │  (Game)      │ signals │(Credentialing)│ graduate│ (Settlement) │       │
│   │              │         │              │         │              │       │
│   │ • Battles    │         │ • JAM        │         │ • Registry   │       │
│   │ • Drops      │         │ • PLATE      │         │ • Fractions  │       │
│   │ • Votes      │         │ • CANON      │         │ • Blockchain │       │
│   └──────────────┘         └──────────────┘         └──────────────┘       │
│         │                         │                        ▲               │
│         │    votes, drops,        │   work.canonized       │               │
│         │    battle_win/loss      │   webhook              │               │
│         └─────────────────────────┴────────────────────────┘               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Inbound from SELECTR:**
   - `POST /api/v1/works/[id]/signal` — Receives engagement signals (votes, drops, battle wins/losses)
   - Updates shadow scores and discovery metrics based on game activity

2. **Outbound to ISSUANCE:**
   - `POST /api/v1/canon/[id]/graduate` — Graduates CANON works for settlement
   - Sends work metadata, CTAD, contributions, lineage, and provenance

### APIs Exposed

| Endpoint | Description |
|----------|-------------|
| `/api/v1/works` | Work CRUD and listing |
| `/api/v1/works/[id]/signal` | SELECTR engagement signals |
| `/api/v1/canon` | CANON archive listing |
| `/api/v1/canon/[id]/graduate` | Graduate to ISSUANCE |
| `/api/v1/discover` | Emotion-based discovery |
| `/api/v1/discover/shadow-dive` | Underground track discovery |
| `/api/v1/taste-dna` | Profile-scoped approval/rejection taste memory |

### APIs Consumed

| Service | Endpoint | Purpose |
|---------|----------|---------|
| ETHERFEED | `/analyze` | Audio analysis (BPM, key, embeddings) |
| ISSUANCE | `/api/assets/issue` | Asset registration (pending) |

---

## Features

### Core Curation Pipeline
- ✅ Three-tier status system (JAM → PLATE → CANON)
- ✅ Irreversible CANON lock with curator signature
- ✅ Immutable promotion events with justification
- ✅ Role-based access (VIEWER, CREATOR, CURATOR, ADMIN)

### Discovery Engine
- ✅ 6-axis emotion search (ecstatic, yearning, corrupted, lucid, divine, feral)
- ✅ Shadow score calculation (underground/rarity metric)
- ✅ Novelty score tracking
- ✅ Surface/Latent/Shadow discovery modes
- ✅ Similar track finder via embeddings

### Work Management
- ✅ Audio file upload to S3
- ✅ Creative lineage tracking (FORK/MERGE/DERIVED)
- ✅ Contributor attribution with roles
- ✅ CTAD metadata generation
- ✅ O8 provenance for AI-generated works

### Integrations
- ✅ SELECTR signal ingestion (votes, drops, battles)
- ✅ Webhook system for external subscribers
- ⏸️ ETHERFEED audio analysis (graceful fallback if disabled)
- 🔜 ISSUANCE graduation (endpoint exists, integration pending)

### API & Auth
- ✅ REST API v1 (16+ endpoints)
- ✅ Scoped API key management
- ✅ GitHub OAuth authentication
- ✅ Webhook subscriptions with HMAC verification

---

## Setup Checklist

### Prerequisites

- [ ] Node.js 18+
- [ ] PostgreSQL database (Supabase/Neon recommended)
- [ ] GitHub OAuth app credentials
- [ ] AWS S3 bucket for audio storage

### Environment Variables

Create `.env.local` with:

```bash
# Database (required)
DATABASE_URL=               # Pooled PostgreSQL connection
DIRECT_URL=                 # Direct PostgreSQL connection (for migrations)

# Authentication (required)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=            # Run: openssl rand -base64 32
GITHUB_ID=                  # GitHub OAuth app ID
GITHUB_SECRET=              # GitHub OAuth app secret

# Storage (required)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=canora-audio

# External Services (optional)
ETHERFEED_URL=              # Audio analysis service (leave empty to disable)
BRIDGE_API_KEY=             # For external integrations
```

### Installation

```bash
# Clone the repository
git clone https://github.com/bomac1193/canora.git
cd canora

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Fill in environment variables (see above)

# Push database schema
npx prisma db push

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

### Verify Setup

- [ ] App runs on http://localhost:3000
- [ ] Can login with GitHub OAuth
- [ ] Database tables created (check Prisma Studio: `npx prisma studio`)
- [ ] Can create a new work via /create
- [ ] Work appears in JAM status
- [ ] S3 upload works (audio file accessible)

---

## API Reference

### Works

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/works` | List works with filtering |
| POST | `/api/v1/works` | Create new work (JAM status) |
| GET | `/api/v1/works/[id]` | Get work details |
| POST | `/api/v1/works/[id]/signal` | Receive SELECTR signals |
| GET | `/api/v1/works/[id]/lineage` | Get work's parent/child graph |
| GET | `/api/v1/works/[id]/ctad` | Get CTAD metadata |

### Discovery

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/discover` | Search by emotion, BPM, key |
| GET | `/api/v1/discover/shadow-dive` | Find underground tracks |
| GET | `/api/v1/discover/similar/[id]` | Find similar tracks |
| GET | `/api/v1/discover/vibe-map` | Get UMAP coordinates |

### Visual Taste DNA

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/works/[id]/taste` | List taste signals for one work |
| POST | `/api/works/[id]/taste` | Add APPROVE/REJECT/HOLD taste signal |
| GET | `/api/v1/taste-dna` | Get caller profile reject reasons/tags summary + prompt guardrails |

### Canon

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/canon` | List all CANON works |
| POST | `/api/v1/canon/[id]/graduate` | Graduate to ISSUANCE |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/apikey` | List API keys |
| POST | `/api/v1/auth/apikey` | Create API key |
| DELETE | `/api/v1/auth/apikey/[id]` | Delete API key |

---

## Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Curation Pipeline | ✅ Working | JAM → PLATE → CANON fully operational |
| Discovery Engine | ✅ Working | Emotion search, shadow scores active |
| SELECTR Integration | ✅ Working | Receiving signals, updating metrics |
| S3 Audio Upload | ✅ Working | Files stored and accessible |
| GitHub OAuth | ✅ Working | Login flow complete |
| Etherfeed Analysis | ⏸️ Optional | Graceful fallback if service unavailable |
| ISSUANCE Integration | 🔜 Pending | Endpoint exists, returns placeholder |
| O8 Verification | 🔜 Pending | Storage works, verification logic pending |

---

## Next Steps

1. **Complete ISSUANCE integration** — Connect graduation endpoint to ISSUANCE API for blockchain registration
2. **Enable Etherfeed** — Deploy audio analysis service for full embedding/emotion detection
3. **Implement O8 verification** — Add cryptographic signature verification for AI provenance
4. **Add vibe map visualization** — Frontend display of UMAP coordinates
5. **Build admin dashboard** — User management and metrics views

---

## Related Repos

- [SELECTR](https://github.com/bomac1193/selectr) — Taste battle game that generates engagement signals
- [ISSUANCE](https://github.com/bomac1193/issuance) — Settlement layer for blockchain registration and fractional ownership
- [ETHERFEED](https://github.com/bomac1193/etherfeed) — Audio analysis microservice (Essentia-based)

---

## Tech Stack

- **Framework:** Next.js 16 (React 19, TypeScript 5)
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** NextAuth.js with GitHub OAuth
- **Storage:** AWS S3
- **UI:** Tailwind CSS, Radix UI, React Flow
- **Audio Analysis:** Etherfeed (optional)

---

*Remember everything. Choose the few.*
