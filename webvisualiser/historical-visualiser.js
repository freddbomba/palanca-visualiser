// historical-visualiser.js — historical visualiser script
// Requires: wallets.js (WALLET_CONFIG), cytoscape.js

function isCenter(id) { return id in WALLET_CONFIG; }

// ── Constants ────────────────────────────────────────────────────
const DEFAULT_JETTON = 'EQD0XmxQk5KxrKzz6HFrPZFHWcf_BQH-vuUM0o4ULvjTfOcy';
const TONAPI_BASE = 'https://tonapi.io';

// ── Demo Data (13-node sample graph) ─────────────────────────────
const DEMO_DATA = {
    nodes: [
        { data: { id: 'distributor', label: 'Main Distributor', role: 'Issuer', connections: 9, balance: 10000 } },
        { data: { id: 'walletA', label: 'Wallet A', role: 'Participant', connections: 4, balance: 800 } },
        { data: { id: 'walletB', label: 'Wallet B', role: 'Participant', connections: 2, balance: 500 } },
        { data: { id: 'walletC', label: 'Wallet C', role: 'Participant', connections: 2, balance: 200 } },
        { data: { id: 'walletD', label: 'Wallet D', role: 'Participant', connections: 2, balance: 100 } },
        { data: { id: 'walletE', label: 'Wallet E', role: 'Participant', connections: 1, balance: 50 } },
        { data: { id: 'walletF', label: 'Wallet F', role: 'Participant', connections: 1, balance: 300 } },
        { data: { id: 'walletG', label: 'Wallet G', role: 'Participant', connections: 1, balance: 300 } },
        { data: { id: 'walletH', label: 'Wallet H', role: 'Participant', connections: 1, balance: 100 } },
        { data: { id: 'walletI', label: 'Wallet I', role: 'Participant', connections: 1, balance: 100 } },
        { data: { id: 'walletJ', label: 'Wallet J', role: 'Participant', connections: 1, balance: 300 } },
        { data: { id: 'walletK', label: 'Wallet K', role: 'Participant', connections: 1, balance: 100 } },
        { data: { id: 'walletL', label: 'Wallet L', role: 'Participant', connections: 1, balance: 100 } }
    ],
    edges: [
        { data: { id: 'edge1',  source: 'distributor', target: 'walletA', amount: 300 } },
        { data: { id: 'edge2',  source: 'distributor', target: 'walletA', amount: 300 } },
        { data: { id: 'edge3',  source: 'distributor', target: 'walletB', amount: 500 } },
        { data: { id: 'edge4',  source: 'distributor', target: 'walletF', amount: 300 } },
        { data: { id: 'edge5',  source: 'distributor', target: 'walletG', amount: 300 } },
        { data: { id: 'edge6',  source: 'distributor', target: 'walletH', amount: 100 } },
        { data: { id: 'edge7',  source: 'distributor', target: 'walletI', amount: 100 } },
        { data: { id: 'edge8',  source: 'distributor', target: 'walletJ', amount: 300 } },
        { data: { id: 'edge9',  source: 'distributor', target: 'walletK', amount: 100 } },
        { data: { id: 'edge10', source: 'distributor', target: 'walletL', amount: 100 } },
        { data: { id: 'edge11', source: 'walletA',     target: 'walletD', amount: 100 } },
        { data: { id: 'edge12', source: 'walletB',     target: 'walletC', amount: 100 } },
        { data: { id: 'edge13', source: 'walletC',     target: 'walletA', amount: 100 } }
    ]
};

// ── State ────────────────────────────────────────────────────────
let cy = null;
let fetchAbort = null;

// ── DOM refs ─────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const statusEl         = $('status-text');
const progressContainer = $('progress-container');
const progressBar       = $('progress-bar');
const settingsPanel     = $('settings-panel');
const jettonInput       = $('jetton-input');
const apikeyInput       = $('apikey-input');
const nodeInfoPanel     = $('node-info');

// ── Helpers ──────────────────────────────────────────────────────
function setStatus(msg) { statusEl.textContent = msg; }

function setProgress(pct) {
    progressContainer.style.display = pct < 0 ? 'none' : 'block';
    progressBar.style.width = Math.max(0, Math.min(100, pct)) + '%';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function truncateAddress(addr) {
    if (!addr) return '?';
    if (addr.length <= 14) return addr;
    return addr.slice(0, 6) + '\u2026' + addr.slice(-4);
}

function getLabel(address) {
    const cfg = WALLET_CONFIG[address];
    if (cfg && cfg.label) return cfg.label;
    const stored = localStorage.getItem('pal_label_' + address);
    if (stored) return stored;
    return truncateAddress(address);
}

function saveLabel(address, name) {
    localStorage.setItem('pal_label_' + address, name);
}

function formatDate(ts) {
    const d = new Date(ts * 1000);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

// ── API ──────────────────────────────────────────────────────────
async function apiGet(path, signal) {
    const url = TONAPI_BASE + path;
    const headers = { 'Accept': 'application/json' };
    const apiKey = apikeyInput.value.trim();
    if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;
    const resp = await fetch(url, { headers, signal });
    if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error('API ' + resp.status + ': ' + text.slice(0, 200));
    }
    return resp.json();
}

async function fetchHolders(jetton, signal) {
    const holders = [];
    let offset = 0;
    const limit = 1000;
    while (true) {
        const data = await apiGet(
            '/v2/jettons/' + encodeURIComponent(jetton) + '/holders?limit=' + limit + '&offset=' + offset,
            signal
        );
        const batch = data.addresses || [];
        holders.push(...batch);
        if (batch.length < limit) break;
        offset += batch.length;
        await sleep(1100);
    }
    return holders;
}

async function fetchTransfersForHolder(ownerAddress, jetton, signal) {
    const events = [];
    let beforeLt = null;
    const limit = 100;
    while (true) {
        let path = '/v2/accounts/' + encodeURIComponent(ownerAddress) +
                   '/jettons/' + encodeURIComponent(jetton) +
                   '/history?limit=' + limit;
        if (beforeLt) path += '&before_lt=' + beforeLt;
        const data = await apiGet(path, signal);
        const batch = data.events || [];
        events.push(...batch);
        if (batch.length < limit || !data.next_from) break;
        beforeLt = data.next_from;
        await sleep(1100);
    }
    return events;
}

// ── Transform ────────────────────────────────────────────────────
function transformToGraphData(holders, allEvents) {
    const seen = new Set();
    const transfers = [];
    let decimals = 9;

    for (const event of allEvents) {
        for (const action of (event.actions || [])) {
            if (action.type !== 'JettonTransfer' || !action.JettonTransfer) continue;
            const t = action.JettonTransfer;
            if (!t.sender || !t.recipient) continue;

            const sender = t.sender.address;
            const recipient = t.recipient.address;
            const dedupeKey = event.event_id + ':' + sender + ':' + recipient;
            if (seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);

            if (t.jetton && t.jetton.decimals !== undefined) {
                decimals = t.jetton.decimals;
            }

            const amount = Number(t.amount || '0') / Math.pow(10, decimals);
            transfers.push({ sender, recipient, amount, eventId: event.event_id, timestamp: event.timestamp });
        }
    }

    const addressSet = new Set();
    for (const h of holders) {
        if (h.owner && h.owner.address) addressSet.add(h.owner.address);
    }
    for (const t of transfers) {
        addressSet.add(t.sender);
        addressSet.add(t.recipient);
    }

    const balanceMap = {};
    for (const h of holders) {
        if (h.owner && h.owner.address) {
            balanceMap[h.owner.address] = Number(h.balance || '0') / Math.pow(10, decimals);
        }
    }

    const connectionCount = {};
    const outgoingCount = {};
    for (const addr of addressSet) {
        connectionCount[addr] = 0;
        outgoingCount[addr] = 0;
    }
    for (const t of transfers) {
        connectionCount[t.sender]    = (connectionCount[t.sender] || 0) + 1;
        connectionCount[t.recipient] = (connectionCount[t.recipient] || 0) + 1;
        outgoingCount[t.sender]      = (outgoingCount[t.sender] || 0) + 1;
    }

    const sorted = Object.entries(outgoingCount)
        .filter(([, c]) => c > 0)
        .sort((a, b) => b[1] - a[1]);
    const issuerCount = Math.max(1, Math.ceil(sorted.length * 0.2));
    const issuerSet = new Set(sorted.slice(0, issuerCount).map(([addr]) => addr));

    const nodes = [];
    for (const addr of addressSet) {
        nodes.push({
            data: {
                id: addr,
                label: getLabel(addr),
                role: issuerSet.has(addr) ? 'Issuer' : 'Participant',
                connections: connectionCount[addr] || 0,
                balance: balanceMap[addr] || 0
            }
        });
    }

    const edges = transfers.map((t, i) => ({
        data: {
            id: 'e' + i + '_' + t.eventId.slice(0, 8),
            source: t.sender,
            target: t.recipient,
            amount: t.amount,
            date: t.timestamp ? formatDate(t.timestamp) : ''
        }
    }));

    return { nodes, edges };
}

// ── Render ───────────────────────────────────────────────────────
function renderGraph(data) {
    if (cy) cy.destroy();

    cy = cytoscape({
        container: document.getElementById('cy'),
        elements: data,
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': function(ele) {
                        if (isCenter(ele.data('id'))) return '#ffffff';
                        var role = ele.data('role');
                        var bal  = ele.data('balance') || 0;
                        if (role === 'Issuer') return '#ff6b6b';
                        if (bal > 1000) return '#4dabf7';
                        return '#69db7c';
                    },
                    'border-width': function(ele) {
                        if (!isCenter(ele.data('id'))) return 0;
                        var conn = ele.data('connections') || 1;
                        return Math.max(3, Math.min(10, conn * 1.5));
                    },
                    'border-color': function(ele) {
                        var cfg = WALLET_CONFIG[ele.data('id')];
                        return (cfg && cfg.color) ? cfg.color : '#333';
                    },
                    'label': function(ele) {
                        var cfg = WALLET_CONFIG[ele.data('id')];
                        var name = (cfg && cfg.label) ? cfg.label : ele.data('label');
                        var bal = ele.data('balance');
                        if (bal != null && bal > 0) return name + '\n' + bal.toLocaleString() + ' PAL';
                        return name;
                    },
                    'width': function(ele) {
                        if (isCenter(ele.data('id'))) {
                            var conn = ele.data('connections') || 1;
                            return 30 + conn * 6;
                        }
                        var bal = ele.data('balance') || 0;
                        if (bal > 0) return 25 + 12 * Math.log10(bal);
                        return 30 + (ele.data('connections') || 0) * 5;
                    },
                    'height': function(ele) {
                        if (isCenter(ele.data('id'))) {
                            var conn = ele.data('connections') || 1;
                            return 30 + conn * 6;
                        }
                        var bal = ele.data('balance') || 0;
                        if (bal > 0) return 25 + 12 * Math.log10(bal);
                        return 30 + (ele.data('connections') || 0) * 5;
                    },
                    'font-size': '12px',
                    'color': '#242931',
                    'text-outline-color': '#fff',
                    'text-outline-width': '2px',
                    'text-wrap': 'wrap',
                    'text-max-width': '100px',
                    'text-valign': 'bottom',
                    'text-margin-y': 5
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': function(ele) {
                        return Math.max(1, Math.min(5, ele.data('amount') / 100));
                    },
                    'line-color': function(ele) {
                        return ele.data('amount') >= 300 ? '#ffb700' : '#acb3c2';
                    },
                    'target-arrow-color': function(ele) {
                        return ele.data('amount') >= 300 ? '#ffb700' : '#acb3c2';
                    },
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'opacity': 0.8,
                    'label': function(ele) {
                        var amt = ele.data('amount');
                        var date = ele.data('date');
                        return amt + (date ? '\n' + date : '');
                    },
                    'font-size': '9px',
                    'color': '#667189',
                    'text-outline-color': '#fff',
                    'text-outline-width': '1px',
                    'text-rotation': 'autorotate',
                    'text-wrap': 'wrap',
                    'text-max-width': '100px'
                }
            },
            {
                selector: 'node.highlighted',
                style: { 'border-width': 3, 'border-color': '#242931' }
            },
            {
                selector: 'node.dimmed',
                style: { 'opacity': 0.15 }
            },
            {
                selector: 'edge.dimmed',
                style: { 'opacity': 0.05 }
            }
        ],
        layout: {
            name: 'cose',
            padding: 50,
            animate: true,
            animationDuration: 1000
        }
    });

    cy.on('tap', 'node', function(evt) {
        var node = evt.target;
        var neighborhood = node.closedNeighborhood();

        cy.elements().removeClass('highlighted dimmed');
        cy.elements().not(neighborhood).addClass('dimmed');
        neighborhood.nodes().addClass('highlighted');

        $('node-info-label').textContent = node.data('label');
        $('node-info-role').textContent = node.data('role');
        $('node-info-balance').textContent = node.data('balance') ? node.data('balance').toLocaleString() + ' PAL' : '-';
        $('node-info-connections').textContent = node.data('connections');
        $('node-info-type').textContent = isCenter(node.data('id')) ? 'Center' : 'Individual';
        $('node-info-address').textContent = node.data('id');
        nodeInfoPanel.classList.add('visible');
    });

    cy.on('tap', function(evt) {
        if (evt.target === cy) {
            cy.elements().removeClass('highlighted dimmed');
            nodeInfoPanel.classList.remove('visible');
        }
    });

    cy.on('dbltap', 'node', function(evt) {
        var node = evt.target;
        var addr = node.data('id');
        var current = node.data('label');
        var newName = prompt('Rename node (' + truncateAddress(addr) + '):', current);
        if (newName !== null && newName.trim() !== '') {
            saveLabel(addr, newName.trim());
            node.data('label', newName.trim());
        }
    });

    setStatus('Loaded: ' + cy.nodes().length + ' wallets, ' + cy.edges().length + ' transfers');
}

// ── Orchestration ────────────────────────────────────────────────
async function fetchAndRender() {
    var jetton = jettonInput.value.trim() || DEFAULT_JETTON;
    var controller = new AbortController();
    fetchAbort = controller;

    try {
        $('fetch-btn').disabled = true;
        $('demo-btn').disabled = true;
        setProgress(0);
        setStatus('Fetching holders\u2026');

        var holders = await fetchHolders(jetton, controller.signal);
        setStatus('Found ' + holders.length + ' holders. Fetching transfer history\u2026');
        setProgress(10);

        await sleep(1100);

        var allEvents = [];
        for (var i = 0; i < holders.length; i++) {
            var owner = holders[i].owner ? holders[i].owner.address : null;
            if (!owner) continue;

            setStatus('Fetching transfers: ' + (i + 1) + '/' + holders.length +
                      ' (' + getLabel(owner) + ')');
            setProgress(10 + (80 * i / holders.length));

            try {
                var events = await fetchTransfersForHolder(owner, jetton, controller.signal);
                allEvents.push(...events);
            } catch (e) {
                if (e.name === 'AbortError') throw e;
                console.warn('Failed to fetch history for ' + owner + ':', e.message);
            }

            if (i < holders.length - 1) await sleep(1100);
        }

        setStatus('Processing data\u2026');
        setProgress(95);

        var graphData = transformToGraphData(holders, allEvents);
        setProgress(100);

        renderGraph(graphData);
    } catch (e) {
        if (e.name === 'AbortError') {
            setStatus('Fetch cancelled.');
        } else {
            setStatus('Error: ' + e.message);
            console.error(e);
        }
    } finally {
        setProgress(-1);
        $('fetch-btn').disabled = false;
        $('demo-btn').disabled = false;
        fetchAbort = null;
    }
}

function loadDemoData() {
    renderGraph(DEMO_DATA);
}

function applyLayout(name) {
    if (!cy) return;
    cy.layout({ name: name, animate: true, animationDuration: 1000, padding: 50 }).run();
}

// ── Init ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    jettonInput.value = DEFAULT_JETTON;

    $('fetch-btn').addEventListener('click', fetchAndRender);
    $('demo-btn').addEventListener('click', loadDemoData);

    $('settings-btn').addEventListener('click', function() {
        settingsPanel.classList.toggle('visible');
    });

    $('cose-layout').addEventListener('click',   function() { applyLayout('cose'); });
    $('circle-layout').addEventListener('click', function() { applyLayout('circle'); });
    $('grid-layout').addEventListener('click',   function() { applyLayout('grid'); });
    $('reset-view').addEventListener('click',    function() { if (cy) cy.fit(); });
});
