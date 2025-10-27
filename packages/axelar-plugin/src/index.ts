import { createPlugin } from "every-plugin";
import { Effect } from "every-plugin/effect";
import { z } from "every-plugin/zod";

import { contract } from "./contract";
import { DataProviderService } from "./service";

/**
 * Axelar Data Provider Plugin - Collects cross-chain metrics from Axelar Network
 *
 * Axelar is a decentralized interoperability network that provides:
 * - General Message Passing (GMP) for cross-chain applications
 * - Secure cross-chain asset transfers via wrapped tokens
 * - Validator network securing all transactions
 * - Support for 50+ blockchain networks
 * 
 * This plugin fetches:
 * - Volume metrics from transfer history
 * - Real-time fee structures and rates
 * - Liquidity depth based on transfer analysis
 * - Comprehensive asset listings across all chains
 */
export default createPlugin({
  id: "@near-intents/axelar-data-provider",

  variables: z.object({
    baseUrl: z.string().url().default("https://api.axelarscan.io"),
    timeout: z.number().min(1000).max(60000).default(30000),
    priceBaseUrl: z.string().url().default("https://api.coingecko.com/api/v3"),
  }),

  secrets: z.object({
    apiKey: z.string().optional().default(""),
  }),

  contract,

  initialize: (config) =>
    Effect.gen(function* () {
      // Create service instance with config
      const service = new DataProviderService(
        config.variables.baseUrl,
        config.secrets.apiKey,
        config.variables.timeout
      );

      // Test the connection during initialization
      yield* service.ping();

      return { service };
    }),

  shutdown: () => Effect.void,

  createRouter: (context, builder) => {
    const { service } = context;

    return {
      getSnapshot: builder.getSnapshot.handler(async ({ input }) => {
        const snapshot = await Effect.runPromise(
          service.getSnapshot(input)
        );
        return snapshot;
      }),

      ping: builder.ping.handler(async () => {
        return await Effect.runPromise(service.ping());
      }),
    };
  }
});
