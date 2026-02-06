# 🔍 Crypto Scanner

A real-time cryptocurrency scanner and dashboard that tracks price movements, volume spikes, and market momentum across multiple exchanges. Built with vanilla JavaScript and Node.js—no frameworks, no dependencies, just pure performance.

## ✨ Features

### Core Scanning
- **Multi-Exchange Support**: Real-time data from Coinbase, Kraken, MEXC, and KuCoin
- **Top Gainers/Losers**: Track the biggest price movers across all markets
- **Volume Analysis**: Identify unusual volume spikes and high-volume pairs
- **Momentum Scanner**: Detect assets with strong price + volume momentum
- **Breakout Scanner**: Find coins approaching 24h highs

### Advanced Features
- **Category Filtering**: Filter by AI, DeFi, Layer 1/2, Memes, Gaming, RWA, and more (powered by CoinGecko)
- **Watchlist**: Star your favorite pairs for quick monitoring
- **Alert System**: Configurable price and volume alerts with desktop notifications
- **Sparkline Charts**: Visual price trends directly in tables
- **24h High/Low Tracking**: Real-time tracking of daily extremes
- **Dark/Light Theme**: Toggle between themes for comfortable viewing
- **CSV Export**: Export alert logs for record-keeping
- **Multiple Timeframes**: Analyze data across 1m, 5m, 15m, 30m, 1h, 4h, and 24h periods

### Market Coverage
- **USD Pairs**: Native USD trading pairs
- **Stablecoin Pairs**: USDT and USDC markets
- **Crypto Pairs**: BTC and ETH denominated pairs
- **1000+ Trading Pairs**: Aggregated across all supported exchanges

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/crypto-scanner.git
   cd crypto-scanner
   ```

2. **Start the server**
   ```bash
   node server.js
   ```

3. **Open in browser**
   ```
   http://localhost:8083
   ```

That's it! No npm install, no build process, no configuration files.

## 📖 Usage

### Basic Navigation
- **Exchange Selection**: Choose between Coinbase, Kraken, MEXC, KuCoin, or "All" for combined view
- **Market Filter**: Select USD, USDT, USDC, BTC, or ETH pairs
- **Category Filter**: Filter by coin category (AI, DeFi, Memes, etc.)
- **Min Volume**: Set minimum 24h volume threshold to filter out low-liquidity pairs
- **Update Interval**: Configure refresh rate (5s to 60s)
- **Results Count**: Show 10, 20, 50, or 100 results per table

### Trading Integration
- Click any row to see trading options
- Direct links to exchange trading pages
- TradingView chart links for technical analysis

### Setting Up Alerts
1. Click "Configure" in the Alerts panel
2. Set price movement threshold (e.g., 5% in 15 minutes)
3. Configure volume spike alerts (e.g., 200% increase)
4. Enable desktop notifications (browser will request permission)
5. Toggle alert sounds on/off as needed

### Watchlist Management
- Click the ⭐ star icon next to any symbol to add to watchlist
- Watchlist persists across sessions (localStorage)
- Watchlist section appears at top when you have starred items

## 🏗️ Architecture

### Backend (`server.js`)
- **Pure Node.js HTTP server** (no Express or external dependencies)
- **Exchange Adapters**: Modular design for easy addition of new exchanges
- **Price Engine**: Manages snapshots, calculates changes across timeframes
- **Category Mapper**: Fetches and caches coin categories from CoinGecko
- **Running High/Low Tracker**: Calculates 24h extremes from historical snapshots
- **API Endpoints**: RESTful JSON API for frontend consumption

### Frontend
- **Vanilla JavaScript**: No framework overhead, maximum performance
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Updates**: Configurable polling with visual feedback
- **LocalStorage**: Persistent settings, watchlist, and alerts
- **Web Notifications API**: Desktop alert support
- **Web Audio API**: Sound alerts without external audio files

### Data Flow
```
Exchange APIs → Adapters → Price Engine → HTTP Server → Frontend
                                ↓
                         Snapshot Storage (in-memory)
                                ↓
                    Timeframe Analysis & Aggregation
```

## 🔌 API Documentation

### Endpoints

#### `GET /api/scanner/data`
Fetch scanner data for a specific exchange, timeframe, and market.

**Query Parameters:**
- `exchange`: `coinbase`, `kraken`, `mexc`, `kucoin`, or `all` (default: `coinbase`)
- `timeframe`: `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `24h` (default: `15m`)
- `market`: `USD`, `USDT`, `USDC`, `BTC`, `ETH` (default: `USD`)

**Response:**
```json
{
  "exchange": "coinbase",
  "pairs": 150,
  "timeframe": "15m",
  "market": "USD",
  "history": {
    "snapshots": 45,
    "oldestAge": 450,
    "newestAge": 10,
    "pairs": 150
  },
  "data": [
    {
      "symbol": "BTCUSD",
      "displaySymbol": "BTC/USD",
      "price": 42500.50,
      "priceChange": 5.23,
      "change24h": 3.45,
      "volChange": 120.5,
      "volume": 1500000000,
      "high": 43000,
      "low": 41000,
      "nearHigh": false,
      "nearLow": false,
      "exchange": "coinbase",
      "categories": ["top-100", "layer-1"]
    }
  ]
}
```

#### `GET /api/scanner/sparkline`
Fetch price history for sparkline chart.

**Query Parameters:**
- `exchange`: Exchange name
- `symbol`: Trading pair symbol (e.g., `BTCUSD`)

**Response:**
```json
[
  { "ts": 1234567890000, "price": 42000 },
  { "ts": 1234567900000, "price": 42100 },
  ...
]
```

#### `GET /api/scanner/status`
Get snapshot history info for exchanges.

**Response:**
```json
{
  "coinbase": {
    "snapshots": 45,
    "oldestAge": 450,
    "newestAge": 10,
    "pairs": 150
  },
  "kraken": { ... },
  ...
}
```

#### `GET /api/scanner/exchanges`
List all available exchanges and their supported markets.

**Response:**
```json
[
  {
    "id": "coinbase",
    "name": "Coinbase",
    "markets": ["USD", "USDT", "USDC", "BTC", "ETH"],
    "pairs": 150,
    "errors": 0
  },
  ...
]
```

#### `GET /api/scanner/categories`
Get available coin categories.

**Response:**
```json
{
  "ready": true,
  "categories": [
    {
      "id": "top-100",
      "name": "Top 100",
      "count": 100
    },
    {
      "id": "layer-1",
      "name": "Layer 1",
      "count": 45
    },
    ...
  ]
}
```

## 🔧 Configuration

### Server Configuration
Edit `server.js` to customize:
- `PORT`: Server port (default: 8083)
- `REFRESH_INTERVAL`: Category cache refresh (default: 6 hours)
- `maxAge`: Snapshot retention (default: 25 hours)
- `TARGET_CATEGORIES`: Customize tracked categories

### Adding New Exchanges
Create a new adapter class in `server.js`:

```javascript
class NewExchangeAdapter {
    constructor() {
        this.name = 'newexchange';
        this.displayName = 'New Exchange';
    }
    
    async fetchTicker() {
        // Fetch data from exchange API
        // Return normalized prices object
    }
    
    getMarkets() {
        return ['USDT', 'BTC', 'ETH'];
    }
    
    symbolToDisplay(symbol, market) {
        return symbol.replace(market, '') + '/' + market;
    }
}
```

Then register it in the `PriceEngine` constructor:
```javascript
this.adapters = {
    ...existing adapters,
    newexchange: new NewExchangeAdapter()
};
```

## 📊 Performance

- **Zero Dependencies**: No npm packages, faster installation and startup
- **Efficient Polling**: Exchanges refreshed every 10 seconds
- **Smart Caching**: Category data cached for 6 hours
- **In-Memory Storage**: Fast snapshot access without database overhead
- **Optimized Rendering**: Minimal DOM manipulation, smooth 60fps updates

## 🛡️ Rate Limiting

### Exchange APIs
- **Coinbase**: ~10 req/sec (public endpoints)
- **Kraken**: ~1 req/sec (public endpoints)
- **MEXC**: ~20 req/sec (public endpoints)
- **KuCoin**: ~10 req/sec (public endpoints)

### CoinGecko API
- **Free Tier**: 10-30 req/min
- **Implementation**: 6-second delays between requests
- **Caching**: 6-hour cache to minimize API calls

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Additional exchange adapters
- New scanner algorithms (RSI, MACD, etc.)
- Enhanced charting capabilities
- Mobile app version
- WebSocket support for real-time updates
- Historical data persistence

## 📝 License

MIT License - see LICENSE file for details

## ⚠️ Disclaimer

This tool is for informational purposes only. It is not financial advice. Always do your own research before making investment decisions. Cryptocurrency trading carries significant risk.

## 🙏 Acknowledgments

- Exchange APIs: Coinbase, Kraken, MEXC, KuCoin
- Category Data: CoinGecko API
- Icon: Custom SVG design

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions
- Contribute improvements via pull requests

---

**Built with ❤️ and vanilla JavaScript**
