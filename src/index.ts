// This is the agent.ts from NaniDAO 
// Since index.ts is the initiator of the program, renaming agent.ts to index.ts


import { SYSTEM_PROMPT } from "./config/prompt";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import {OpenAI} from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

let PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;

if (!PRIVATE_KEY) {
  PRIVATE_KEY = generatePrivateKey();
  console.log("Generated Private Key:", PRIVATE_KEY);
}

const account = privateKeyToAccount(PRIVATE_KEY);

console.log("Agent Address: ", account.address);

const walletClient = createWalletClient({
  account, // Ensure this is a valid Account object
  chain: sepolia,
  transport: http(`https://rpc.ankr.com/eth_sepolia/${process.env.ANKR_API_KEY}`),
});

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(`https://rpc.ankr.com/eth_sepolia/${process.env.ANKR_API_KEY}`),
});

console.log(process.env.OPENAI_API_KEY);

// Instantiating the openai model:
const openai = new OpenAI({
  apiKey : process.env.OPENAI_API_KEY
});

async function main() {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content:
            "Initialize trading session and take action. Your goal is to analyze the market AND execute profitable trades using our test funds. Start by checking our balance, identify opportunities, and execute a trade if you spot a good setup. Don't just analyze - trade when you see an opportunity!",
        },
      ],
    });
    const text = completion.choices[0];
    console.log("[FINAL RESULT]", text);
  } catch (error) {
    console.error("Error in main function:", error);
  }
}

main()