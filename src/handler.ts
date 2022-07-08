import type { EnvironmentVars } from "./types";
import LilNouns from "./contract.json";
import { ethers } from "ethers";
import dayjs from "dayjs";

const Handler = async (event: ScheduledEvent, env: EnvironmentVars) => {
  const provider = new ethers.providers.StaticJsonRpcProvider({
    url: env.RPC,
    skipFetchSetup: true,
  });
  let Contract = new ethers.Contract(LilNouns.address, LilNouns.abi, provider);

  let auction = await Contract.auction();
  const id = auction.nounId.toNumber();

  if (id % 10 !== 9) {
    console.log(`SKIP :: Auction ${id}`);
    return;
  }

  const currentTime = dayjs();
  const endOfAuction = dayjs.unix(auction.endTime.toNumber());

  if (currentTime.isBefore(endOfAuction)) {
    console.log(`SKIP :: Auction ${id} :: Active auction`);
    return;
  }

  const lagTime = Number(env.LAG_TIME);
  const endOfLagPeriod = endOfAuction.add(lagTime, "minutes");

  if (currentTime.isBefore(endOfLagPeriod)) {
    console.log(`SKIP :: Auction ${id} :: In lag period`);
    return;
  }

  const gasLimit = ethers.utils.parseUnits(env.GAS_LIMIT, "gwei");
  const currentGas = await provider.getGasPrice();

  if (currentGas.gt(gasLimit)) {
    console.log(`SKIP :: Auction ${id} :: Gas too high (${currentGas})`);
    return;
  }

  console.log(`INITIATE :: Auction ${id} :: Settlement attempt`);

  const wallet = new ethers.Wallet(env.WKEY).connect(provider);
  Contract = new ethers.Contract(LilNouns.address, LilNouns.abi, wallet);

  try {
    await Contract.settleCurrentAndCreateNewAuction();
    console.log(`PROCESSED :: Auction ${id}`);
  } catch (error) {
    console.log("ERROR ::", error);
  }

  return;
};

export default Handler;
