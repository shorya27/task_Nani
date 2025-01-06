
import { SYSTEM_PROMPT } from "./config/prompt";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { OpenAI } from "openai";

// Validate environment variables
let PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY as Hex;
const ANKR_API_KEY = process.env.ANKR_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

PRIVATE_KEY = `0x${PRIVATE_KEY}`;

let prompt = SYSTEM_PROMPT

try {
  // Set up the account
  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log("Agent Address:", account.address);

  // Set up Wallet Client
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(`https://rpc.ankr.com/eth_sepolia/${ANKR_API_KEY}`),
  });

  // Set up Public Client
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(`https://rpc.ankr.com/eth_sepolia/${ANKR_API_KEY}`),
  });

  console.log("Successfully connected to Sepolia network.");

  // Set up OpenAI API
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });
  console.log("Successfully connected to OpenAI API.");

  // Function to send a transaction
  async function sendTransaction() {
    try {
      console.log("Preparing transaction...");

      const nonce = await publicClient.getTransactionCount({
        address: account.address,
      });

      console.log("Current nonce:", nonce);

      const tx = {
        to: "0x7b7568111414AB7577Cf9bbc1Ac201a4FC40a823", // Dummy address for testing
        value: BigInt(1e15), // Send 0.001 ETH (in wei)
        gas: 21000n, // Standard gas limit for a simple transfer
        gasPrice: await publicClient.getGasPrice(),
        nonce,
        chainId: sepolia.id,
      };

      console.log("Transaction details:", tx);

      // Sign and send the transaction
      const txHash = await walletClient.sendTransaction({account, ...tx });

      console.log("Transaction sent successfully!");
      console.log("Transaction Hash:", txHash);

      return txHash;
    } catch (error) {
      console.error("Error sending transaction:", error);
      throw error;
    }
  }

  async function main() {
    try {
      console.log("Initializing trading session...");

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content:prompt,
          },
        ],
      });

      const text = completion.choices[0].message?.content || "No response";
      console.log("[FINAL RESULT]", text);

      const txHash = await sendTransaction();
      console.log("[Transaction Hash]:", txHash);
    } catch (error) {
      console.error("Error in main function:", error);
    }
  }

  main();
} catch (error) {
  console.error("Error during initialization:", error);
}





// import { SYSTEM_PROMPT } from "./config/prompt";
// import { createPublicClient, createWalletClient, http, type Hex } from "viem";
// import { privateKeyToAccount } from "viem/accounts";
// import { sepolia } from "viem/chains";
// import { OpenAI } from "openai";
// // import ethers from "ethers";

// // Validate environment variables
// let PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY as Hex;
// const ANKR_API_KEY = process.env.ANKR_API_KEY;
// const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// const UNISWAP_ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

// PRIVATE_KEY = `0x${PRIVATE_KEY}`;

// let prompt = SYSTEM_PROMPT;

// try {
//   // Set up the account
//   const account = privateKeyToAccount(PRIVATE_KEY);
//   console.log("Agent Address:", account.address);

//   // Set up Wallet Client
//   const walletClient = createWalletClient({
//     account,
//     chain: sepolia,
//     transport: http(`https://rpc.ankr.com/eth_sepolia/${ANKR_API_KEY}`),
//   });

//   // Set up Public Client
//   const publicClient = createPublicClient({
//     chain: sepolia,
//     transport: http(`https://rpc.ankr.com/eth_sepolia/${ANKR_API_KEY}`),
//   });

//   console.log("Successfully connected to Sepolia network.");

//   // Set up OpenAI API
//   const openai = new OpenAI({
//     apiKey: OPENAI_API_KEY,
//   });
//   console.log("Successfully connected to OpenAI API.");

//   // Function to interact with Uniswap V3
//   async function swapExactInputSingle(tokenIn: string, tokenOut: string, amountIn: bigint, fee: number = 3000) {
//     try {
//       console.log("Preparing swap transaction...");

//       // Get nonce
//       const nonce = await publicClient.getTransactionCount({
//         address: account.address,
//       });

//       // Define swap parameters
//       const params = {
//         tokenIn,
//         tokenOut,
//         fee,
//         recipient: account.address,
//         deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from now
//         amountIn,
//         amountOutMinimum: 0n, // Accept any amount out for now
//         sqrtPriceLimitX96: 0n, // No price limit
//       };

//       // Construct transaction
//       const tx = {
//         to: UNISWAP_ROUTER_ADDRESS,
//         data: encodeExactInputSingle(params), // Encoding function call
//         gas: 210000n, // Estimated gas for swap
//         gasPrice: await publicClient.getGasPrice(),
//         nonce,
//         value: 0n, // Assuming token swap, no ETH sent
//         chainId: sepolia.id,
//       };

//       console.log("Swap transaction details:", tx);

//       // Send transaction
//       const txHash = await walletClient.sendTransaction({ account, ...tx });
//       console.log("Swap Transaction sent successfully!");
//       console.log("Transaction Hash:", txHash);

//       return txHash;
//     } catch (error) {
//       console.error("Error during swap:", error);
//       throw error;
//     }
//   }

//   // Function to get trade suggestions from GPT-4
//   async function getTradeParameters() {
//     const completion = await openai.chat.completions.create({
//       model: "gpt-4",
//       messages: [
//         { role: "system", content: SYSTEM_PROMPT },
//         { role: "user", content:"make me as much sepolia eth from swapping as possible" },
//       ],
//     });

//     const response = completion.choices[0].message?.content || "{}";
//     console.log("GPT-4 Response:", response);

//     // Parse GPT-4 response
//     // const { tokenIn, tokenOut, amountIn, fee } = JSON.parse(response);
//     // return { tokenIn, tokenOut, amountIn: BigInt(amountIn), fee: Number(fee) };
//   }

//   async function main() {
//     try {
//       console.log("Initializing trading session...");

//       // Get trade parameters from GPT-4
//       const { tokenIn, tokenOut, amountIn, fee } = await getTradeParameters();
//       console.log("Trade Parameters:", { tokenIn, tokenOut, amountIn, fee });

//       // Perform the swap
//       const txHash = await swapExactInputSingle(tokenIn, tokenOut, amountIn, fee);
//       console.log("[Swap Transaction Hash]:", txHash);
//     } catch (error) {
//       console.error("Error in main function:", error);
//     }
//   }

//   main();
// } catch (error) {
//   console.error("Error during initialization:", error);
// }

// // Helper: Encode swapExactInputSingle function call
// function encodeExactInputSingle(params: any) {
//   const abi = [
//     "function exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160)) external payable returns (uint256)",
//   ];
//   const iface = new ethers.utils.Interface(abi);
//   return iface.encodeFunctionData("exactInputSingle", [params]);
// }
