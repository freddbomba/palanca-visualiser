// Known wallet addresses — edit this file to add or rename wallets.
// Format: address → { label: 'Display Name', color: '#hex' }
// color is used by historical-visualiser for center-node border color.
const WALLET_CONFIG = {
    '0:8d8ee815d0e2265b039d0988fd2da1faf6b5b09faeacb0d747e7b9812c35160a': { label: 'Distributor', color: '#e03131' },
    '0:f052d42119cdb8b0f591e97c6a1e0820b5e51cb6353ec38410f6db9288d4aa6d': { label: 'Fredd',       color: '#1971c2' },
    '0:55396fb5de9a216362a30a6384e3111c8709a87c5ec643954c522bd5ccdd9302': { label: 'Raffa',       color: '#2f9e44' },
    '0:b98a53b2649450699e58b7e6555934dc2fff3f34721031d0640a90461d082d12': { label: 'Brigata',     color: '#7048e8' },
    // Demo-mode node IDs (used in Load Demo Data)
    'distributor': { label: 'Main Distributor', color: '#e03131' },
    'walletA':     { label: 'Wallet A',         color: '#1971c2' },
};
