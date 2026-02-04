# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TON-Palanca-Explorer is a browser-based interactive visualizer for the Palanca token network on the TON (The Open Network) blockchain. It renders wallet addresses as nodes and token transfers as directed edges using Cytoscape.js, with live data fetched from TONAPI.

## Running the Application

No build system, package manager, or server is required. Open the HTML files directly in a browser:

- `webvisualiser/palanca-network.html` — Main visualization (live TONAPI fetch + demo fallback)
- `webvisualiser/test.html` — Minimal 3-node test page

There are no automated tests, linting, or CI/CD pipelines configured.

## Architecture

The project implements a 3-step pipeline (documented in `deepseek_mermaid_20260130_ee9aa7.mermaid`):

1. **Get Data** — Fetch TON token holders and transfer history via TONAPI v2 endpoints
2. **Structure Data** — Parse API responses, deduplicate transfers, and build Cytoscape.js nodes/edges
3. **Visualize** — Render interactive graph with Cytoscape.js

All three steps are implemented in `palanca-network.html`. A "Load Demo Data" button provides the original 13-node hardcoded graph as a fallback.

### API Integration

- **Holders**: `GET /v2/jettons/{jetton}/holders` — offset-based pagination, limit 1000
- **Transfer history**: `GET /v2/accounts/{owner}/jettons/{jetton}/history` — cursor-based pagination via `before_lt`, limit 100
- Deduplication by `event_id + sender + recipient` (same transfer appears in both parties' history)
- Free tier: 1 RPS (1.1s sleep between requests). Optional API key field for faster fetching.
- Default jetton: `EQD0XmxQk5KxrKzz6HFrPZFHWcf_BQH-vuUM0o4ULvjTfOcy` (PAL)

### Key Functions

| Function | Purpose |
|---|---|
| `apiGet(path, signal)` | Fetch wrapper with optional Bearer auth and AbortController |
| `fetchHolders(jetton, signal)` | Paginated holder list from TONAPI |
| `fetchTransfersForHolder(owner, jetton, signal)` | Cursor-paginated transfer history per holder |
| `transformToGraphData(holders, events)` | API data → Cytoscape nodes/edges with deduplication |
| `renderGraph(data)` | Create/recreate Cytoscape instance with event handlers |
| `fetchAndRender()` | Orchestrator: fetch → transform → render with progress |

### Data Model

- **Nodes**: `{ id: address, label, role: 'Issuer'|'Participant', connections: number }`
- **Edges**: `{ id, source, target, amount: number }` — amount is the token transfer size (decimal-adjusted)

### Wallet Naming

- `WALLET_LABELS` object at top of script maps raw addresses (`0:hex`) to friendly names
- Users can double-click any node to rename it; stored in `localStorage` (key: `pal_label_{address}`)
- Priority: `WALLET_LABELS` → `localStorage` → truncated address

### Visual Encoding

- Node color: red = Issuer (top 20% by outgoing transfer count), blue = Participant
- Node size: scales with `connections` count
- Edge width: scales with transfer `amount` (capped via `Math.min(5, amount/100)`)
- Edge color: orange for amounts >= 300, gray otherwise
- Layouts: COSE (force-directed), circle, grid — switchable via UI buttons

### UI Features

- **Fetch Live Data** button with progress bar and status messages
- **Load Demo Data** button for the original hardcoded 13-node graph
- **Settings panel** (toggle) with jetton address and API key inputs
- **Node click** highlights neighborhood, dims others, shows info panel
- **Node double-click** opens rename prompt (persisted to localStorage)

### External Dependencies

Single CDN dependency: Cytoscape.js v3.26.0 loaded from cdnjs.
