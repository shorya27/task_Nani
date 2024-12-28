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
import { sepolia } from "viem/chains";

if (!process.env.ANKR_API_KEY) {
  throw new Error("ANKR_API_KEY environment variable must be set");
}

const provider = new AnkrProvider(
  `https://rpc.ankr.com/eth_sepolia/${process.env.ANKR_API_KEY}`
);

const EXCHANGE_PROXY = "0x3bF4A767F89E9eefc5a80d6E87c3B9B77123C7D";

export const createNaniTools = ({
  account,
  walletClient,
  publicClient,
}: {
  account: Account;
  walletClient: WalletClient<Transport, typeof sepolia>;
  publicClient: PublicClient;
}) => ({
  getLatestToken: tool({
    description: "Get trending tokens and market data on Sepolia",
    parameters: z.object({}),
    execute: async () => {
      try {
        const profileResponse = await fetch(
          "https://api.dexscreener.com/token-profiles/latest/v1"
        );
        const profileData = await profileResponse.json();

        const sepoliaTokens = profileData
          .filter((item: { chainId: string }) => item.chainId === "11155111")
          .slice(0, 5);

        const tokenAddresses = sepoliaTokens
          .map((token: { tokenAddress: string }) => token.tokenAddress)
          .join(",");

        const pairResponse = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${tokenAddresses}`
        );

        if (!pairResponse.ok) {
          throw new Error(
            `Failed to fetch pair data: ${pairResponse.statusText}`
          );
        }

        const pairData = await pairResponse.json();

        return {
          trending: sepoliaTokens.map(
            (token: { description: any; tokenAddress: string }) => {
              const pairInfo = pairData.pairs?.find(
                (pair: { baseToken: { address: string } }) =>
                  pair.baseToken.address.toLowerCase() ===
                  token.tokenAddress.toLowerCase()
              );

              return {
                tokenAddress: token.tokenAddress,
                description: token.description,
                priceUSD: pairInfo?.priceUsd || "0",
                volume24h: pairInfo?.volume?.h24 || "0",
                priceChange24h: pairInfo?.priceChange?.h24 || "0",
              };
            }
          ),
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
      try {
        const [address] = await walletClient.getAddresses();
        const resp = await provider.getAccountBalance({
          blockchain: "eth_sepolia",
          walletAddress: address,
          onlyWhitelisted: false,
        });

        return resp || { error: "Failed to fetch balance" };
      } catch (error) {
        return { error: `Balance fetch failed:` };
      }
    },
  }),

  swap: tool({
    description: "Execute token swaps on Sepolia",
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

        const sellToken = normalize(fromToken);
        const buyToken = normalize(toToken);

        const sellDecimals =
          sellToken === "ETH"
            ? 18
            : await publicClient
                .readContract({
                  address: sellToken as Address,
                  functionName: "decimals",
                  abi: erc20Abi,
                })
                .catch(() => {
                  throw new Error(`Failed to fetch decimals for ${sellToken}`);
                });

        const buyDecimals =
          buyToken === "ETH"
            ? 18
            : await publicClient
                .readContract({
                  address: buyToken as Address,
                  functionName: "decimals",
                  abi: erc20Abi,
                })
                .catch(() => {
                  throw new Error(`Failed to fetch decimals for ${buyToken}`);
                });

        const sellAmount = parseUnits(amount, sellDecimals);

        if (sellToken !== "ETH") {
          const currentAllowance = await publicClient.readContract({
            address: sellToken as Address,
            abi: erc20Abi,
            functionName: "allowance",
            args: [address, EXCHANGE_PROXY],
          });

          if (sellAmount > BigInt(currentAllowance)) {
            const hash = await walletClient.writeContract({
              account,
              abi: erc20Abi,
              address: sellToken as Address,
              functionName: "approve",
              args: [EXCHANGE_PROXY, maxUint256],
            });

            await publicClient.waitForTransactionReceipt({ hash });
          }
        }

        const txHash = await walletClient.sendTransaction({
          account,
          to: EXCHANGE_PROXY as Address,
          data: "0x",
          value: sellToken === "ETH" ? sellAmount : BigInt(0),
        });

        return {
          success: true,
          txHash,
          message: `Swap initiated successfully! Transaction Hash: ${txHash}`,
        };
      } catch (error) {
        return {
          error: `Swap failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    },
  }),
});

const normalize = (token: string) => {
  if (token.toLowerCase() === "eth") return "ETH";
  if (/^0x[a-fA-F0-9]{40}$/.test(token)) return token;
  throw new Error(`Invalid token address: ${token}`);
};
