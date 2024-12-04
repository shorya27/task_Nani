import { AnkrProvider } from "@ankr.com/ankr.js";

const provider = new AnkrProvider(
  `https://rpc.ankr.com/multichain/${process.env.ANKR_API_KEY}`,
);

const resp = await provider.getAccountBalance({
  blockchain: "base",
  walletAddress: "0xcF7E3c262E1bc392472EbE255ae8872a1Fc645BB",
  onlyWhitelisted: false,
});

console.log(resp);
