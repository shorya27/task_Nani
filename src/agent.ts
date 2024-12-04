import { SYSTEM_PROMPT } from "./config/prompt";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { createNaniTools } from "./tools";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

let PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;

if (!PRIVATE_KEY) {
  PRIVATE_KEY = generatePrivateKey();
  console.log("Generated Private Key:", PRIVATE_KEY);
}

const account = privateKeyToAccount(PRIVATE_KEY);

console.log("Agent Address: ", account.address);

const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(),
});

const publicClient = createPublicClient({
  chain: base,
  transport: http(`https://rpc.ankr.com/base/${process.env.ANKR_API_KEY}`),
});

const tools = createNaniTools({
  account,
  walletClient,
  publicClient,
});

const { text } = await generateText({
  model: openrouter("anthropic/claude-3.5-sonnet"),
  maxSteps: 10,
  system: SYSTEM_PROMPT,
  tools,
  prompt:
    "Initialize trading session and take action. Your goal is to analyze the market AND execute profitable trades using our test funds. Start by checking our balance, identify opportunities, and execute a trade if you spot a good setup. Don't just analyze - trade when you see an opportunity!",
  onStepFinish({ text, toolCalls, toolResults, finishReason, usage }) {
    console.log("[THINKING]", text);
    if (toolCalls[0]?.toolName) {
      console.log(`[${toolCalls[0].toolName}]`, toolResults[0]?.result);
    }
  },
});

console.log(text);
