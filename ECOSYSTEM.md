# TASTE Ecosystem

**The Decentralized Music Credentialing and Settlement Stack**

---

## Overview

The TASTE ecosystem is a three-layer architecture for credentialing, curating, and monetizing audio content—particularly AI-generated music. It transforms casual engagement into permanent cultural artifacts with verifiable ownership.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TASTE ECOSYSTEM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   LAYER 1: GAME             LAYER 2: CREDENTIALING      LAYER 3: SETTLEMENT │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐       │
│   │   SELECTR    │ ──────► │   CANORA     │ ──────► │  ISSUANCE    │       │
│   │              │ signals │              │ graduate│              │       │
│   │ "Prove your  │         │ "Remember    │         │ "Sound is    │       │
│   │  taste"      │         │  everything. │         │  issued"     │       │
│   │              │         │  Choose few" │         │              │       │
│   └──────────────┘         └──────────────┘         └──────────────┘       │
│                                                                             │
│   • Drop tracks            • JAM → PLATE → CANON     • Blockchain registry │
│   • 1v1 battles            • Curator accountability  • Fractional ownership│
│   • Crowd voting           • Discovery engine        • Settlement rules    │
│   • Reputation             • Lineage tracking        • KYC/AML compliance  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The Three Layers

### Layer 1: SELECTR (Game)

**Purpose:** Gamify taste and generate engagement signals

SELECTR is where users prove their musical taste through competition. They "drop" tracks they believe in, enter 1v1 battles against other curators, and let the crowd vote. Winners build reputation; losers learn. Every action generates a signal that feeds into CANORA.

**Key Concepts:**
- **Drops** — Submitting tracks you stand behind
- **Battles** — Head-to-head track competitions
- **Conviction** — How confident you are in your votes (0-100)
- **Reputation** — Your track record as a tastemaker

**Outputs:**
- Engagement signals: `vote`, `drop`, `battle_win`, `battle_loss`, `mission_complete`
- Player reputation scores
- Track performance metrics

---

### Layer 2: CANORA (Credentialing)

**Purpose:** Curate and credential works through an irreversible pipeline

CANORA is the institutional archive. It receives engagement signals from SELECTR and uses them to inform discovery, but the real work is human curation. Works move through three tiers:

| Tier | Name | Description |
|------|------|-------------|
| 1 | **JAM** | Raw submissions. Anyone can contribute. Impermanent by default. |
| 2 | **PLATE** | Curator-reviewed works deemed notable. Reversible promotion. |
| 3 | **CANON** | Permanently preserved. Irreversible. A cultural commitment. |

**Key Concepts:**
- **Shadow Score** — How underground/undiscovered a track is (rarity metric)
- **Novelty Score** — How experimental/unique a track is
- **Lineage** — The creative genealogy (forks, remixes, derivations)
- **CTAD** — Creative Track Attribution Data (universal metadata standard)

**Outputs:**
- CANON works ready for blockchain registration
- Discovery recommendations via emotion/shadow/novelty search
- Attribution and lineage data

---

### Layer 3: ISSUANCE (Settlement)

**Purpose:** Register assets on blockchain with fractional ownership and settlement rules

ISSUANCE transforms CANON works into verifiable digital assets. Each asset gets a unique fingerprint, ownership can be fractionalized, and rights settle according to programmable rules.

**Key Concepts:**
- **SINC Fingerprint** — Unique audio hash for verification
- **Fractions** — ERC-1155 tokens representing partial ownership (2-10,000 pieces)
- **Settlement Rules** — When and how rights/payments resolve (IMMEDIATE, ON_FIRST_PLAY, ON_TRANSFER, CUSTOM)
- **Soulbound NFTs** — Non-transferable stakes earned through platform engagement

**Outputs:**
- On-chain asset registry (Polygon)
- Fractional ownership tokens
- Settlement event logs
- Provenance verification

---

## Data Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                        │
└──────────────────────────────────────────────────────────────────────────────┘

User drops track on SELECTR
         │
         ▼
┌─────────────────┐
│    SELECTR      │
│                 │
│ Creates Drop    │───────────────────────┐
│ (auto-approved) │                       │
└────────┬────────┘                       │
         │                                │
         │ POST /api/v1/works             │
         │ (create JAM work)              │
         ▼                                │
┌─────────────────┐                       │
│    CANORA       │                       │
│                 │                       │
│ Work created    │                       │
│ as JAM status   │                       │
└────────┬────────┘                       │
         │                                │
         │ ◄──────────────────────────────┘
         │  POST /api/v1/works/[id]/signal
         │  (votes, drops, battle results)
         │
         ▼
┌─────────────────┐
│    CANORA       │
│                 │
│ Shadow score    │
│ updated from    │
│ engagement      │
│                 │
│ Curator promotes│
│ JAM → PLATE     │
│ PLATE → CANON   │
└────────┬────────┘
         │
         │ work.canonized webhook
         │ POST /api/v1/webhooks/canora
         ▼
┌─────────────────┐
│   ISSUANCE      │
│                 │
│ Asset created   │
│ SINC fingerprint│
│ Blockchain reg  │
│                 │
│ Fractionalize   │
│ if desired      │
│                 │
│ Settlement on   │
│ trigger events  │
└─────────────────┘
```

---

## Signal Types

SELECTR sends the following signals to CANORA:

| Signal | Description | Shadow Impact |
|--------|-------------|---------------|
| `vote` | User voted in a battle | Slight decrease (more popular) |
| `drop` | User submitted as a drop | Significant decrease |
| `battle_win` | Track won a battle | Moderate decrease |
| `battle_loss` | Track lost a battle | None |
| `mission_complete` | Related mission completed | None |

Shadow score calculation: `1 / log(totalEngagement + 2)` — higher engagement = lower shadow score (more discovered).

---

## API Integration Points

### SELECTR → CANORA

**Create Work (on drop approval):**
```
POST /api/v1/works
Authorization: Bearer {CANORA_API_KEY}

{
  "title": "Track Name",
  "artistName": "Artist",
  "audioUrl": "https://...",
  "source": "SELECTR",
  "externalId": "selectr_drop_123"
}
```

**Send Signal (on engagement):**
```
POST /api/v1/works/{canoraWorkId}/signal
Authorization: Bearer {CANORA_API_KEY}

{
  "type": "vote",
  "userId": "user_abc",
  "metadata": {
    "battleId": "battle_xyz",
    "conviction": 85
  }
}
```

---

### CANORA → ISSUANCE

**Webhook (on canonization):**
```
POST /api/v1/webhooks/canora
X-Canora-Signature: sha256={hmac}

{
  "event": "work.canonized",
  "workId": "work_123",
  "data": {
    "title": "...",
    "artistName": "...",
    "audioUrl": "...",
    "ctad": { ... },
    "contributions": [ ... ],
    "lineage": [ ... ],
    "provenance": { ... }
  }
}
```

---

### ISSUANCE → External

**Convicta/Palmlion Webhooks (mission completion):**
```
POST /webhooks/convicta/mint
X-Convicta-Signature: sha256={hmac}

{
  "event": "mission.completed",
  "userId": "...",
  "walletAddress": "0x...",
  "artistName": "...",
  "stakePercentage": 21,  // basis points (0.21%)
  "campaignId": "...",
  "missionId": "..."
}
```

---

## Environment Configuration

Each service requires specific environment variables to connect:

### SELECTR
```bash
CANORA_API_URL=https://canora.vercel.app
CANORA_API_KEY=your_api_key
ISSUANCE_API_URL=https://issuance.vercel.app  # Future
ISSUANCE_API_KEY=your_api_key                 # Future
```

### CANORA
```bash
ETHERFEED_URL=https://etherfeed.vercel.app    # Optional audio analysis
# CANORA doesn't call ISSUANCE directly; uses webhook
```

### ISSUANCE
```bash
CANORA_API_URL=https://canora.vercel.app      # For fetching work details
CANORA_API_KEY=your_api_key
CANORA_WEBHOOK_SECRET=shared_secret           # HMAC verification
CONVICTA_WEBHOOK_SECRET=your_secret
PALMLION_WEBHOOK_SECRET=your_secret
```

---

## Repositories

| Service | Repository | Description |
|---------|------------|-------------|
| SELECTR | [github.com/bomac1193/selectr](https://github.com/bomac1193/selectr) | Taste battle game (Next.js) |
| CANORA | [github.com/bomac1193/canora](https://github.com/bomac1193/canora) | Credentialing archive (Next.js) |
| ISSUANCE | [github.com/bomac1193/issuance](https://github.com/bomac1193/issuance) | Settlement layer (FastAPI + Next.js + Solidity) |
| ETHERFEED | [github.com/bomac1193/etherfeed](https://github.com/bomac1193/etherfeed) | Audio analysis (Python + Essentia) |

---

## Architecture Principles

1. **Irreversibility at the Top** — CANON status is permanent. This forces accountability.

2. **Signals Flow Up** — Engagement in SELECTR informs CANORA, which graduates to ISSUANCE. Data flows in one direction.

3. **Graceful Degradation** — Each layer can function independently. CANORA works without SELECTR signals. ISSUANCE works without CANORA webhooks.

4. **Curator Accountability** — Every promotion decision is signed and immutable. No anonymous gatekeeping.

5. **Fingerprint-Based Identity** — Audio is identified by its acoustic fingerprint (SINC), not filename or metadata.

6. **Progressive Decentralization** — Starts with centralized curation (human curators), moves to on-chain registration (blockchain), with fractional ownership enabling community governance.

---

## Current Status

| Integration | Status | Notes |
|-------------|--------|-------|
| SELECTR → CANORA signals | ✅ Working | Votes, drops, battles sync |
| CANORA curation pipeline | ✅ Working | JAM → PLATE → CANON |
| CANORA → ISSUANCE webhook | ✅ Working | work.canonized events |
| ISSUANCE asset registration | ✅ Working | Blockchain registry |
| Fractional ownership | ✅ Working | ERC-1155 on Polygon |
| Soulbound NFT minting | ✅ Working | Convicta/Palmlion |
| Etherfeed audio analysis | ⏸️ Optional | Graceful fallback |
| External clearance (Audible Magic) | ⏸️ Stubbed | Placeholder adapters |

---

## Future Roadmap

1. **Cross-Service Discovery** — SELECTR matchmaking informed by CANORA shadow scores
2. **Automated Promotion** — AI-assisted curation suggestions based on engagement patterns
3. **DAO Governance** — Fraction holders vote on archive policies
4. **Multi-Chain Support** — Expand beyond Polygon to other L2s
5. **Federation** — Allow multiple CANORA instances with cross-archive discovery

---

*Built for the age of infinite content.*
