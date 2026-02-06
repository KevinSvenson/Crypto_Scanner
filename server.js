const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8083;
const BASE_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

// ===== HTTP HELPER =====
function httpGet(urlStr) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(urlStr);
        const client = parsed.protocol === 'https:' ? https : http;
        const opts = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            headers: { 'User-Agent': 'CryptoScanner/1.0' }
        };
        client.get(opts, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error(`JSON parse failed: ${body.slice(0, 200)}`));
                }
            });
        }).on('error', reject);
    });
}

// ===== EXCHANGE ADAPTERS =====

class CoinbaseAdapter {
    constructor() {
        this.name = 'coinbase';
        this.displayName = 'Coinbase';
    }

    async fetchTicker() {
        let allProducts = [];
        let offset = 0;
        const limit = 500;

        while (true) {
            const data = await httpGet(
                `https://api.coinbase.com/api/v3/brokerage/market/products?limit=${limit}&offset=${offset}&product_type=SPOT`
            );
            if (!data || !data.products || data.products.length === 0) break;
            allProducts = allProducts.concat(data.products);
            if (data.products.length < limit) break;
            offset += limit;
        }

        const prices = {};
        allProducts.forEach(p => {
            if (p.is_disabled || p.status !== 'online') return;
            const price = parseFloat(p.price || 0);
            if (price === 0) return;

            const symbol = p.product_id.replace('-', '');
            const vol24h = parseFloat(p.volume_24h || 0) * price;

            prices[symbol] = {
                price,
                volume: vol24h,
                high: 0,
                low: 0,
                open: price / (1 + parseFloat(p.price_percentage_change_24h || 0) / 100),
                change24h: parseFloat(p.price_percentage_change_24h || 0),
                volChange24h: parseFloat(p.volume_percentage_change_24h || 0),
            };
        });
        return prices;
    }

    getMarkets() { return ['USD', 'USDT', 'USDC', 'BTC', 'ETH']; }

    symbolToDisplay(symbol, market) {
        return symbol.replace(new RegExp(market + '$'), '') + '/' + market;
    }
}

class MEXCAdapter {
    constructor() {
        this.name = 'mexc';
        this.displayName = 'MEXC';
    }

    async fetchTicker() {
        const data = await httpGet('https://api.mexc.com/api/v3/ticker/24hr');
        if (!Array.isArray(data)) return {};

        const prices = {};
        data.forEach(t => {
            // MEXC returns priceChangePercent as decimal (e.g., -0.0743 = -7.43%)
            const pcp = parseFloat(t.priceChangePercent || 0) * 100;

            prices[t.symbol] = {
                price: parseFloat(t.lastPrice),
                volume: parseFloat(t.quoteVolume),
                high: parseFloat(t.highPrice),
                low: parseFloat(t.lowPrice),
                open: parseFloat(t.openPrice),
                change24h: pcp,
            };
        });
        return prices;
    }

    getMarkets() { return ['USDT', 'USDC', 'BTC', 'ETH']; }

    symbolToDisplay(symbol, market) {
        return symbol.replace(new RegExp(market + '$'), '') + '/' + market;
    }
}

class KuCoinAdapter {
    constructor() {
        this.name = 'kucoin';
        this.displayName = 'KuCoin';
    }

    async fetchTicker() {
        const data = await httpGet('https://api.kucoin.com/api/v1/market/allTickers');
        const tickers = data?.data?.ticker;
        if (!Array.isArray(tickers)) return {};

        const prices = {};
        tickers.forEach(t => {
            const symbol = t.symbol.replace('-', '');
            const price = parseFloat(t.last || 0);
            const changeRate = parseFloat(t.changeRate || 0);

            prices[symbol] = {
                price,
                volume: parseFloat(t.volValue || 0),
                high: parseFloat(t.high || 0),
                low: parseFloat(t.low || 0),
                open: parseFloat(t.open || 0) || (price / (1 + changeRate)),
                change24h: changeRate * 100,
            };
        });
        return prices;
    }

    getMarkets() { return ['USDT', 'USDC', 'BTC', 'ETH']; }

    symbolToDisplay(symbol, market) {
        return symbol.replace(new RegExp(market + '$'), '') + '/' + market;
    }
}

class KrakenAdapter {
    constructor() {
        this.name = 'kraken';
        this.displayName = 'Kraken';
        // Kraken uses weird prefixes: XXBT=BTC, XETH=ETH, ZUSD=USD, etc.
        this.krakenMap = {
            'XXBT': 'BTC', 'XETH': 'ETH', 'XXRP': 'XRP', 'XLTC': 'LTC',
            'XXLM': 'XLM', 'XXMR': 'XMR', 'XZEC': 'ZEC', 'XDAO': 'DAO',
            'XETC': 'ETC', 'XREP': 'REP', 'XDOG': 'DOGE', 'XMLN': 'MLN',
            'ZUSD': 'USD', 'ZEUR': 'EUR', 'ZGBP': 'GBP', 'ZCAD': 'CAD',
            'ZJPY': 'JPY', 'ZAUD': 'AUD',
        };
    }

    normalizeSymbol(krakenPair) {
        // Kraken pairs like "XXBTZUSD" → "BTCUSD", "ADAUSD" → "ADAUSD"
        let s = krakenPair;
        // Try mapping known prefixes (longest match first)
        for (const [prefix, replacement] of Object.entries(this.krakenMap)) {
            if (s.startsWith(prefix)) {
                s = replacement + s.slice(prefix.length);
                break;
            }
        }
        // Handle quote side
        for (const [prefix, replacement] of Object.entries(this.krakenMap)) {
            if (s.endsWith(prefix)) {
                s = s.slice(0, -prefix.length) + replacement;
                break;
            }
        }
        return s;
    }

    async fetchTicker() {
        const data = await httpGet('https://api.kraken.com/0/public/Ticker');
        const result = data?.result;
        if (!result) return {};

        const prices = {};
        for (const [pair, t] of Object.entries(result)) {
            const symbol = this.normalizeSymbol(pair);
            const price = parseFloat(t.c[0]); // c = last trade [price, lot volume]
            const open = parseFloat(t.o);      // o = today's opening price
            const vol = parseFloat(t.v[1]);    // v = volume [today, 24h]
            const high = parseFloat(t.h[1]);   // h = high [today, 24h]
            const low = parseFloat(t.l[1]);    // l = low [today, 24h]

            // Calculate quote volume (vol is in base currency)
            const quoteVol = vol * price;
            const change24h = open > 0 ? ((price - open) / open) * 100 : 0;

            prices[symbol] = {
                price,
                volume: quoteVol,
                high,
                low,
                open,
                change24h,
            };
        }
        return prices;
    }

    getMarkets() { return ['USD', 'USDT', 'USDC', 'BTC', 'ETH']; }

    symbolToDisplay(symbol, market) {
        return symbol.replace(new RegExp(market + '$'), '') + '/' + market;
    }
}

// ===== COINGECKO CATEGORY MAPPER =====
class CategoryMapper {
    constructor() {
        // symbol (uppercase) → Set of category IDs
        this.symbolCategories = {};
        // category ID → display name
        this.categoryNames = {};
        this.ready = false;
        this.lastFetch = 0;
        this.REFRESH_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

        // Key categories to fetch — curated for crypto traders
        this.TARGET_CATEGORIES = [
            { id: 'layer-1', name: 'Layer 1' },
            { id: 'layer-2', name: 'Layer 2' },
            { id: 'artificial-intelligence', name: 'AI' },
            { id: 'ai-agents', name: 'AI Agents' },
            { id: 'meme-token', name: 'Meme' },
            { id: 'defi', name: 'DeFi' },
            { id: 'gaming', name: 'Gaming' },
            { id: 'real-world-assets-rwa', name: 'RWA' },
            { id: 'privacy-coins', name: 'Privacy' },
            { id: 'solana-ecosystem', name: 'Solana Eco' },
            { id: 'base-ecosystem', name: 'Base Eco' },
            { id: 'ethereum-ecosystem', name: 'Ethereum Eco' },
            { id: 'decentralized-exchange-dex', name: 'DEX' },
            { id: 'non-fungible-tokens-nft', name: 'NFT' },
            { id: 'oracle', name: 'Oracle' },
            { id: 'zero-knowledge-zk', name: 'ZK' },
            { id: 'decentralized-science-desci', name: 'DeSci' },
            { id: 'pump-fun', name: 'Pump.fun' },
        ];

        // Cache file for persistence across restarts
        this.cacheFile = path.join(__dirname, 'data', 'categories-cache.json');
    }

    async start() {
        // Try loading from cache first
        this.loadCache();

        // Fetch fresh data in background
        this.fetchAll().catch(err => console.error('Category fetch error:', err.message));

        // Refresh periodically
        setInterval(() => {
            if (Date.now() - this.lastFetch > this.REFRESH_INTERVAL) {
                this.fetchAll().catch(err => console.error('Category refresh error:', err.message));
            }
        }, 30 * 60 * 1000); // Check every 30 min
    }

    loadCache() {
        try {
            if (fs.existsSync(this.cacheFile)) {
                const data = JSON.parse(fs.readFileSync(this.cacheFile, 'utf-8'));
                this.symbolCategories = {};
                for (const [sym, cats] of Object.entries(data.symbolCategories || {})) {
                    this.symbolCategories[sym] = new Set(cats);
                }
                this.categoryNames = data.categoryNames || {};
                this.lastFetch = data.lastFetch || 0;
                this.ready = Object.keys(this.symbolCategories).length > 0;
                console.log(`📂 Loaded ${Object.keys(this.symbolCategories).length} coin categories from cache`);
            }
        } catch (err) {
            console.warn('Category cache load failed:', err.message);
        }
    }

    saveCache() {
        try {
            const dir = path.dirname(this.cacheFile);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            const serializable = {};
            for (const [sym, cats] of Object.entries(this.symbolCategories)) {
                serializable[sym] = [...cats];
            }
            fs.writeFileSync(this.cacheFile, JSON.stringify({
                symbolCategories: serializable,
                categoryNames: this.categoryNames,
                lastFetch: this.lastFetch,
            }));
        } catch (err) {
            console.warn('Category cache save failed:', err.message);
        }
    }

    async fetchAll() {
        console.log('🏷️  Fetching coin categories from CoinGecko...');
        let totalMapped = 0;

        // Fetch Top 100 by market cap first
        try {
            const top100 = await httpGet(
                'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false'
            );
            if (Array.isArray(top100)) {
                this.categoryNames['top-100'] = 'Top 100';
                for (const coin of top100) {
                    const sym = coin.symbol.toUpperCase();
                    if (!this.symbolCategories[sym]) this.symbolCategories[sym] = new Set();
                    this.symbolCategories[sym].add('top-100');
                }
                console.log(`   Top 100: ${top100.length} coins`);
                totalMapped += top100.length;
            }
            await new Promise(r => setTimeout(r, 6000));
        } catch (err) {
            console.warn('   Top 100: fetch failed', err.message);
        }

        for (const cat of this.TARGET_CATEGORIES) {
            this.categoryNames[cat.id] = cat.name;

            try {
                // Fetch up to 250 coins per category (max per page)
                const coins = await httpGet(
                    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=${cat.id}&per_page=250&page=1&sparkline=false`
                );

                if (Array.isArray(coins)) {
                    for (const coin of coins) {
                        const sym = coin.symbol.toUpperCase();
                        if (!this.symbolCategories[sym]) {
                            this.symbolCategories[sym] = new Set();
                        }
                        this.symbolCategories[sym].add(cat.id);
                    }
                    totalMapped += coins.length;
                    console.log(`   ${cat.name}: ${coins.length} coins`);
                } else if (coins && coins.status && coins.status.error_code === 429) {
                    console.warn(`   ${cat.name}: rate limited, waiting 60s...`);
                    await new Promise(r => setTimeout(r, 60000));
                    // Retry this category
                    const retry = await httpGet(
                        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=${cat.id}&per_page=250&page=1&sparkline=false`
                    );
                    if (Array.isArray(retry)) {
                        for (const coin of retry) {
                            const sym = coin.symbol.toUpperCase();
                            if (!this.symbolCategories[sym]) this.symbolCategories[sym] = new Set();
                            this.symbolCategories[sym].add(cat.id);
                        }
                        totalMapped += retry.length;
                        console.log(`   ${cat.name}: ${retry.length} coins (retry)`);
                    }
                }

                // Free tier: ~10-30 req/min. Use 6s between calls to stay safe
                await new Promise(r => setTimeout(r, 6000));
            } catch (err) {
                console.warn(`   ${cat.name}: fetch failed (${err.message})`);
                await new Promise(r => setTimeout(r, 15000));
            }
        }

        this.lastFetch = Date.now();
        this.ready = true;
        this.saveCache();
        console.log(`🏷️  Category mapping complete: ${Object.keys(this.symbolCategories).length} unique symbols, ${totalMapped} total mappings`);
    }

    // Get categories for a symbol like "BTC/USD" or "BTCUSD"
    getCategories(displaySymbol) {
        const base = displaySymbol.split('/')[0] || displaySymbol.replace(/(USD[T|C]?|BTC|ETH)$/, '');
        return this.symbolCategories[base.toUpperCase()] || new Set();
    }

    // Return the list of available categories
    getCategoryList() {
        const list = [];
        // Top 100 goes first
        const top100Count = Object.values(this.symbolCategories).filter(s => s.has('top-100')).length;
        if (top100Count > 0) {
            list.push({ id: 'top-100', name: 'Top 100', count: top100Count });
        }
        // Then all other categories
        for (const c of this.TARGET_CATEGORIES) {
            const count = Object.values(this.symbolCategories).filter(s => s.has(c.id)).length;
            if (count > 0) list.push({ id: c.id, name: c.name, count });
        }
        return list;
    }
}

// ===== MULTI-EXCHANGE PRICE ENGINE =====
class PriceEngine {
    constructor() {
        this.adapters = {
            coinbase: new CoinbaseAdapter(),
            kraken: new KrakenAdapter(),
            mexc: new MEXCAdapter(),
            kucoin: new KuCoinAdapter(),
        };

        this.snapshots = {};
        this.maxAge = 25 * 60 * 60 * 1000;
        this.pairCounts = {};
        this.fetchErrors = {};

        // Feature #1: Running high/low tracking for Coinbase (and any exchange with high=0/low=0)
        this.runningHighLow = {}; // { exchange: { symbol: { high, low, points: [{ts, price}] } } }
    }

    start() {
        console.log('📡 Price engine starting...');
        console.log(`   Exchanges: ${Object.keys(this.adapters).join(', ')}`);

        for (const name of Object.keys(this.adapters)) {
            this.snapshots[name] = [];
            this.runningHighLow[name] = {};
            this.fetchErrors[name] = 0;
            this.fetchExchange(name);
        }

        setInterval(() => {
            for (const name of Object.keys(this.adapters)) {
                this.fetchExchange(name);
            }
        }, 10000);
    }

    async fetchExchange(exchangeName) {
        const adapter = this.adapters[exchangeName];
        if (!adapter) return;

        try {
            const prices = await adapter.fetchTicker();
            const count = Object.keys(prices).length;
            if (count === 0) return;

            this.pairCounts[exchangeName] = count;
            this.fetchErrors[exchangeName] = 0;
            const now = Date.now();
            this.snapshots[exchangeName].push({ ts: now, prices });

            const cutoff = now - this.maxAge;
            while (this.snapshots[exchangeName].length > 0 && this.snapshots[exchangeName][0].ts < cutoff) {
                this.snapshots[exchangeName].shift();
            }

            // Feature #1: Update running high/low
            this.updateRunningHighLow(exchangeName, prices, now);
        } catch (e) {
            this.fetchErrors[exchangeName]++;
            console.error(`[${exchangeName}] Fetch error #${this.fetchErrors[exchangeName]}:`, e.message);
        }
    }

    // Feature #1: Track running 24h high/low from snapshots
    updateRunningHighLow(exchangeName, prices, now) {
        const cutoff24h = now - 24 * 60 * 60 * 1000;
        const hl = this.runningHighLow[exchangeName];

        for (const [symbol, data] of Object.entries(prices)) {
            if (!hl[symbol]) {
                hl[symbol] = { high: data.price, low: data.price, points: [] };
            }

            // Add current price point
            hl[symbol].points.push({ ts: now, price: data.price });

            // Prune old points beyond 24h
            hl[symbol].points = hl[symbol].points.filter(p => p.ts >= cutoff24h);

            // Recalculate high/low from remaining points
            let high = -Infinity, low = Infinity;
            for (const pt of hl[symbol].points) {
                if (pt.price > high) high = pt.price;
                if (pt.price < low) low = pt.price;
            }
            hl[symbol].high = high;
            hl[symbol].low = low;
        }
    }

    getTimeframeData(exchange, timeframe, market) {
        const snaps = this.snapshots[exchange];
        if (!snaps || snaps.length === 0) return [];

        const adapter = this.adapters[exchange];
        if (!adapter) return [];

        const now = Date.now();
        const tfMs = {
            '1m': 60 * 1000,
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '30m': 30 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '4h': 4 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
        };

        const windowMs = tfMs[timeframe] || tfMs['24h'];
        const targetTs = now - windowMs;

        let pastSnapshot = null;
        for (let i = 0; i < snaps.length; i++) {
            if (snaps[i].ts >= targetTs) {
                pastSnapshot = snaps[i > 0 ? i - 1 : 0];
                break;
            }
        }

        const latestSnapshot = snaps[snaps.length - 1];
        const latestPrices = latestSnapshot.prices;
        const hl = this.runningHighLow[exchange] || {};
        const results = [];

        for (const [symbol, current] of Object.entries(latestPrices)) {
            if (!symbol.endsWith(market)) continue;
            if (current.volume < 100 && current.price < 0.0001) continue;

            let priceChange, volChange;

            // Check if we have a valid past snapshot for this timeframe
            const hasPast = pastSnapshot && pastSnapshot !== snaps[0] && pastSnapshot !== latestSnapshot;

            if (timeframe === '24h' && current.change24h !== 0) {
                priceChange = current.change24h;
                volChange = current.volChange24h || 0;
            } else if (hasPast) {
                const past = pastSnapshot.prices[symbol];
                if (past && past.price > 0) {
                    priceChange = ((current.price - past.price) / past.price) * 100;
                    volChange = past.volume > 0
                        ? ((current.volume - past.volume) / past.volume) * 100
                        : 0;
                } else {
                    // Symbol wasn't in the past snapshot — fall back to 24h
                    priceChange = current.change24h || 0;
                    volChange = current.volChange24h || 0;
                }
            } else {
                // Not enough history for this timeframe — use 24h data
                priceChange = current.change24h || 0;
                volChange = current.volChange24h || 0;
            }

            // Feature #1: Use running high/low when exchange returns 0
            let high = current.high || 0;
            let low = current.low || 0;
            if (hl[symbol]) {
                if (high === 0) high = hl[symbol].high;
                if (low === 0) low = hl[symbol].low;
            }

            results.push({
                symbol,
                displaySymbol: adapter.symbolToDisplay(symbol, market),
                price: current.price,
                priceChange: Math.round(priceChange * 1000) / 1000,
                change24h: current.change24h || 0,
                volChange: Math.round(volChange * 1000) / 1000,
                volume: current.volume,
                high,
                low,
                nearHigh: high > 0 && ((high - current.price) / high) < 0.005,
                nearLow: low > 0 && ((current.price - low) / low) < 0.005,
                exchange: exchange,
            });
        }

        return results;
    }

    // Feature #11: Combined exchange view
    getAllExchangesData(timeframe, market) {
        const allResults = [];
        for (const exchangeName of Object.keys(this.adapters)) {
            const data = this.getTimeframeData(exchangeName, timeframe, market);
            allResults.push(...data);
        }

        // Deduplicate: aggregate volume across exchanges, keep best price data
        const symbolMap = {};
        for (const item of allResults) {
            if (!symbolMap[item.symbol]) {
                symbolMap[item.symbol] = { ...item, _exchanges: [item.exchange] };
            } else {
                const existing = symbolMap[item.symbol];
                existing.volume += item.volume; // Combine volume
                existing._exchanges.push(item.exchange);
                // Keep price/change data from the exchange with higher volume
                if (item.volume > (existing.volume - item.volume)) {
                    existing.price = item.price;
                    existing.priceChange = item.priceChange;
                    existing.change24h = item.change24h;
                    existing.volChange = item.volChange;
                    existing.high = item.high;
                    existing.low = item.low;
                    existing.nearHigh = item.nearHigh;
                    existing.nearLow = item.nearLow;
                    existing.exchange = item.exchange;
                }
            }
        }
        return Object.values(symbolMap);
    }

    // Feature #7: Sparkline data
    getSparklineData(exchange, symbol) {
        if (exchange === 'all') {
            // Find which exchange has this symbol with most data
            let bestExchange = null;
            let bestCount = 0;
            for (const exName of Object.keys(this.adapters)) {
                const snaps = this.snapshots[exName] || [];
                let count = 0;
                for (const snap of snaps) {
                    if (snap.prices[symbol]) count++;
                }
                if (count > bestCount) {
                    bestCount = count;
                    bestExchange = exName;
                }
            }
            if (!bestExchange) return [];
            exchange = bestExchange;
        }

        const snaps = this.snapshots[exchange];
        if (!snaps || snaps.length === 0) return [];

        const points = [];
        // Sample up to 30 points evenly from available snapshots
        const step = Math.max(1, Math.floor(snaps.length / 30));
        for (let i = 0; i < snaps.length; i += step) {
            const snap = snaps[i];
            if (snap.prices[symbol]) {
                points.push({
                    ts: snap.ts,
                    price: snap.prices[symbol].price
                });
            }
            if (points.length >= 30) break;
        }
        // Always include the latest
        const lastSnap = snaps[snaps.length - 1];
        if (lastSnap.prices[symbol] && (points.length === 0 || points[points.length - 1].ts !== lastSnap.ts)) {
            points.push({ ts: lastSnap.ts, price: lastSnap.prices[symbol].price });
        }
        return points;
    }

    getHistoryInfo(exchange) {
        if (exchange === 'all') {
            // Combine info from all exchanges
            let totalSnaps = 0, totalPairs = 0, oldestAge = 0, newestAge = Infinity;
            const now = Date.now();
            for (const name of Object.keys(this.adapters)) {
                const snaps = this.snapshots[name];
                if (!snaps || snaps.length === 0) continue;
                totalSnaps += snaps.length;
                totalPairs += this.pairCounts[name] || 0;
                const oa = Math.round((now - snaps[0].ts) / 1000);
                const na = Math.round((now - snaps[snaps.length - 1].ts) / 1000);
                if (oa > oldestAge) oldestAge = oa;
                if (na < newestAge) newestAge = na;
            }
            return { snapshots: totalSnaps, oldestAge, newestAge: newestAge === Infinity ? 0 : newestAge, pairs: totalPairs };
        }

        const snaps = this.snapshots[exchange];
        if (!snaps || snaps.length === 0) return { snapshots: 0, oldestAge: 0, newestAge: 0, pairs: 0 };
        const now = Date.now();
        return {
            snapshots: snaps.length,
            oldestAge: Math.round((now - snaps[0].ts) / 1000),
            newestAge: Math.round((now - snaps[snaps.length - 1].ts) / 1000),
            pairs: this.pairCounts[exchange] || 0,
        };
    }

    getExchanges() {
        return Object.entries(this.adapters).map(([name, adapter]) => ({
            id: name,
            name: adapter.displayName,
            markets: adapter.getMarkets(),
            pairs: this.pairCounts[name] || 0,
            errors: this.fetchErrors[name] || 0,
        }));
    }
}

const engine = new PriceEngine();
engine.start();

const categoryMapper = new CategoryMapper();
categoryMapper.start();

// ===== HTTP SERVER =====
function serveStatic(filePath, res) {
    const fullPath = path.join(BASE_DIR, filePath === '/' ? 'index.html' : filePath);
    const ext = path.extname(fullPath);

    fs.readFile(fullPath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
        }
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
    });
}

function sendJSON(res, data) {
    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
    const parsed = url.parse(req.url, true);

    if (parsed.pathname === '/api/scanner/data') {
        const exchange = parsed.query.exchange || 'coinbase';
        const timeframe = parsed.query.timeframe || '15m';
        const market = parsed.query.market || 'USD';

        // Feature #11: Combined exchange view
        let data;
        if (exchange === 'all') {
            data = engine.getAllExchangesData(timeframe, market);
        } else {
            data = engine.getTimeframeData(exchange, timeframe, market);
        }

        // Attach categories to each item
        if (categoryMapper.ready) {
            for (const item of data) {
                const cats = categoryMapper.getCategories(item.displaySymbol || item.symbol);
                item.categories = [...cats];
            }
        }

        sendJSON(res, {
            exchange,
            pairs: data.length,
            timeframe,
            market,
            history: engine.getHistoryInfo(exchange),
            data
        });
        return;
    }

    // Feature #7: Sparkline endpoint
    if (parsed.pathname === '/api/scanner/sparkline') {
        const exchange = parsed.query.exchange || 'coinbase';
        const symbol = parsed.query.symbol || '';
        const points = engine.getSparklineData(exchange, symbol);
        sendJSON(res, points);
        return;
    }

    if (parsed.pathname === '/api/scanner/status') {
        const exchange = parsed.query.exchange;
        if (exchange) {
            sendJSON(res, engine.getHistoryInfo(exchange));
        } else {
            const all = {};
            for (const name of Object.keys(engine.adapters)) {
                all[name] = engine.getHistoryInfo(name);
            }
            sendJSON(res, all);
        }
        return;
    }

    if (parsed.pathname === '/api/scanner/exchanges') {
        sendJSON(res, engine.getExchanges());
        return;
    }

    if (parsed.pathname === '/api/scanner/categories') {
        sendJSON(res, {
            ready: categoryMapper.ready,
            categories: categoryMapper.getCategoryList(),
        });
        return;
    }

    serveStatic(parsed.pathname, res);
});

server.listen(PORT, () => {
    console.log(`🔍 Crypto Scanner → http://localhost:${PORT}`);
    console.log(`📡 Exchanges: Coinbase, MEXC, KuCoin`);
    console.log(`📊 API: /api/scanner/data?exchange=coinbase&timeframe=15m&market=USD`);
    console.log(`📈 Sparkline: /api/scanner/sparkline?exchange=coinbase&symbol=BTCUSD`);
});
