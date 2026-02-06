# Contributing to Crypto Scanner

Thank you for considering contributing to Crypto Scanner! This document provides guidelines and instructions for contributing.

## 🎯 Ways to Contribute

### Code Contributions
- Add support for new exchanges
- Implement new scanner algorithms (RSI, MACD, Bollinger Bands, etc.)
- Enhance the UI/UX
- Improve performance and optimization
- Add tests

### Documentation
- Improve README and API documentation
- Add code comments for complex logic
- Create tutorials or guides
- Fix typos and clarify unclear sections

### Bug Reports & Feature Requests
- Report bugs with detailed reproduction steps
- Suggest new features with clear use cases
- Provide feedback on existing features

## 🚀 Getting Started

### Prerequisites
- Node.js v14 or higher
- Git
- A GitHub account
- Basic knowledge of JavaScript and Node.js

### Development Setup

1. **Fork the repository**
   - Click the "Fork" button on GitHub

2. **Clone your fork**
   ```bash
   git clone https://github.com/yourusername/crypto-scanner.git
   cd crypto-scanner
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Start the development server**
   ```bash
   node server.js
   ```

5. **Make your changes**
   - Edit files as needed
   - Test thoroughly in the browser (http://localhost:8083)

## 📝 Code Style Guidelines

### JavaScript Style
- Use 4-space indentation
- Use camelCase for variables and functions
- Use PascalCase for classes
- Add comments for complex logic
- Keep functions focused and small
- Avoid global variables when possible

### Example Code Style
```javascript
class ExampleAdapter {
    constructor() {
        this.name = 'example';
        this.displayName = 'Example Exchange';
    }

    async fetchTicker() {
        // Fetch ticker data from API
        const data = await this.makeRequest();
        return this.normalizeData(data);
    }

    normalizeData(rawData) {
        // Transform raw API data to standard format
        const prices = {};
        // ... normalization logic
        return prices;
    }
}
```

### Frontend Style
- Keep JavaScript vanilla (no frameworks)
- Use semantic HTML
- Use CSS custom properties for theming
- Maintain responsive design
- Ensure accessibility (ARIA labels, keyboard navigation)

## 🔧 Adding a New Exchange

To add support for a new exchange, follow these steps:

1. **Create an adapter class in `server.js`**
```javascript
class NewExchangeAdapter {
    constructor() {
        this.name = 'newexchange';
        this.displayName = 'New Exchange';
    }
    
    async fetchTicker() {
        // Fetch from exchange API
        const data = await httpGet('https://api.newexchange.com/ticker');
        
        // Normalize to standard format
        const prices = {};
        data.forEach(ticker => {
            prices[ticker.symbol] = {
                price: parseFloat(ticker.last),
                volume: parseFloat(ticker.volume),
                high: parseFloat(ticker.high),
                low: parseFloat(ticker.low),
                open: parseFloat(ticker.open),
                change24h: parseFloat(ticker.change),
            };
        });
        return prices;
    }
    
    getMarkets() {
        return ['USDT', 'BTC', 'ETH'];
    }
    
    symbolToDisplay(symbol, market) {
        return symbol.replace(market, '') + '/' + market;
    }
}
```

2. **Register the adapter in PriceEngine**
```javascript
this.adapters = {
    coinbase: new CoinbaseAdapter(),
    kraken: new KrakenAdapter(),
    mexc: new MEXCAdapter(),
    kucoin: new KuCoinAdapter(),
    newexchange: new NewExchangeAdapter(), // Add here
};
```

3. **Add UI controls in `index.html`**
```html
<label><input type="radio" name="exchange" value="newexchange"> New Exchange</label>
```

4. **Test thoroughly**
   - Verify data fetching works
   - Check all timeframes
   - Test error handling
   - Ensure rate limits are respected

## 🧪 Testing

### Manual Testing Checklist
Before submitting a PR, test these scenarios:

- [ ] Server starts without errors
- [ ] All exchanges load data successfully
- [ ] Switching between exchanges works
- [ ] All timeframes calculate correctly
- [ ] Filters work (market, category, volume)
- [ ] Watchlist add/remove functions
- [ ] Alerts trigger correctly
- [ ] Theme toggle works
- [ ] CSV export works
- [ ] No console errors
- [ ] Responsive design works on mobile
- [ ] Works in Chrome, Firefox, Safari

### Testing New Features
- Test edge cases (empty data, API failures, etc.)
- Verify performance with large datasets
- Check browser compatibility
- Test rate limiting doesn't cause issues

## 📋 Pull Request Process

1. **Update documentation**
   - Update README if adding features
   - Add code comments
   - Update API docs if adding endpoints

2. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add support for New Exchange"
   ```

   Use conventional commit messages:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `style:` for formatting
   - `refactor:` for code restructuring
   - `perf:` for performance improvements
   - `test:` for adding tests

3. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create a Pull Request**
   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill out the PR template with:
     - Description of changes
     - Why the change is needed
     - Testing performed
     - Screenshots (if UI changes)

5. **Address review feedback**
   - Respond to comments
   - Make requested changes
   - Push updates to the same branch

## 🐛 Reporting Bugs

### Before Reporting
- Check if the bug is already reported
- Try to reproduce with the latest version
- Test in multiple browsers if UI-related

### Bug Report Template
```markdown
**Description**
A clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- Browser: [e.g., Chrome 120]
- OS: [e.g., macOS 14.0]
- Node.js version: [e.g., v18.0.0]

**Screenshots**
If applicable

**Console Errors**
Any error messages from browser console
```

## 💡 Feature Requests

### Feature Request Template
```markdown
**Feature Description**
Clear description of the feature

**Use Case**
Why this feature would be useful

**Proposed Solution**
How you envision it working

**Alternatives Considered**
Other approaches you've thought about

**Additional Context**
Any other relevant information
```

## 🎨 UI/UX Improvements

When proposing UI changes:
- Maintain consistency with existing design
- Consider dark/light theme support
- Ensure mobile responsiveness
- Keep accessibility in mind
- Provide mockups or screenshots if possible

## 📚 Code of Conduct

### Our Standards
- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what's best for the project
- Show empathy towards other contributors

### Unacceptable Behavior
- Harassment or discriminatory language
- Trolling or insulting comments
- Public or private harassment
- Publishing others' private information
- Other conduct inappropriate in a professional setting

## 📞 Questions?

- Open an issue with the `question` label
- Check existing issues and discussions
- Review the README for basic questions

## 🙏 Recognition

Contributors will be:
- Listed in the project's contributor section
- Mentioned in release notes for significant contributions
- Appreciated for their time and effort!

Thank you for helping make Crypto Scanner better! 🚀
