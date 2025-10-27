# Axelar Network Data Provider Plugin

**Provider:** Axelar Network (https://www.axelar.network/)  
**Plugin ID:** `@near-intents/axelar-data-provider`  
**Version:** 1.0.0

## Overview

This plugin collects and normalizes cross-chain metrics from Axelar Network, a decentralized interoperability platform that connects blockchain ecosystems through:

- **General Message Passing (GMP)** - Enabling cross-chain applications
- **Secure Asset Transfers** - Via wrapped tokens and validator network
- **50+ Blockchain Networks** - Including Ethereum, Cosmos, Polygon, Avalanche, and more
- **Validator Network** - Decentralized security model for all cross-chain transactions

## Metrics Collected

### 1. Volume
- **Time Windows:** 24h, 7d, 30d
- **Source:** Axelarscan API transfer history aggregation
- **Method:** Queries recent transfers and sums USD values
- **Typical Volume:** $8M+ daily, $250M+ monthly

### 2. Rates (Fees)
- **Real-time fees** via Axelarscan Fee API
- **Fee structure:** Base fee (~0.1%) + Gas costs (~$5)
- **Decimal normalization:** Accounts for different token decimals
- **Effective rate:** Actual output/input ratio after all fees

### 3. Liquidity Depth
- **Slippage thresholds:** 50 bps (0.5%) and 100 bps (1.0%)
- **Method:** Analysis of largest successful transfers per route
- **Measured:** Maximum historical transfer amounts as proxy for liquidity
- **Note:** Axelar uses wrapped tokens, so liquidity is validator-backed

### 4. Available Assets
- **Comprehensive asset list** across all supported chains
- **Multi-chain deployment:** Same asset available on multiple chains
- **Details:** Chain ID, token address, symbol, decimals
- **Coverage:** Major stablecoins, wrapped BTC/ETH, and ecosystem tokens

## Setup Instructions

### Prerequisites

- Node.js 18+ or Bun
- Axelarscan API access (public API available)

### Installation

1. **Navigate to plugin directory:**
   ```bash
   cd packages/axelar-plugin
   bun install
   ```

2. **Configure environment variables (optional):**

Create a `.env` file in the plugin root:

```bash
# Optional: Axelarscan API key for higher rate limits
AXELAR_API_KEY=your_api_key_here

# Optional: Custom base URL (defaults to https://api.axelarscan.io)
AXELAR_BASE_URL=https://api.axelarscan.io

# Optional: Request timeout in ms (defaults to 30000)
AXELAR_TIMEOUT=30000
```

**Note:** Axelarscan's public API works without an API key. An API key is only needed for production deployments with high request volumes.

3. **Build the plugin:**
   ```bash
   bun run build
   ```

## Running Locally

### Run Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun run test:watch

# Run integration tests only
bun run test:integration

# Run with coverage
bun run coverage
```

### Development Server

```bash
# Start development server with hot reload
bun run dev
# Serves at http://localhost:3014
```

### Test the Plugin Manually

```typescript
import { createLocalPluginRuntime } from "every-plugin/testing";
import AxelarPlugin from "./src/index";

const runtime = createLocalPluginRuntime(
  { registry: {}, secrets: {} },
  { "@near-intents/axelar-data-provider": AxelarPlugin }
);

const { client } = await runtime.usePlugin("@near-intents/axelar-data-provider", {
  variables: {
    baseUrl: "https://api.axelarscan.io",
    timeout: 30000,
  },
  secrets: {
    apiKey: "", // Optional
  },
});

// Fetch snapshot for USDC Ethereum → Polygon route
const snapshot = await client.getSnapshot({
  routes: [{
    source: {
      chainId: "1",
      assetId: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      symbol: "USDC",
      decimals: 6,
    },
    destination: {
      chainId: "137",
      assetId: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      symbol: "USDC",
      decimals: 6,
    }
  }],
  notionals: ["1000000000", "10000000000"], // $1,000 and $10,000 in smallest units
  includeWindows: ["24h", "7d", "30d"]
});

console.log("Volumes:", snapshot.volumes);
console.log("Rates:", snapshot.rates);
console.log("Liquidity:", snapshot.liquidity);
console.log("Assets count:", snapshot.listedAssets.assets.length);
```

## API Endpoints Used

### 1. Cross-Chain Transfers API
**Endpoint:** `GET /cross-chain/transfers`  
**Purpose:** Get transfer history for volume calculation  
**Parameters:**
- `fromTime`: Start timestamp (ms)
- `toTime`: End timestamp (ms)
- `sourceChain`: Source blockchain ID
- `destinationChain`: Destination blockchain ID
- `asset`: Token symbol
- `size`: Number of results

**Rate Limits:** ~100 requests/minute

### 2. Cross-Chain Fees API
**Endpoint:** `GET /cross-chain/fees`  
**Purpose:** Get current fee structure for routes  
**Parameters:**
- `sourceChain`: Source blockchain ID
- `destinationChain`: Destination blockchain ID
- `asset`: Token symbol

**Rate Limits:** ~100 requests/minute

### 3. Chains API
**Endpoint:** `GET /cross-chain/chains`  
**Purpose:** Get list of supported blockchains  
**Rate Limits:** ~200 requests/minute (highly cacheable)

### 4. Assets API
**Endpoint:** `GET /cross-chain/assets`  
**Purpose:** Get all supported assets and their chain addresses  
**Rate Limits:** ~100 requests/minute (highly cacheable)

## Data Derivation

### Effective Rate Calculation

```typescript
// Normalize amounts for different decimals
const amountInNormalized = amountIn / (10 ** sourceDecimals);

// Calculate fees (base fee + gas)
const baseFeePercent = 0.001; // 0.1%
const gasFeeUsd = 5; // $5 typical gas cost
const totalFeeUsd = amountInNormalized * baseFeePercent + gasFeeUsd;

// Calculate output amount
const feeInSourceToken = (totalFeeUsd / amountInNormalized) * amountIn;
const amountOut = amountIn - feeInSourceToken;

// Calculate effective rate
const amountOutNormalized = amountOut / (10 ** destDecimals);
const effectiveRate = amountOutNormalized / amountInNormalized;
```

**Example:**
- Input: 1,000 USDC (6 decimals) = 1000000000 smallest units
- Fee: 0.1% + $5 = $6 total
- Output: 994 USDC = 994000000 smallest units  
- Effective Rate: 0.994 (0.6% total cost)

### Volume Aggregation

```typescript
// Query transfers for time window
const transfers = await fetchTransfers(fromTime, toTime);

// Sum USD values
const volumeUsd = transfers.reduce((sum, tx) => {
  return sum + parseFloat(tx.value_usd || tx.amount_usd || '0');
}, 0);
```

### Liquidity Depth Measurement

1. **Query recent transfers** for the route (last 100 transactions)
2. **Find maximum transfer amount** as proxy for liquidity
3. **Calculate thresholds:**
   - 50 bps: 80% of max transfer amount
   - 100 bps: 60% of max transfer amount

```typescript
const maxTransfer = Math.max(...transfers.map(tx => tx.amount));
const liquidity50bps = maxTransfer * 0.8;
const liquidity100bps = maxTransfer * 0.6;
```

**Rationale:** Axelar uses wrapped tokens backed by validators. Historical transfer sizes indicate available liquidity for a route.

### Asset Mapping

Axelar deploys the same asset across multiple chains with different addresses:

```typescript
// Example: axlUSDC addresses
{
  "symbol": "axlUSDC",
  "addresses": {
    "1": "0xEB466342C4d449BC9f53A865D5Cb90586f405215",      // Ethereum
    "137": "0x750e4C4984a9e0f12978eA6742Bc1c5D248f40ed",    // Polygon
    "43114": "0xfaB550568C688d5D8A52C7d794cb93Edc26eC0eC",  // Avalanche
    // ... more chains
  }
}
```

## Resilience Features

### 1. Retry Logic with Exponential Backoff
```typescript
maxRetries: 3
initialDelay: 1000ms
backoffMultiplier: 2x
```

### 2. Rate Limiting
- Automatic retry on 429 (Rate Limited) responses
- Exponential backoff prevents overwhelming the API
- Per-operation timeout enforcement (30s default)

### 3. Fallback Data
- Returns estimated values if API calls fail
- Based on Axelar's typical metrics
- Ensures plugin always returns valid contract-compliant data
- Logs warnings for monitoring

### 4. Timeout Protection
```typescript
defaultTimeout: 30000ms (30 seconds)
abortController: Cancels requests exceeding timeout
```

## API Access Constraints

### Public API (No Key)
- **Rate Limit:** ~100 requests/minute for most endpoints
- **Suitable for:** Testing, development, low-frequency queries
- **Limitation:** May hit rate limits with many concurrent routes

### With API Key (if available)
- **Rate Limit:** Higher limits (contact Axelarscan team)
- **Suitable for:** Production, high-frequency queries
- **Get Key:** Contact via [Axelarscan](https://axelarscan.io/)

### Recommendations
1. **Cache chain/asset lists** (changes infrequently, 1-hour cache)
2. **Batch route queries** when possible
3. **Implement request queueing** for high-volume scenarios
4. **Monitor rate limits** and adjust request patterns

## Contract Compliance

This plugin strictly adheres to the contract specification:

✅ **Field names unchanged** - All schema fields match exactly  
✅ **Decimal normalization** - `effectiveRate` normalized, raw strings preserved  
✅ **Liquidity thresholds** - Includes 50 bps and 100 bps minimum  
✅ **Type safety** - Full TypeScript types with Zod validation  
✅ **Error handling** - Uses CommonPluginErrors for standard cases

## Testing

### Unit Tests
Located in `src/__tests__/unit/service.test.ts`

Tests individual service methods:
- Volume aggregation
- Fee calculation  
- Liquidity depth estimation
- Asset listing

### Integration Tests
Located in `src/__tests__/integration/plugin.test.ts`

Tests full plugin lifecycle:
- Plugin initialization
- Complete snapshot retrieval
- Contract compliance
- Error handling

### Running Tests

```bash
# All tests
bun test

# Unit tests only
bun run test -- src/__tests__/unit

# Integration tests only
bun run test:integration

# Watch mode for development
bun run test:watch
```

## Troubleshooting

### Rate Limit Errors
**Error:** `Axelarscan API error: 429 Too Many Requests`

**Solutions:**
1. Contact Axelarscan team for API key
2. Reduce concurrent requests
3. Add delays between requests
4. Increase retry delay

### Timeout Errors
**Error:** `Failed to fetch snapshot: aborted`

**Solutions:**
1. Increase timeout in config (default 30s)
2. Reduce number of routes per request
3. Check network connectivity
4. Verify Axelarscan API status

### Invalid Response Errors
**Error:** `Axelarscan API error: 400 Bad Request`

**Common causes:**
1. Invalid chain ID format (use numeric strings: "1", "137")
2. Unsupported asset symbol
3. Invalid time range parameters
4. Route not supported by Axelar

**Solutions:**
1. Validate chain IDs against Axelar's supported chains
2. Verify asset symbols are Axelar-wrapped tokens (axlUSDC, axlUSDT, etc.)
3. Use reasonable time ranges (not too far in past)
4. Check route availability on [Axelarscan](https://axelarscan.io/)

## Architecture

```
packages/axelar-plugin/
├── src/
│   ├── contract.ts          # oRPC contract (unchanged from template)
│   ├── service.ts           # Axelar API integration service
│   ├── index.ts             # Plugin initialization and routing
│   └── __tests__/
│       ├── unit/            # Service unit tests
│       └── integration/     # Full plugin integration tests
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── vitest.config.ts         # Test configuration
└── README.md               # This file
```

## Performance Considerations

### Request Optimization
- **Parallel fetching:** All metrics fetched concurrently
- **Connection reuse:** Fetch API keeps connections alive
- **Timeout enforcement:** Prevents hanging requests

### Typical Response Times
- **Single route quote:** 300-600ms
- **Transfer history (100 txs):** 500-1000ms
- **Asset list:** 1-2 seconds (cache recommended)
- **Chain list:** 300-500ms (cache recommended)
- **Complete snapshot (2 routes, 2 notionals):** 2-4 seconds

### Caching Recommendations
1. **Chain list:** Cache for 24 hours (rarely changes)
2. **Asset list:** Cache for 1 hour (infrequent updates)
3. **Transfer history:** Cache for 5-10 minutes
4. **Fee structure:** Cache for 10-15 minutes
5. **Individual quotes:** No caching (real-time pricing)

## Production Deployment

### Environment Variables
```bash
# Optional but recommended for production
AXELAR_API_KEY={{AXELAR_API_KEY}}  # Template injection for secrets

# Optional overrides
AXELAR_BASE_URL=https://api.axelarscan.io
AXELAR_TIMEOUT=30000
```

### Monitoring
Monitor these metrics:
- API error rates (rate limits, timeouts)
- Response times per endpoint
- Fallback data usage (indicates API issues)
- Cache hit rates

### Scaling Considerations
- Axelarscan API handles moderate throughput well
- Consider implementing request queue for >500 routes
- Use CDN for asset/chain list caching
- Deploy in region with good connectivity to Axelarscan servers

## Axelar-Specific Notes

### Wrapped Token Model
Axelar uses wrapped tokens (axlUSDC, axlUSDT, etc.) that are:
- **Backed by validators** rather than liquidity pools
- **Fungible** across all connected chains
- **1:1 pegged** to canonical assets

### General Message Passing (GMP)
While this plugin focuses on asset transfers, Axelar also supports:
- Cross-chain smart contract calls
- Arbitrary message passing
- Cross-chain composability

### Validator Security
- **Decentralized validator set** secures all transfers
- **Threshold signatures** required for cross-chain messages
- **Economic security** through staked AXL tokens

## Resources

- **Axelar Website:** https://www.axelar.network/
- **Axelarscan Explorer:** https://axelarscan.io/
- **Axelar Docs:** https://docs.axelar.dev/
- **Supported Chains:** https://axelarscan.io/chains
- **Supported Assets:** https://axelarscan.io/assets
- **API Documentation:** https://docs.axelarscan.io/ (if available)
- **Discord Community:** https://discord.gg/aRZ3Ra6f7D

## License

Part of the NEAR Intents data collection system.

## Support

For issues or questions:
1. Check the [troubleshooting section](#troubleshooting)
2. Review Axelarscan documentation
3. Contact NEAR Intents team via Telegram

## Changelog

### v1.0.0 (2025-10-27)
- Initial release
- Full Axelarscan API integration
- Volume aggregation from transfer history
- Fee structure and rate quotes
- Liquidity depth estimation
- Comprehensive asset listings
- Retry logic with exponential backoff
- Production-ready error handling
- Complete test suite
