# TON Palanca Explorer

Interactive visualizer for the Palanca (PAL) token network on the TON blockchain.

**v1** (tag `v1.0.0`) — stable. **v2** — in development on branch `v2`; see [V2_ROADMAP.md](V2_ROADMAP.md).
Renders wallet addresses as nodes and token transfers as directed edges using Cytoscape.js, with live data fetched from TONAPI.

Started by fredd — 30 Jan 2026

## Quick Start

No build tools required. Open any HTML file directly in a browser:

| File | Purpose |
|---|---|
| `webvisualiser/index.html` | Main visualizer (live TONAPI fetch + demo fallback) |

## Visual Encoding

### Dynamic Visualiser

Nodes are split into two categories configured via `WALLET_CONFIG`:

- **Centers** (listed in `WALLET_CONFIG`) — hollow rings with a colored border and white fill. Their size is proportional to the number of exchanges (connections) they have made, and their border thickness also scales with connections.
- **Individuals** (all other wallets) — solid-filled nodes colored by role (red = Issuer, blue = large holder, green = regular). Their size scales logarithmically with tokens held.

Edge color: orange for amounts >= 300, gray otherwise.

## Architecture

Three-step pipeline: **Get Data → Structure Data → Visualize**

1. Fetch TON token holders and transfer history via TONAPI v2
2. Parse, deduplicate, and build Cytoscape.js elements
3. Render interactive force-directed graph

## External Dependencies

- [Cytoscape.js v3.26.0](https://js.cytoscape.org/) (loaded from cdnjs)
