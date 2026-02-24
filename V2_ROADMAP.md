# Version 2 Roadmap

Branch `v2` — development of the next iteration of the Palanca token network visualizer.

## v1 baseline (tagged as v1.0.0)

- Single-page HTML + CSS + inline JS
- TONAPI v2: holders + transfer history per holder
- Cytoscape.js force-directed graph
- Fetch live data / Load demo / Save JSON
- Node click (highlight neighborhood), double-click (rename, localStorage)
- Layouts: COSE, circle, grid

---

## Implemented (v2)

| Feature | Description |
|--------|-------------|
| **Permanent pseudonyms** | `wallet-labels.json` in repo; fetch at load; "Claim pseudonym" UI with PR instructions |

---

## Proposed v2 enhancements

### High priority

| Feature | Description |
|--------|-------------|
| **Time range filter** | Filter transfers by date (e.g. last 7/30/90 days, custom range) |
| **Split code** | Extract JS into `app.js`, keep HTML lean; optional CSS modules |
| **Search / filter** | Search by address or label; filter nodes by balance/connections |
| **Non-blocking fetch** | Web Worker or chunked async for API calls so UI stays responsive |

### Medium priority

| Feature | Description |
|--------|-------------|
| **i18n** | English/Italian toggle (v1 has mixed Italian in "Come funziona") |
| **Responsive layout** | Better behaviour on small screens |
| **Dark mode** | Theme toggle |
| **Export labels** | Export/import wallet labels (JSON) instead of localStorage-only |

### Nice to have

| Feature | Description |
|--------|-------------|
| **Time animation** | Animate transfers over time (slider) |
| **Configurable WALLET_CONFIG** | Load centers from JSON file or UI |
| **Multiple jettons** | Compare or switch between different tokens |
| **Error retry** | Retry failed API requests with backoff |

---

## Development approach

- Keep v1 working; v2 evolves in `v2` branch
- No build step initially; add bundler only if needed
- Reuse existing TONAPI integration and transform logic
