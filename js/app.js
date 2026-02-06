// ===== UTILS =====
class Utils {
    static formatPrice(price) {
        const p = parseFloat(price);
        if (isNaN(p)) return '—';
        if (p >= 1000) return '$' + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (p >= 1) return '$' + p.toFixed(2);
        if (p >= 0.01) return '$' + p.toFixed(4);
        if (p >= 0.0001) return '$' + p.toFixed(6);
        return '$' + p.toFixed(8);
    }

    static formatVolume(vol) {
        const v = parseFloat(vol);
        if (isNaN(v)) return '—';
        if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
        if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
        if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
        return '$' + v.toFixed(0);
    }

    static formatPct(pct) {
        const p = parseFloat(pct);
        if (isNaN(p)) return '—';
        const sign = p > 0 ? '+' : '';
        return sign + p.toFixed(2) + '%';
    }

    static pctColor(pct) {
        const p = parseFloat(pct);
        if (p > 0) return 'price-up';
        if (p < 0) return 'price-down';
        return '';
    }

    static pctIntensity(pct, isGreen) {
        const abs = Math.abs(parseFloat(pct));
        const alpha = Math.min(abs / 20, 1) * 0.4 + 0.05;
        if (isGreen) return `rgba(0, 255, 136, ${alpha})`;
        return `rgba(255, 71, 87, ${alpha})`;
    }

    static tradingViewUrl(symbol) {
        return `https://www.tradingview.com/chart/?symbol=BINANCE:${symbol}`;
    }

    // Exchange trade URLs with referral placeholders
    // Replace YOUR_REF_ID with actual referral codes
    static exchangeTradeUrl(exchange, symbol, base, quote) {
        const urls = {
            coinbase: `https://www.coinbase.com/advanced-trade/spot/${base}-${quote}`,
            kraken: `https://www.kraken.com/prices/${base.toLowerCase()}`,
            mexc: `https://www.mexc.com/exchange/${base}_${quote}?inviteCode=YOUR_MEXC_REF`,
            kucoin: `https://www.kucoin.com/trade/${base}-${quote}?rcode=YOUR_KUCOIN_REF`,
        };
        return urls[exchange] || '#';
    }

    static exchangeLogo(exchange) {
        const logos = {
            coinbase: `<svg class="exchange-logo-svg" viewBox="0 0 100 100" width="20" height="20"><circle cx="50" cy="50" r="45" fill="#0052FF"/><path d="M50 25c-13.8 0-25 11.2-25 25s11.2 25 25 25 25-11.2 25-25-11.2-25-25-25zm-8 32a7 7 0 110-14 7 7 0 010 14z" fill="#fff"/></svg>`,
            kraken: `<svg class="exchange-logo-svg" viewBox="0 0 100 100" width="20" height="20"><rect width="100" height="100" rx="15" fill="#5741D9"/><text x="50" y="62" text-anchor="middle" fill="white" font-size="28" font-weight="bold" font-family="Arial">Kr</text></svg>`,
            mexc: `<svg class="exchange-logo-svg" viewBox="0 0 100 100" width="20" height="20"><rect width="100" height="100" rx="15" fill="#00B897"/><text x="50" y="62" text-anchor="middle" fill="white" font-size="28" font-weight="bold" font-family="Arial">M</text></svg>`,
            kucoin: `<svg class="exchange-logo-svg" viewBox="0 0 100 100" width="20" height="20"><rect width="100" height="100" rx="15" fill="#23AF91"/><text x="50" y="62" text-anchor="middle" fill="white" font-size="28" font-weight="bold" font-family="Arial">K</text></svg>`,
        };
        return logos[exchange] || '';
    }

    static exchangeName(exchange) {
        return { coinbase: 'Coinbase', kraken: 'Kraken', mexc: 'MEXC', kucoin: 'KuCoin' }[exchange] || exchange;
    }

    static timeAgo(ms) {
        const s = Math.floor((Date.now() - ms) / 1000);
        if (s < 1) return 'just now';
        if (s === 1) return '1 second ago';
        return s + ' seconds ago';
    }

    static debounce(fn, ms) {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    }

    static timeframeName(tf) {
        const map = { '1m': '1 min', '5m': '5 min', '15m': '15 min', '30m': '30 min', '1h': '1 hour', '4h': '4 hours', '24h': '24 hours' };
        return map[tf] || tf;
    }

    static timeframeMs(tf) {
        const map = { '1m': 60, '5m': 5*60, '15m': 15*60, '30m': 30*60, '1h': 3600, '4h': 4*3600, '24h': 86400 };
        return (map[tf] || 86400) * 1000;
    }
}

// ===== DATA FETCHER =====
class DataFetcher {
    constructor() {
        this.cache = {};
        this.cacheTTL = 5000;
    }

    async fetchScannerData(exchange, timeframe, market) {
        const key = `scanner_${exchange}_${timeframe}_${market}`;
        if (this.cache[key] && Date.now() - this.cache[key].ts < this.cacheTTL) {
            return this.cache[key].data;
        }
        try {
            const res = await fetch(`/api/scanner/data?exchange=${exchange}&timeframe=${timeframe}&market=${market}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            this.cache[key] = { data, ts: Date.now() };
            return data;
        } catch (e) {
            console.error('Failed to fetch scanner data:', e);
            return this.cache[key]?.data || { data: [], pairs: 0, history: {} };
        }
    }

    async fetchSparkline(exchange, symbol) {
        try {
            const res = await fetch(`/api/scanner/sparkline?exchange=${exchange}&symbol=${encodeURIComponent(symbol)}`);
            if (!res.ok) return [];
            return await res.json();
        } catch (e) {
            return [];
        }
    }

    async fetchStatus(exchange) {
        try {
            const res = await fetch(`/api/scanner/status${exchange ? '?exchange=' + exchange : ''}`);
            return await res.json();
        } catch (e) {
            return null;
        }
    }

    setCacheTTL(ms) {
        this.cacheTTL = Math.max(ms - 1000, 3000);
    }
}

// ===== TABLE RENDERER =====
class TableRenderer {
    constructor() {
        this.previousData = {};
        this.sortStates = {};
        // Feature #6: Track previous rankings
        this.previousRankings = {};
        // Feature #7: Sparkline cache
        this.sparklineCache = {};
    }

    // Feature #7: Render sparkline SVG
    renderSparkline(points, width = 50, height = 20) {
        if (!points || points.length < 2) return '';
        const prices = points.map(p => p.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const range = max - min || 1;

        const coords = prices.map((p, i) => {
            const x = (i / (prices.length - 1)) * width;
            const y = height - ((p - min) / range) * height;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');

        const isUp = prices[prices.length - 1] >= prices[0];
        const color = isUp ? '#00ff88' : '#ff4757';

        return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="sparkline-svg"><polyline points="${coords}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }

    renderTable(tableId, data, columns, options = {}) {
        const table = document.getElementById(tableId);
        if (!table) return;
        const tbody = table.querySelector('tbody');
        const prevData = this.previousData[tableId] || {};
        const prevRankings = this.previousRankings[tableId] || {};

        // Feature #6: Build current rankings
        const currentRankings = {};
        data.forEach((item, idx) => {
            currentRankings[item.symbol] = idx + 1;
        });

        let html = '';
        data.forEach((item, idx) => {
            const rowKey = item.symbol;
            let rowClass = '';
            const prevRank = prevRankings[item.symbol];
            const currentRank = idx + 1;
            if (prevRank !== undefined) {
                const rankDelta = prevRank - currentRank; // positive = moved up
                if (tableId.startsWith('gainers')) {
                    // Flash green only when asset climbs the gainers list
                    if (rankDelta > 0) rowClass = 'flash-green';
                } else if (tableId.startsWith('losers')) {
                    // Flash red only when asset drops further in losers list
                    if (rankDelta < 0) rowClass = 'flash-red';
                } else {
                    // Volume & other tables: flash green when climbing up
                    if (rankDelta > 0) rowClass = 'flash-green';
                }
            }

            const itemExchange = item.exchange || '';
            const base = (item.displaySymbol || item.symbol).split('/')[0];
            const quote = (item.displaySymbol || item.symbol).split('/')[1] || '';
            html += `<tr class="${rowClass}" data-symbol="${item.symbol}" data-exchange="${itemExchange}" data-base="${base}" data-quote="${quote}" onclick="window.cryptoScanner.showTradePopup(event, '${item.symbol}', '${itemExchange}', '${base}', '${quote}')">`;

            columns.forEach(col => {
                switch (col) {
                    case 'rank': {
                        // Feature #6: Rank change arrows
                        let rankHtml = `${idx + 1}`;
                        const prevRank = prevRankings[item.symbol];
                        if (prevRank !== undefined) {
                            const diff = prevRank - (idx + 1);
                            if (diff > 0) {
                                rankHtml += ` <span class="rank-change rank-up">↑${diff}</span>`;
                            } else if (diff < 0) {
                                rankHtml += ` <span class="rank-change rank-down">↓${Math.abs(diff)}</span>`;
                            } else {
                                rankHtml += ` <span class="rank-change rank-same">—</span>`;
                            }
                        }
                        html += `<td>${rankHtml}</td>`;
                        break;
                    }
                    case 'star': {
                        // Feature #12: Star/watchlist
                        const isStarred = options.watchlist && options.watchlist.has(item.symbol);
                        html += `<td><span class="star-btn ${isStarred ? 'starred' : ''}" data-symbol="${item.symbol}" onclick="event.stopPropagation(); window.cryptoScanner.toggleWatchlist('${item.symbol}')">⭐</span></td>`;
                        break;
                    }
                    case 'symbol': {
                        // Feature #12: Star icon inline + Feature #7: Sparkline
                        const isStarred = options.watchlist && options.watchlist.has(item.symbol);
                        const starHtml = `<span class="star-btn ${isStarred ? 'starred' : ''}" data-symbol="${item.symbol}" onclick="event.stopPropagation(); window.cryptoScanner.toggleWatchlist('${item.symbol}')">⭐</span>`;
                        let sparkHtml = '';
                        if (options.showSparklines) {
                            const cached = this.sparklineCache[item.symbol];
                            if (cached) {
                                sparkHtml = ` <span class="sparkline-cell">${this.renderSparkline(cached)}</span>`;
                            }
                        }
                        html += `<td>${starHtml}${item.displaySymbol || item.symbol}${sparkHtml}</td>`;
                        break;
                    }
                    case 'price':
                        html += `<td>${Utils.formatPrice(item.price)}</td>`;
                        break;
                    case 'priceChange': {
                        const cls = Utils.pctColor(item.priceChange);
                        const bg = item.priceChange !== 0
                            ? Utils.pctIntensity(item.priceChange, item.priceChange > 0)
                            : 'transparent';
                        html += `<td class="${cls}" style="background:${bg}">${Utils.formatPct(item.priceChange)}</td>`;
                        break;
                    }
                    case 'change24h': {
                        const cls = Utils.pctColor(item.change24h);
                        html += `<td class="${cls}">${Utils.formatPct(item.change24h)}</td>`;
                        break;
                    }
                    case 'volChange': {
                        const cls = Utils.pctColor(item.volChange);
                        html += `<td class="${cls}">${Utils.formatPct(item.volChange)}</td>`;
                        break;
                    }
                    case 'volume':
                        html += `<td>${Utils.formatVolume(item.volume)}</td>`;
                        break;
                    case 'status': {
                        const stClass = item.status === 'HIGH' ? 'status-high' : 'status-low';
                        const emoji = item.status === 'HIGH' ? '🟢' : '🔴';
                        html += `<td class="${stClass}">${emoji} ${item.status}</td>`;
                        break;
                    }
                    case 'exchange': {
                        // Feature #11: Exchange column
                        html += `<td><span class="exchange-badge">${item.exchange || ''}</span></td>`;
                        break;
                    }
                }
            });
            html += '</tr>';
        });

        tbody.innerHTML = html;

        // Store for flash comparison
        const newPrev = {};
        data.forEach(item => { newPrev[item.symbol] = { price: item.price }; });
        this.previousData[tableId] = newPrev;

        // Feature #6: Store current rankings for next comparison
        this.previousRankings[tableId] = currentRankings;
    }

    setupSortableHeaders(tableId, onSort) {
        const table = document.getElementById(tableId);
        if (!table) return;
        const headers = table.querySelectorAll('th[data-sort]');

        if (!this.sortStates[tableId]) {
            this.sortStates[tableId] = { col: null, asc: false };
        }

        headers.forEach(th => {
            if (!th.querySelector('.sort-arrow')) {
                th.innerHTML += ' <span class="sort-arrow">▲</span>';
            }

            th.addEventListener('click', () => {
                const col = th.dataset.sort;
                const state = this.sortStates[tableId];

                if (state.col === col) {
                    state.asc = !state.asc;
                } else {
                    state.col = col;
                    state.asc = false;
                }

                headers.forEach(h => {
                    h.classList.remove('sort-active');
                    const arrow = h.querySelector('.sort-arrow');
                    if (arrow) arrow.textContent = '▲';
                });
                th.classList.add('sort-active');
                const arrow = th.querySelector('.sort-arrow');
                if (arrow) arrow.textContent = state.asc ? '▲' : '▼';

                onSort(tableId, state.col, state.asc);
            });
        });
    }
}

// ===== ALERT MANAGER =====
class AlertManager {
    constructor() {
        this.config = this.loadConfig();
        this.alerts = this.loadAlerts();
        this.enabled = true;
        this.notificationsPermission = false;
        this.seenAlerts = new Set();
        // Feature #9: Sound
        this.soundEnabled = false;
        this.audioCtx = null;
        this.init();
    }

    init() {
        if ('Notification' in window && Notification.permission === 'granted') {
            this.notificationsPermission = true;
        }
    }

    // Feature #9: Play beep sound
    playBeep() {
        if (!this.soundEnabled) return;
        try {
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.value = 880;
            gain.gain.value = 0.3;
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);
            osc.start(this.audioCtx.currentTime);
            osc.stop(this.audioCtx.currentTime + 0.3);
        } catch (e) {}
    }

    loadConfig() {
        try {
            const saved = localStorage.getItem('cryptoScannerAlertConfig');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return { priceThreshold: 5, timeframe: '15m', volThreshold: 200, desktopNotify: true, alertHighLow: true };
    }

    saveConfig(config) {
        this.config = config;
        localStorage.setItem('cryptoScannerAlertConfig', JSON.stringify(config));
    }

    loadAlerts() {
        try {
            const saved = localStorage.getItem('cryptoScannerAlerts');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return [];
    }

    saveAlerts() {
        if (this.alerts.length > 100) this.alerts = this.alerts.slice(0, 100);
        localStorage.setItem('cryptoScannerAlerts', JSON.stringify(this.alerts));
    }

    clearAlerts() {
        this.alerts = [];
        this.saveAlerts();
    }

    // Feature #13: Export alerts to CSV
    exportToCSV() {
        if (this.alerts.length === 0) return;
        const header = 'Time,Symbol,Description,Volume\n';
        const rows = this.alerts.map(a =>
            `"${a.time}","${a.symbol}","${a.desc.replace(/"/g, '""')}","${a.volume || 0}"`
        ).join('\n');
        const csv = header + rows;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `crypto_alerts_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(perm => {
                this.notificationsPermission = perm === 'granted';
            });
        }
    }

    checkAlerts(data) {
        if (!this.enabled) return;

        data.forEach(item => {
            const absChange = Math.abs(item.priceChange);

            if (absChange >= this.config.priceThreshold) {
                const key = `price_${item.symbol}`;
                if (!this.seenAlerts.has(key)) {
                    this.seenAlerts.add(key);
                    setTimeout(() => this.seenAlerts.delete(key), 120000);

                    this.addAlert({
                        symbol: item.symbol,
                        desc: `${item.priceChange > 0 ? '📈' : '📉'} Moved ${Utils.formatPct(item.priceChange)} in ${Utils.timeframeName(item._timeframe || '24h')}`,
                        volume: item.volume
                    });
                }
            }
        });
    }

    checkHighLowAlerts(items) {
        if (!this.enabled || !this.config.alertHighLow) return;

        items.forEach(item => {
            const key = `hl_${item.symbol}_${item.status}`;
            if (!this.seenAlerts.has(key)) {
                this.seenAlerts.add(key);
                setTimeout(() => this.seenAlerts.delete(key), 300000);

                this.addAlert({
                    symbol: item.symbol,
                    desc: `${item.status === 'HIGH' ? '🟢 24h HIGH' : '🔴 24h LOW'} at ${Utils.formatPrice(item.price)}`,
                    volume: item.volume
                });
            }
        });
    }

    addAlert(alert) {
        const entry = {
            time: new Date().toLocaleTimeString(),
            timestamp: Date.now(),
            symbol: alert.symbol,
            desc: alert.desc,
            volume: alert.volume || 0
        };
        this.alerts.unshift(entry);
        this.saveAlerts();

        // Feature #9: Play sound
        this.playBeep();

        if (this.config.desktopNotify && this.notificationsPermission) {
            try {
                new Notification('Crypto Scanner Alert', {
                    body: `${alert.symbol}: ${alert.desc}`,
                });
            } catch (e) {}
        }

        this.renderAlerts();
    }

    renderAlerts() {
        const log = document.getElementById('alertLog');
        if (!log) return;

        if (this.alerts.length === 0) {
            log.innerHTML = '<div class="alert-empty">No alerts yet. Configure alert rules to get started.</div>';
            return;
        }

        log.innerHTML = this.alerts.slice(0, 50).map(a => `
            <div class="alert-item">
                <span class="alert-time">${a.time}</span>
                <div>
                    <span class="alert-symbol">${a.symbol}</span>
                    <span class="alert-desc">${a.desc}</span>
                </div>
                <span class="alert-vol">${Utils.formatVolume(a.volume)}</span>
            </div>
        `).join('');
    }
}

// ===== CRYPTO SCANNER =====
class CryptoScanner {
    constructor() {
        this.fetcher = new DataFetcher();
        this.renderer = new TableRenderer();
        this.alertManager = new AlertManager();

        this.exchange = 'all';
        this.market = 'USD';
        this.interval = 20000;
        this.searchTerm = '';
        this.lastUpdate = 0;
        this.allData = [];
        this.intervalId = null;
        this.firstLoad = true;

        // Feature #4: Min volume filter
        this.minVolume = 5000000;

        // Feature #5: Results count
        this.resultsCount = 10;

        // Category filter
        this.category = 'all';
        this.categoriesLoaded = false;

        // Split panel system: each panel type can have 1-3 splits, each with its own timeframe
        // panels[type] = [{ id, timeframe }, ...]
        this.panels = {
            gainers: [{ id: 'gainers-0', timeframe: '15m' }],
            losers: [{ id: 'losers-0', timeframe: '15m' }],
            volume: [{ id: 'volume-0', timeframe: '15m' }],
        };
        this.MAX_SPLITS = 3;
        this.allTimeframes = ['24h', '4h', '1h', '30m', '15m', '5m', '1m'];

        // Data cache per timeframe
        this.dataByTimeframe = {};

        // Legacy compat
        this.timeframes = {
            gainers: '15m',
            losers: '15m',
            volume: '15m'
        };

        this.highlowFilter = 'both';

        // Feature #12: Watchlist
        this.watchlist = this.loadWatchlist();
        this.watchlistCollapsed = false;

        // Feature #14: Theme
        this.darkTheme = true;

        // Feature #9: Sound
        this.soundEnabled = false;

        this.init();
    }

    init() {
        // Feature #10: Load persistent settings first
        this.loadSettings();
        this.applyTheme();

        // Build dynamic split panels
        this.buildAllPanels();

        this.bindControls();
        this.setupSortableHeaders();
        this.setupModal();
        this.alertManager.renderAlerts();
        this.alertManager.requestNotificationPermission();
        this.updateHistoryBanner();
        this.renderWatchlist();

        // Feature #3: Show loading overlay
        this.showLoading();

        this.fetchAndRender();
        this.startAutoRefresh();
        this.startTimerUpdate();
    }

    // Feature #3: Loading overlay
    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.remove('hidden');
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.add('hidden');
    }

    // Feature #10: Persistent settings
    loadSettings() {
        try {
            const saved = localStorage.getItem('cryptoScannerSettings');
            if (!saved) return;
            const s = JSON.parse(saved);

            if (s.exchange) this.exchange = s.exchange;
            if (s.market) this.market = s.market;
            if (s.interval) this.interval = s.interval;
            if (s.timeframes) this.timeframes = { ...this.timeframes, ...s.timeframes };
            if (s.minVolume !== undefined) this.minVolume = s.minVolume;
            if (s.resultsCount) this.resultsCount = s.resultsCount;
            if (s.highlowFilter) this.highlowFilter = s.highlowFilter;
            if (s.category) this.category = s.category;
            if (s.panels) {
                // Restore split panel config
                for (const type of ['gainers', 'losers', 'volume']) {
                    if (s.panels[type] && Array.isArray(s.panels[type])) {
                        this.panels[type] = s.panels[type].map((p, i) => ({
                            id: `${type}-${i}`,
                            timeframe: p.timeframe || '15m'
                        }));
                    }
                }
                // Sync legacy timeframes
                this.timeframes.gainers = this.panels.gainers[0].timeframe;
                this.timeframes.losers = this.panels.losers[0].timeframe;
                this.timeframes.volume = this.panels.volume[0].timeframe;
            }
            if (s.darkTheme !== undefined) this.darkTheme = s.darkTheme;
            if (s.soundEnabled !== undefined) {
                this.soundEnabled = s.soundEnabled;
                this.alertManager.soundEnabled = s.soundEnabled;
            }

            // Apply to DOM
            const exchangeRadio = document.querySelector(`input[name="exchange"][value="${this.exchange}"]`);
            if (exchangeRadio) exchangeRadio.checked = true;

            const marketSel = document.getElementById('marketFilter');
            if (marketSel) marketSel.value = this.market;

            const intervalSel = document.getElementById('updateInterval');
            if (intervalSel) intervalSel.value = this.interval;

            const minVolSel = document.getElementById('minVolumeFilter');
            if (minVolSel) minVolSel.value = this.minVolume;

            const resultsSel = document.getElementById('resultsCount');
            if (resultsSel) resultsSel.value = this.resultsCount;

            const hlFilter = document.getElementById('highlowFilter');
            if (hlFilter) hlFilter.value = this.highlowFilter;

            const catSel = document.getElementById('categoryFilter');
            if (catSel) catSel.value = this.category;

            // Timeframe dropdowns are built dynamically by the split panel system

            // Sound toggle
            const soundBtn = document.getElementById('soundToggle');
            if (soundBtn) soundBtn.textContent = this.soundEnabled ? '🔊' : '🔇';

            // Theme toggle
            const themeBtn = document.getElementById('themeToggle');
            if (themeBtn) themeBtn.textContent = this.darkTheme ? '🌙' : '☀️';

            this.fetcher.setCacheTTL(this.interval);
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    }

    saveSettings() {
        const settings = {
            exchange: this.exchange,
            market: this.market,
            interval: this.interval,
            timeframes: this.timeframes,
            minVolume: this.minVolume,
            resultsCount: this.resultsCount,
            highlowFilter: this.highlowFilter,
            category: this.category,
            panels: {
                gainers: this.panels.gainers.map(p => ({ timeframe: p.timeframe })),
                losers: this.panels.losers.map(p => ({ timeframe: p.timeframe })),
                volume: this.panels.volume.map(p => ({ timeframe: p.timeframe })),
            },
            darkTheme: this.darkTheme,
            soundEnabled: this.soundEnabled,
        };
        localStorage.setItem('cryptoScannerSettings', JSON.stringify(settings));
    }

    // Feature #14: Theme toggle
    applyTheme() {
        if (this.darkTheme) {
            document.body.classList.remove('light-theme');
        } else {
            document.body.classList.add('light-theme');
        }
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) themeBtn.textContent = this.darkTheme ? '🌙' : '☀️';
    }

    // Feature #12: Watchlist
    loadWatchlist() {
        try {
            const saved = localStorage.getItem('cryptoScannerWatchlist');
            if (saved) return new Set(JSON.parse(saved));
        } catch (e) {}
        return new Set();
    }

    saveWatchlist() {
        localStorage.setItem('cryptoScannerWatchlist', JSON.stringify([...this.watchlist]));
    }

    toggleWatchlist(symbol) {
        if (this.watchlist.has(symbol)) {
            this.watchlist.delete(symbol);
        } else {
            this.watchlist.add(symbol);
        }
        this.saveWatchlist();
        this.renderWatchlist();
        this.renderAll();
    }

    showTradePopup(event, symbol, exchange, base, quote) {
        event.stopPropagation();

        // Remove any existing popup
        this.hideTradePopup();

        const row = event.currentTarget;
        const rect = row.getBoundingClientRect();

        // Determine which exchanges list this symbol
        const availableExchanges = [];
        
        if (this.exchange === 'all') {
            // In combined view, we know the primary exchange
            // Also check allData for this symbol on other exchanges
            const exchanges = new Set();
            this.allData.forEach(d => {
                if (d.symbol === symbol && d.exchange) exchanges.add(d.exchange);
            });
            // If only found on one (deduplication removed others), just show that one + check data
            if (exchange) exchanges.add(exchange);
            exchanges.forEach(ex => availableExchanges.push(ex));
        } else {
            // Single exchange view — show current exchange
            availableExchanges.push(this.exchange);
        }

        // Always ensure at least the item's exchange is shown
        if (exchange && !availableExchanges.includes(exchange)) {
            availableExchanges.push(exchange);
        }

        // Build popup HTML
        const linksHtml = availableExchanges.map(ex => {
            const url = Utils.exchangeTradeUrl(ex, symbol, base, quote);
            const logo = Utils.exchangeLogo(ex);
            const name = Utils.exchangeName(ex);
            return `<a href="${url}" target="_blank" rel="noopener" class="trade-link" onclick="event.stopPropagation()" title="Trade on ${name}">
                ${logo}
                <span>${name}</span>
            </a>`;
        }).join('');

        // Add TradingView as chart option
        const tvUrl = Utils.tradingViewUrl(symbol);
        const tvLink = `<a href="${tvUrl}" target="_blank" rel="noopener" class="trade-link trade-link-tv" onclick="event.stopPropagation()" title="View chart on TradingView">
            <svg class="exchange-logo-svg" viewBox="0 0 100 100" width="20" height="20"><rect width="100" height="100" rx="15" fill="#2962FF"/><text x="50" y="62" text-anchor="middle" fill="white" font-size="28" font-weight="bold" font-family="Arial">TV</text></svg>
            <span>Chart</span>
        </a>`;

        const popup = document.createElement('div');
        popup.className = 'trade-popup';
        popup.innerHTML = `
            <span class="trade-label">Trade:</span>
            <div class="trade-links">${linksHtml}${tvLink}</div>
        `;

        // Position popup below the clicked row
        document.body.appendChild(popup);

        const popupRect = popup.getBoundingClientRect();
        let top = rect.bottom + window.scrollY + 2;
        let left = rect.left + window.scrollX;

        // Ensure popup doesn't go off-screen right
        if (left + popupRect.width > window.innerWidth) {
            left = window.innerWidth - popupRect.width - 10;
        }
        // Ensure doesn't go off bottom
        if (top + popupRect.height > window.scrollY + window.innerHeight) {
            top = rect.top + window.scrollY - popupRect.height - 2;
        }

        popup.style.top = top + 'px';
        popup.style.left = left + 'px';
        popup.classList.add('visible');

        // Highlight the row
        row.classList.add('trade-row-active');
        this._activeTradeRow = row;

        // Click outside to close
        this._tradePopupClose = (e) => {
            if (!popup.contains(e.target) && e.target !== row && !row.contains(e.target)) {
                this.hideTradePopup();
            }
        };
        setTimeout(() => document.addEventListener('click', this._tradePopupClose), 10);
    }

    hideTradePopup() {
        const existing = document.querySelector('.trade-popup');
        if (existing) existing.remove();
        if (this._activeTradeRow) {
            this._activeTradeRow.classList.remove('trade-row-active');
            this._activeTradeRow = null;
        }
        if (this._tradePopupClose) {
            document.removeEventListener('click', this._tradePopupClose);
            this._tradePopupClose = null;
        }
    }

    // ===== SPLIT PANEL SYSTEM =====
    buildAllPanels() {
        ['gainers', 'losers', 'volume'].forEach(type => this.buildPanelContainer(type));
    }

    buildPanelContainer(type) {
        const container = document.getElementById(`${type}Container`);
        if (!container) return;

        const headerClass = container.dataset.header;
        const icon = container.dataset.icon;
        const title = container.dataset.title;
        const splits = this.panels[type];

        container.innerHTML = '';
        container.className = `split-container${splits.length > 1 ? ' split-' + splits.length : ''}`;

        // Compact columns when many splits
        const isCompact = splits.length >= 3;
        const panelCols = {
            gainers: isCompact
                ? ['rank', 'symbol', 'price', 'priceChange', 'volume']
                : ['rank', 'symbol', 'price', 'priceChange', 'change24h', 'volChange', 'volume'],
            losers: isCompact
                ? ['rank', 'symbol', 'price', 'priceChange', 'volume']
                : ['rank', 'symbol', 'price', 'priceChange', 'change24h', 'volChange', 'volume'],
            volume: isCompact
                ? ['rank', 'symbol', 'priceChange', 'volChange']
                : ['rank', 'symbol', 'priceChange', 'volChange', 'volume'],
        };

        splits.forEach((split, idx) => {
            const panel = document.createElement('section');
            panel.className = 'panel';
            panel.dataset.splitId = split.id;

            // Determine which timeframes are used by other splits
            const usedTfs = splits.map(s => s.timeframe);

            // Header
            const header = document.createElement('div');
            header.className = `panel-header ${headerClass}`;

            const titleArea = document.createElement('div');
            titleArea.className = 'panel-title-area';
            titleArea.innerHTML = `<h2>${icon} ${title}</h2>`;

            const tfSelect = document.createElement('select');
            tfSelect.className = 'timeframe-select';
            tfSelect.dataset.splitId = split.id;
            tfSelect.dataset.panelType = type;
            this.allTimeframes.forEach(tf => {
                const opt = document.createElement('option');
                opt.value = tf;
                opt.textContent = tf;
                if (tf === split.timeframe) opt.selected = true;
                tfSelect.appendChild(opt);
            });
            tfSelect.addEventListener('change', (e) => {
                split.timeframe = e.target.value;
                this.timeframes[type] = this.panels[type][0].timeframe; // keep legacy in sync
                this.saveSettings();
                this.fetchAndRender();
            });

            titleArea.appendChild(tfSelect);
            header.appendChild(titleArea);

            // Controls: remove button (if split > 1) and add button (on last split, if < max)
            const controls = document.createElement('div');
            controls.className = 'panel-controls';

            if (splits.length > 1) {
                const removeBtn = document.createElement('button');
                removeBtn.className = 'btn btn-icon split-remove-btn';
                removeBtn.textContent = '✕';
                removeBtn.title = 'Remove this split';
                removeBtn.addEventListener('click', () => this.removeSplit(type, idx));
                controls.appendChild(removeBtn);
            }

            if (idx === splits.length - 1 && splits.length < this.MAX_SPLITS) {
                const addBtn = document.createElement('button');
                addBtn.className = 'btn btn-icon split-add-btn';
                addBtn.textContent = '+';
                addBtn.title = 'Add timeframe split';
                addBtn.addEventListener('click', () => this.addSplit(type));
                controls.appendChild(addBtn);
            }

            header.appendChild(controls);
            panel.appendChild(header);

            // Table
            const wrapper = document.createElement('div');
            wrapper.className = 'table-wrapper';
            const table = document.createElement('table');
            table.id = `${split.id}Table`;

            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            const colLabels = {
                rank: '#', symbol: 'Symbol', price: 'Price', priceChange: 'Price %',
                change24h: '24h %', volChange: 'Vol %', volume: '24h Vol', exchange: 'Exchange',
                status: 'Status'
            };
            panelCols[type].forEach(col => {
                const th = document.createElement('th');
                th.dataset.sort = col;
                th.textContent = colLabels[col] || col;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);
            table.appendChild(document.createElement('tbody'));
            wrapper.appendChild(table);
            panel.appendChild(wrapper);

            container.appendChild(panel);

            // Setup sortable headers for this table
            this.renderer.setupSortableHeaders(table.id, () => this.renderAll());
        });
    }

    addSplit(type) {
        if (this.panels[type].length >= this.MAX_SPLITS) return;

        // Pick a timeframe not already used
        const usedTfs = this.panels[type].map(s => s.timeframe);
        const available = this.allTimeframes.filter(tf => !usedTfs.includes(tf));
        const newTf = available[0] || '5m';

        const idx = this.panels[type].length;
        this.panels[type].push({ id: `${type}-${idx}`, timeframe: newTf });

        this.buildPanelContainer(type);
        this.saveSettings();
        this.fetchAndRender();
    }

    removeSplit(type, idx) {
        if (this.panels[type].length <= 1) return;
        this.panels[type].splice(idx, 1);
        // Re-index IDs
        this.panels[type].forEach((s, i) => s.id = `${type}-${i}`);
        this.timeframes[type] = this.panels[type][0].timeframe;

        this.buildPanelContainer(type);
        this.saveSettings();
        this.fetchAndRender();
    }

    // Get all unique timeframes needed across all splits
    getRequiredTimeframes() {
        const tfs = new Set();
        for (const type of Object.keys(this.panels)) {
            for (const split of this.panels[type]) {
                tfs.add(split.timeframe);
            }
        }
        return [...tfs];
    }

    async loadCategories() {
        try {
            const resp = await fetch('/api/scanner/categories');
            const data = await resp.json();
            if (data.ready && data.categories && data.categories.length > 0) {
                const sel = document.getElementById('categoryFilter');
                // Keep the "All" option, clear the rest
                sel.innerHTML = '<option value="all">All Categories</option>';
                for (const cat of data.categories) {
                    const opt = document.createElement('option');
                    opt.value = cat.id;
                    opt.textContent = `${cat.name} (${cat.count})`;
                    sel.appendChild(opt);
                }
                // Restore saved selection
                if (this.category && this.category !== 'all') {
                    sel.value = this.category;
                }
                this.categoriesLoaded = true;
                console.log(`🏷️ Loaded ${data.categories.length} categories`);
            } else {
                // Categories not ready yet — retry in 30s
                setTimeout(() => this.loadCategories(), 30000);
            }
        } catch (err) {
            console.warn('Category fetch failed, retrying...', err.message);
            setTimeout(() => this.loadCategories(), 30000);
        }
    }

    renderWatchlist() {
        const section = document.getElementById('watchlistSection');
        const items = document.getElementById('watchlistItems');
        const count = document.getElementById('watchlistCount');

        if (!section || !items) return;

        if (this.watchlist.size === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        count.textContent = this.watchlist.size;

        // Build watchlist items from allData
        const dataMap = {};
        this.allData.forEach(d => { dataMap[d.symbol] = d; });

        let html = '';
        for (const symbol of this.watchlist) {
            const d = dataMap[symbol];
            if (d) {
                const pctCls = Utils.pctColor(d.priceChange);
                html += `<div class="watchlist-item">
                    <span class="wl-symbol">${d.displaySymbol || symbol}</span>
                    <span class="wl-price">${Utils.formatPrice(d.price)}</span>
                    <span class="${pctCls}">${Utils.formatPct(d.priceChange)}</span>
                    <span style="color:var(--text-muted);font-size:0.65rem">${Utils.formatVolume(d.volume)}</span>
                    <span class="wl-remove" onclick="window.cryptoScanner.toggleWatchlist('${symbol}')" title="Remove">✕</span>
                </div>`;
            } else {
                html += `<div class="watchlist-item">
                    <span class="wl-symbol">${symbol}</span>
                    <span style="color:var(--text-muted)">—</span>
                    <span class="wl-remove" onclick="window.cryptoScanner.toggleWatchlist('${symbol}')" title="Remove">✕</span>
                </div>`;
            }
        }
        items.innerHTML = html;
    }

    bindControls() {
        const exchangeMarkets = {
            all:      { markets: ['USD', 'USDT', 'USDC', 'BTC', 'ETH'], default: 'USDT' },
            coinbase: { markets: ['USD', 'USDT', 'USDC', 'BTC', 'ETH'], default: 'USD' },
            kraken:   { markets: ['USD', 'USDT', 'USDC', 'BTC', 'ETH'], default: 'USD' },
            mexc:     { markets: ['USDT', 'USDC', 'BTC', 'ETH'], default: 'USDT' },
            kucoin:   { markets: ['USDT', 'USDC', 'BTC', 'ETH'], default: 'USDT' },
        };

        document.querySelectorAll('input[name="exchange"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.exchange = e.target.value;
                const cfg = exchangeMarkets[this.exchange] || exchangeMarkets.coinbase;
                const marketSel = document.getElementById('marketFilter');
                marketSel.innerHTML = cfg.markets.map(m =>
                    `<option value="${m}"${m === cfg.default ? ' selected' : ''}>All ${m} Pairs</option>`
                ).join('');
                this.market = cfg.default;
                this.showLoading();
                this.saveSettings();
                this.fetchAndRender();
            });
        });

        document.getElementById('marketFilter').addEventListener('change', (e) => {
            this.market = e.target.value;
            this.saveSettings();
            this.fetchAndRender();
        });

        document.getElementById('updateInterval').addEventListener('change', (e) => {
            this.interval = parseInt(e.target.value);
            this.fetcher.setCacheTTL(this.interval);
            this.saveSettings();
            this.startAutoRefresh();
        });

        // Feature #4: Min volume filter
        document.getElementById('minVolumeFilter').addEventListener('change', (e) => {
            this.minVolume = parseInt(e.target.value);
            this.saveSettings();
            this.renderAll();
        });

        // Feature #5: Results count
        document.getElementById('resultsCount').addEventListener('change', (e) => {
            this.resultsCount = parseInt(e.target.value);
            this.saveSettings();
            this.renderAll();
        });

        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.category = e.target.value;
            this.saveSettings();
            this.renderAll();
        });

        // Fetch categories from server
        this.loadCategories();

        document.getElementById('symbolSearch').addEventListener('input',
            Utils.debounce((e) => {
                this.searchTerm = e.target.value.toUpperCase();
                this.renderAll();
            }, 200)
        );

        // Timeframe selects are now handled by split panel system in buildPanelContainer

        document.getElementById('highlowFilter').addEventListener('change', (e) => {
            this.highlowFilter = e.target.value;
            this.saveSettings();
            this.renderAll();
        });

        document.getElementById('alertsEnabled').addEventListener('change', (e) => {
            this.alertManager.enabled = e.target.checked;
        });

        // Feature #9: Sound toggle
        document.getElementById('soundToggle').addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            this.alertManager.soundEnabled = this.soundEnabled;
            document.getElementById('soundToggle').textContent = this.soundEnabled ? '🔊' : '🔇';
            this.saveSettings();
        });

        // Feature #13: Export CSV
        document.getElementById('exportAlerts').addEventListener('click', () => {
            this.alertManager.exportToCSV();
        });

        // Feature #14: Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.darkTheme = !this.darkTheme;
            this.applyTheme();
            this.saveSettings();
        });

        // Feature #12: Watchlist collapse toggle
        document.getElementById('watchlistToggle').addEventListener('click', () => {
            this.watchlistCollapsed = !this.watchlistCollapsed;
            const body = document.getElementById('watchlistBody');
            const chevron = document.getElementById('watchlistChevron');
            if (this.watchlistCollapsed) {
                body.classList.add('collapsed');
                chevron.textContent = '▶';
            } else {
                body.classList.remove('collapsed');
                chevron.textContent = '▼';
            }
        });

        // Update exchange markets dropdown based on loaded exchange
        const cfg = exchangeMarkets[this.exchange] || exchangeMarkets.coinbase;
        const marketSel = document.getElementById('marketFilter');
        marketSel.innerHTML = cfg.markets.map(m =>
            `<option value="${m}"${m === this.market ? ' selected' : ''}>All ${m} Pairs</option>`
        ).join('');
    }

    setupSortableHeaders() {
        // Static tables — split panel tables are set up in buildPanelContainer
        ['highlowTable', 'unusualTable', 'momentumTable', 'breakoutTable'].forEach(id => {
            this.renderer.setupSortableHeaders(id, () => this.renderAll());
        });
    }

    setupModal() {
        const modal = document.getElementById('alertModal');
        const openBtn = document.getElementById('configureAlerts');
        const closeBtn = document.getElementById('closeModal');
        const saveBtn = document.getElementById('saveAlertConfig');
        const clearBtn = document.getElementById('clearAlerts');

        openBtn.addEventListener('click', () => {
            const cfg = this.alertManager.config;
            document.getElementById('alertThreshold').value = cfg.priceThreshold;
            document.getElementById('alertTimeframe').value = cfg.timeframe;
            document.getElementById('volAlertThreshold').value = cfg.volThreshold;
            document.getElementById('notifyDesktop').checked = cfg.desktopNotify;
            document.getElementById('alertHighLow').checked = cfg.alertHighLow;
            modal.classList.add('active');
        });

        closeBtn.addEventListener('click', () => modal.classList.remove('active'));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });

        saveBtn.addEventListener('click', () => {
            this.alertManager.saveConfig({
                priceThreshold: parseFloat(document.getElementById('alertThreshold').value) || 5,
                timeframe: document.getElementById('alertTimeframe').value,
                volThreshold: parseFloat(document.getElementById('volAlertThreshold').value) || 200,
                desktopNotify: document.getElementById('notifyDesktop').checked,
                alertHighLow: document.getElementById('alertHighLow').checked
            });
            if (this.alertManager.config.desktopNotify) {
                this.alertManager.requestNotificationPermission();
            }
            modal.classList.remove('active');
        });

        clearBtn.addEventListener('click', () => {
            this.alertManager.clearAlerts();
            this.alertManager.renderAlerts();
        });
    }

    startAutoRefresh() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = setInterval(() => this.fetchAndRender(), this.interval);
    }

    startTimerUpdate() {
        const update = () => {
            if (this.lastUpdate > 0) {
                document.getElementById('lastUpdated').textContent =
                    'Updated ' + Utils.timeAgo(this.lastUpdate);
            }
            requestAnimationFrame(update);
        };
        requestAnimationFrame(update);

        setInterval(() => this.updateHistoryBanner(), 30000);
    }

    async updateHistoryBanner() {
        const exchange = this.exchange === 'all' ? undefined : this.exchange;
        const status = await this.fetcher.fetchStatus(exchange || 'coinbase');
        const banner = document.getElementById('historyBanner');
        if (!banner || !status) return;

        const checkStatus = this.exchange === 'all' ? status : status;
        if (checkStatus.snapshots < 2) {
            banner.textContent = '⏳ Building price history... Short timeframes will use 24h data until enough snapshots are collected.';
            banner.style.display = 'block';
        } else {
            const oldestMin = Math.floor(checkStatus.oldestAge / 60);
            if (oldestMin < 15) {
                banner.textContent = `⏳ ${oldestMin}m of price history collected. 15m+ timeframes need more data — using 24h fallback for now.`;
                banner.style.display = 'block';
            } else if (oldestMin < 60) {
                banner.textContent = `📊 ${oldestMin}m of price history. 5m and 15m timeframes active. Longer timeframes still building.`;
                banner.style.display = 'block';
            } else if (oldestMin < 240) {
                const hrs = (oldestMin / 60).toFixed(1);
                banner.textContent = `📊 ${hrs}h of price history. 5m/15m/1h timeframes active.`;
                banner.style.display = 'block';
            } else {
                banner.style.display = 'none';
            }
        }
    }

    async fetchAndRender() {
        try {
            const requiredTfs = this.getRequiredTimeframes();

            // Fetch all required timeframes in parallel
            const fetches = requiredTfs.map(async tf => {
                const result = await this.fetcher.fetchScannerData(this.exchange, tf, this.market);
                return { tf, data: result.data || [], pairs: result.pairs || 0 };
            });
            const results = await Promise.all(fetches);

            // Cache data by timeframe
            for (const r of results) {
                r.data.forEach(d => d._timeframe = r.tf);
                this.dataByTimeframe[r.tf] = r.data;
            }

            // Use first result for pair count display
            const primary = results[0];
            this.allData = primary.data;
            this.lastUpdate = Date.now();

            document.getElementById('pairsCount').textContent = (primary.pairs || 0) + ' pairs';

            this.renderAll();
            this.updateHistoryBanner();
            this.renderWatchlist();

            // Check alerts
            this.alertManager.checkAlerts(this.allData);

            // Feature #3: Hide loading
            if (this.firstLoad) {
                this.firstLoad = false;
                this.hideLoading();
            } else {
                this.hideLoading();
            }

            // Feature #7: Fetch sparklines for top gainers/losers (batch, non-blocking)
            this.fetchSparklines();
        } catch (e) {
            console.error('Fetch error:', e);
            this.hideLoading();
        }
    }

    // Feature #7: Fetch sparklines in background
    async fetchSparklines() {
        // Get symbols visible in gainers and losers
        const symbols = new Set();
        const sorted = [...this.allData].sort((a, b) => b.priceChange - a.priceChange);
        const count = this.resultsCount;
        sorted.slice(0, count).forEach(d => symbols.add(d.symbol));
        sorted.slice(-count).forEach(d => symbols.add(d.symbol));

        for (const symbol of symbols) {
            if (this.renderer.sparklineCache[symbol] && Date.now() - (this.renderer.sparklineCache[symbol]._ts || 0) < 30000) continue;
            const points = await this.fetcher.fetchSparkline(this.exchange, symbol);
            if (points.length > 0) {
                points._ts = Date.now();
                this.renderer.sparklineCache[symbol] = points;
            }
        }
    }

    renderAll() {
        if (!this.allData.length) return;

        const isAllExchanges = this.exchange === 'all';

        // Render each split panel with its own timeframe data
        for (const type of ['gainers', 'losers', 'volume']) {
            for (const split of this.panels[type]) {
                const tfData = this.dataByTimeframe[split.timeframe] || this.allData;
                const tfFiltered = this.filterData(tfData);
                this.renderPanel(type, split, tfFiltered, isAllExchanges);
            }
        }

        // High/Low and new panels use primary data
        const filtered = this.filterData(this.allData);
        this.renderUnusualVolume(filtered, isAllExchanges);
        this.renderMomentum(filtered, isAllExchanges);
        this.renderBreakout(filtered, isAllExchanges);
        this.renderHighLow(filtered);
    }

    // Shared filter logic
    filterData(data) {
        let filtered = data;
        filtered = filtered.filter(d => /^[A-Z0-9\/\-]+$/.test(d.displaySymbol || d.symbol));

        const stablecoins = new Set([
            'USDC', 'USDT', 'DAI', 'FDUSD', 'TUSD', 'BUSD', 'USDP', 'GUSD',
            'FRAX', 'LUSD', 'USDD', 'PYUSD', 'USD1', 'USDJ', 'USDE', 'USAT',
            'USDS', 'USDG', 'USDF', 'USDX', 'EUR', 'GBP', 'EUROC', 'EURT',
            'FDUSD', 'RAIN', 'UST', 'MIM', 'SUSD', 'CEUR', 'CUSD', 'OUSD',
            'ALUSD', 'DOLA', 'EURS', 'XSGD', 'BIDR', 'IDRT', 'UAH', 'PAX',
            'USDK', 'HUSD', 'USDQ', 'RSV', 'TRIBE', 'FEI', 'USDN',
            'USTC', 'AUSD', 'ZUSD', 'USDFL', 'USDF', 'USD0'
        ]);
        filtered = filtered.filter(d => {
            const base = (d.displaySymbol || d.symbol).split('/')[0];
            return !stablecoins.has(base);
        });

        if (this.minVolume > 0) {
            const volMultiplier = this.market === 'BTC' ? 80000 : this.market === 'ETH' ? 2500 : 1;
            filtered = filtered.filter(d => (d.volume * volMultiplier) >= this.minVolume);
        }

        if (this.searchTerm) {
            filtered = filtered.filter(d => d.symbol.includes(this.searchTerm));
        }

        if (this.category && this.category !== 'all') {
            filtered = filtered.filter(d => (d.categories || []).includes(this.category));
        }

        return filtered;
    }

    renderPanel(type, split, data, showExchange) {
        const tableId = `${split.id}Table`;
        const sortFns = {
            gainers: (a, b) => b.priceChange - a.priceChange,
            losers: (a, b) => a.priceChange - b.priceChange,
            volume: (a, b) => b.volChange - a.volChange,
        };
        const isCompact = this.panels[type].length >= 3;
        const panelCols = {
            gainers: isCompact
                ? ['rank', 'symbol', 'price', 'priceChange', 'volume']
                : ['rank', 'symbol', 'price', 'priceChange', 'change24h', 'volChange', 'volume'],
            losers: isCompact
                ? ['rank', 'symbol', 'price', 'priceChange', 'volume']
                : ['rank', 'symbol', 'price', 'priceChange', 'change24h', 'volChange', 'volume'],
            volume: isCompact
                ? ['rank', 'symbol', 'priceChange', 'volChange']
                : ['rank', 'symbol', 'priceChange', 'volChange', 'volume'],
        };

        let sorted = [...data].sort(sortFns[type]).slice(0, this.resultsCount);
        sorted = this.sortData(sorted, tableId);
        const cols = [...panelCols[type]];
        if (showExchange && !isCompact) cols.splice(2, 0, 'exchange');
        this.renderer.renderTable(tableId, sorted, cols, {
            watchlist: this.watchlist,
            showSparklines: type !== 'volume' && !isCompact
        });
    }

    sortData(data, tableId) {
        const state = this.renderer.sortStates[tableId];
        if (!state || !state.col) return data;

        return [...data].sort((a, b) => {
            let va = a[state.col], vb = b[state.col];
            if (typeof va === 'string') {
                return state.asc ? va.localeCompare(vb) : vb.localeCompare(va);
            }
            va = parseFloat(va) || 0;
            vb = parseFloat(vb) || 0;
            return state.asc ? va - vb : vb - va;
        });
    }

    // Render functions replaced by unified renderPanel() above

    // 🔥 Unusual Volume: coins with abnormally high volume change (spikes)
    renderUnusualVolume(data, showExchange) {
        // Filter for coins with vol change > 20% and meaningful volume
        let items = data.filter(d => d.volChange > 20 && d.volume > 50000);
        // Sort by volume spike magnitude
        items.sort((a, b) => b.volChange - a.volChange);
        items = items.slice(0, this.resultsCount);
        items = this.sortData(items, 'unusualTable');
        const cols = ['rank', 'symbol', 'priceChange', 'volChange', 'volume'];
        if (showExchange) cols.splice(2, 0, 'exchange');
        this.renderer.renderTable('unusualTable', items, cols, {
            watchlist: this.watchlist
        });
    }

    // ⚡ Momentum: coins gaining in BOTH price AND volume
    renderMomentum(data, showExchange) {
        // Filter for positive price AND positive volume change
        let items = data.filter(d => d.priceChange > 0.1 && d.volChange > -5);
        // Score = priceChange * log(volChange + 1) — rewards high price change with volume confirmation
        items.forEach(d => {
            d._momentumScore = d.priceChange * Math.log10(Math.max(d.volChange, 1) + 1);
        });
        items.sort((a, b) => b._momentumScore - a._momentumScore);
        items = items.slice(0, this.resultsCount);
        items = this.sortData(items, 'momentumTable');
        const cols = ['rank', 'symbol', 'price', 'priceChange', 'volChange', 'volume'];
        if (showExchange) cols.splice(2, 0, 'exchange');
        this.renderer.renderTable('momentumTable', items, cols, {
            watchlist: this.watchlist,
            showSparklines: true
        });
    }

    // 📈 Breakout Scanner: coins near 24h high with positive momentum
    renderBreakout(data, showExchange) {
        // Filter for coins near their 24h high (within 2%) with positive price change
        let items = data.filter(d => {
            if (!d.high || d.high === 0 || d.price === 0) return false;
            const distFromHigh = ((d.high - d.price) / d.high) * 100;
            return distFromHigh < 5 && d.priceChange > 0;
        });
        // Sort by closest to high
        items.forEach(d => {
            d._distFromHigh = d.high > 0 ? ((d.high - d.price) / d.high) * 100 : 100;
        });
        items.sort((a, b) => a._distFromHigh - b._distFromHigh);
        items = items.slice(0, this.resultsCount);
        items = this.sortData(items, 'breakoutTable');
        const cols = ['rank', 'symbol', 'price', 'priceChange', 'volume'];
        if (showExchange) cols.splice(2, 0, 'exchange');
        this.renderer.renderTable('breakoutTable', items, cols, {
            watchlist: this.watchlist,
            showSparklines: true
        });
    }

    renderHighLow(data) {
        // Filter out stablecoins — they're always near their high/low
        const stablecoins = new Set([
            'USDC', 'USDT', 'DAI', 'FDUSD', 'TUSD', 'BUSD', 'USDP', 'GUSD', 
            'FRAX', 'LUSD', 'USDD', 'PYUSD', 'USD1', 'USDJ', 'USDE', 'USAT',
            'USDS', 'USDG', 'USDF', 'USDX', 'EUR', 'GBP', 'EUROC', 'EURT',
            'FDUSD', 'FDUSDT', 'RAIN', 'USDF'
        ]);

        let items = [];
        data.forEach(item => {
            // Extract base symbol and skip stablecoins
            const base = item.displaySymbol ? item.displaySymbol.split('/')[0] : item.symbol;
            if (stablecoins.has(base.toUpperCase())) return;

            if (item.nearHigh && (this.highlowFilter === 'both' || this.highlowFilter === 'high')) {
                items.push({ ...item, status: 'HIGH' });
            }
            if (item.nearLow && (this.highlowFilter === 'both' || this.highlowFilter === 'low')) {
                items.push({ ...item, status: 'LOW' });
            }
        });

        items.sort((a, b) => {
            if (a.status !== b.status) return a.status === 'HIGH' ? -1 : 1;
            return b.volume - a.volume;
        });

        items = items.slice(0, 30);
        items = this.sortData(items, 'highlowTable');

        this.alertManager.checkHighLowAlerts(items);
        this.renderer.renderTable('highlowTable', items, ['symbol', 'status', 'price'], {
            watchlist: this.watchlist
        });
    }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    window.cryptoScanner = new CryptoScanner();
});
