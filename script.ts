import { AnkrProvider } from "@ankr.com/ankr.js";
// import { privateKeyToAddress } from "viem/accounts";

const provider = new AnkrProvider(
  `https://rpc.ankr.com/multichain/${process.env.ANKR_API_KEY}`,
);

const resp = await provider.getAccountBalance({
  blockchain: "eth_sepolia",
  walletAddress: "0xa96810d77adE42Bacaf14335D5b9501CE352Da7b",
  onlyWhitelisted: false,
});

console.log(resp);


// const walletAddress = privateKeyToAddress('0x78035df4769e390b8bbdbe5f64c30edefd41d820b40085e26f91ecb3b8782ed0')
// console.log(walletAddress);