import {
  erc20Abi,
  formatUnits,
  maxUint256,
  parseUnits,
  type Account,
  type Address,
  type Hex,
  type PublicClient,
  type Transport,
  type WalletClient,
} from "viem";
import { AnkrProvider } from "@ankr.com/ankr.js";

import { z } from "zod";
import { tool } from "ai";
import { base } from "viem/chains";

if (!process.env.ANKR_API_KEY) {
  throw new Error("ANKR_API_KEY environment variable must be set");
}

const provider = new AnkrProvider(
  `https://rpc.ankr.com/multichain/${process.env.ANKR_API_KEY}`,
);

const ZEROX_API_URL = "https://base.api.0x.org";
const EXCHANGE_PROXY = "0xdef1c0ded9bec7f1a1670819833240f027b25eff";

export const createNaniTools = ({
  account,
  walletClient,
  publicClient,
}: {
  account: Account;
  walletClient: WalletClient<Transport, typeof base>;
  publicClient: PublicClient;
}) => ({
  getLatestToken: tool({
    description: "Get trending tokens and market data on Base",
    parameters: z.object({}),
    execute: async () => {
      try {
        const profileResponse = await fetch(
          "https://api.dexscreener.com/token-profiles/latest/v1",
        );
        const profileData = await profileResponse.json();

        const baseTokens = profileData
          .filter((item: { chainId: string }) => item.chainId === "base")
          .slice(0, 5);

        const tokenAddresses = baseTokens
          .map((token: { tokenAddress: string }) => token.tokenAddress + ",")
          .join("");

        const pairResponse = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${tokenAddresses}`,
        );

        if (!pairResponse.ok) {
          throw new Error(
            `Failed to fetch pair data: ${pairResponse.statusText}`,
          );
        }

        const pairData = await pairResponse.json();

        return {
          trending: baseTokens.map((token: { tokenAddress: string }) => {
            const pairInfo = pairData.pairs?.find(
              (pair: { baseToken: { address: string } }) =>
                pair.baseToken.address.toLowerCase() ===
                token.tokenAddress.toLowerCase(),
            );

            return {
              tokenAddress: token?.tokenAddress,
              description: token?.description,
              priceUSD: pairInfo?.priceUsd || "0",
              volume24h: pairInfo?.volume?.h24 || "0",
              priceChange24h: pairInfo?.priceChange?.h24 || "0",
            };
          }),
        };
      } catch (error) {
        console.error("Market analysis failed:", error);
        return {
          error:
            error instanceof Error
              ? error.message
              : "An unknown error occurred",
        };
      }
    },
  }),

  getBalance: tool({
    description: "Check token balances with current prices",
    parameters: z.object({}),
    execute: async () => {
      const [address] = await walletClient.getAddresses();
      const resp = await provider.getAccountBalance({
        blockchain: "base",
        walletAddress: address,
        onlyWhitelisted: false,
      });

      if (!resp) {
        return {
          error: "Failed to fetch balance",
        };
      } else {
        return resp;
      }
    },
  }),

  swap: tool({
    description: "Execute token swaps on Base with price validation",
    parameters: z.object({
      fromToken: z
        .string()
        .describe('Source token address (or "ETH" for native)'),
      toToken: z.string().describe("Destination token address"),
      amount: z.string().describe("Amount to swap"),
    }),
    execute: async ({ fromToken, toToken, amount }) => {
      try {
        const [address] = await walletClient.getAddresses();

        // Normalize token addresses
        const sellToken = normalize(fromToken);
        const buyToken = normalize(toToken);

        // Get decimals for both tokens
        const sellDecimals =
          sellToken === "ETH"
            ? 18
            : await publicClient.readContract({
                address: sellToken as Address,
                functionName: "decimals",
                abi: erc20Abi,
              });

        const buyDecimals =
          buyToken === "ETH"
            ? 18
            : await publicClient.readContract({
                address: buyToken as Address,
                functionName: "decimals",
                abi: erc20Abi,
              });

        // Calculate sell amount with proper decimals
        const sellAmount = parseUnits(amount, sellDecimals);

        // 1. Check if approval is needed (skip if selling ETH)
        if (sellToken !== "ETH") {
          const currentAllowance = await publicClient.readContract({
            address: sellToken as Address,
            abi: erc20Abi,
            functionName: "allowance",
            args: [address, EXCHANGE_PROXY],
          });

          // Set approval if needed
          if (sellAmount > currentAllowance) {
            const hash = await walletClient.writeContract({
              account,
              abi: erc20Abi,
              address: sellToken as Address,
              functionName: "approve",
              args: [EXCHANGE_PROXY, maxUint256],
            });
            // Wait for approval tx
            await publicClient.waitForTransactionReceipt({ hash });
          }
        }

        // 2. Get quote
        const params = new URLSearchParams({
          sellToken,
          buyToken,
          sellAmount: sellAmount.toString(),
          takerAddress: address,
        });

        const quoteResponse = await fetch(
          `${ZEROX_API_URL}/swap/v1/quote?${params.toString()}`,
          {
            headers: {
              "0x-api-key": process.env.ZEROX_API_KEY || "",
            },
          },
        );

        if (!quoteResponse.ok) {
          throw new Error(`Failed to get quote: ${quoteResponse.statusText}`);
        }

        const quote = await quoteResponse.json();

        if (!quote || quote.code) {
          throw new Error(quote.message || "Failed to get swap quote");
        }

        console.log("[SWAP QUOTE]", quote);

        // 3. Execute the swap
        const txHash = await walletClient.sendTransaction({
          account,
          to: quote.to as Address,
          data: quote.data as Hex,
          value: sellToken === "ETH" ? BigInt(quote.value || 0) : BigInt(0),
        });

        return {
          success: true,
          txHash,
          amountReceived: formatUnits(quote.buyAmount, buyDecimals),
          effectivePrice: quote?.price,
          estimatedGas: quote?.estimatedGas,
          guaranteedPrice: quote?.guaranteedPrice,
          sourceProtocol: quote?.sources?.[0]?.name || "Unknown",
          slippage: quote?.estimatedPriceImpact,
        };
      } catch (error) {
        return {
          error: `Swap failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  }),
});

const normalize = (token: string) => {
  if (token.toLowerCase() === "eth") return "ETH";
  return token;
};
