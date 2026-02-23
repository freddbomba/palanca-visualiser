# TON Palanca Explorer

Interactive visualizer for the Palanca (PAL) token network on the TON blockchain.
Renders wallet addresses as nodes and token transfers as directed edges using Cytoscape.js, with live data fetched from TONAPI.

Started by fredd — 30 Jan 2026

## Quick Start

No build tools required. Open any HTML file directly in a browser:

| File | Purpose |
|---|---|
| `webvisualiser/palanca-network.html` | Main visualizer (live TONAPI fetch + demo fallback) |
| `webvisualiser/dynemica-PAL-visualiser.html` | Dynamic visualizer with center/individual distinction |
| `webvisualiser/test.html` | Minimal 3-node test page |

## Visual Encoding

### dynemica-PAL-visualiser

Nodes are split into two categories configured via `WALLET_CONFIG`:

- **Centers** (listed in `WALLET_CONFIG`) — hollow rings with a colored border and white fill. Their size is proportional to the number of exchanges (connections) they have made, and their border thickness also scales with connections.
- **Individuals** (all other wallets) — solid-filled nodes colored by role (red = Issuer, blue = large holder, green = regular). Their size scales logarithmically with tokens held.

Edge color encodes transaction age: hot orange for recent, warm orange for mid-age, gray for old.

### palanca-network

- Node color: red = Issuer (top 20% by outgoing transfers), blue = Participant
- Node size: scales with connection count
- Edge width: scales with transfer amount; orange for amounts >= 300, gray otherwise

## Architecture

Three-step pipeline: **Get Data → Structure Data → Visualize**

1. Fetch TON token holders and transfer history via TONAPI v2
2. Parse, deduplicate, and build Cytoscape.js elements
3. Render interactive force-directed graph

## External Dependencies

- [Cytoscape.js v3.26.0](https://js.cytoscape.org/) (loaded from cdnjs)
