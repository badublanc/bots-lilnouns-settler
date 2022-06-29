import type { EnvironmentVars } from "./types";
import { ethers, BigNumber } from "ethers";
import LilNouns from "./contract.json";

const Handler = async (event: ScheduledEvent, env: EnvironmentVars) => {
  const provider = new ethers.providers.StaticJsonRpcProvider({
    url: env.RPC,
    skipFetchSetup: true,
  });
  let Contract = new ethers.Contract(LilNouns.address, LilNouns.abi, provider);

  let auction = await Contract.auction();
  const id = BigNumber.from(auction.nounId).toNumber();

  if (id % 10 === 9) {
    console.log("settling...");
    const wallet = new ethers.Wallet(env.WKEY).connect(provider);
    Contract = new ethers.Contract(LilNouns.address, LilNouns.abi, wallet);
    await Contract.settleCurrentAndCreateNewAuction();
  } else {
    console.log("skipping settlement...");
  }
};

export default Handler;
