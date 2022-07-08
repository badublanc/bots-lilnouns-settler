import type { EnvironmentVars } from "./types";
import { ethers, BigNumber } from "ethers";
import LilNouns from "./contract.json";

import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
dayjs.extend(isSameOrAfter);

const Handler = async (event: ScheduledEvent, env: EnvironmentVars) => {
  const provider = new ethers.providers.StaticJsonRpcProvider({
    url: env.RPC,
    skipFetchSetup: true,
  });
  let Contract = new ethers.Contract(LilNouns.address, LilNouns.abi, provider);

  let auction = await Contract.auction();
  const id = BigNumber.from(auction.nounId).toNumber();

  if (id % 10 !== 9) {
    console.log(`auction ${id}. skipping remaining checks...`);
    return;
  }

  const currentTime = dayjs();
  const endOfAuction = dayjs.unix(BigNumber.from(auction.endTime).toNumber());

  if (currentTime.isBefore(endOfAuction)) {
    console.log(`auction ${id} is still active. skipping remaining checks...`);
    return;
  }

  const lagTime = Number(env.LAG_TIME);
  const endOfLagPeriod = endOfAuction.add(lagTime, "minutes");

  if (currentTime.isBefore(endOfLagPeriod)) {
    console.log(
      `lag period for auction ${id} not over. skipping remaining checks...`
    );
    return;
  }

  const gasLimit = ethers.utils.parseUnits(env.GAS_LIMIT, "gwei");
  const currentGas = await provider.getGasPrice();

  if (currentGas.gt(gasLimit)) {
    console.log(
      `auction ${id}. gas too high (${currentGas}). skipping remaining checks...`
    );
    return;
  }

  console.log(`attempting to settle auction ${id}...`);

  const wallet = new ethers.Wallet(env.WKEY).connect(provider);
  Contract = new ethers.Contract(LilNouns.address, LilNouns.abi, wallet);

  try {
    await Contract.settleCurrentAndCreateNewAuction();
    console.log("txn sent...");
  } catch (error) {
    console.log("something went wrong...", error);
  }

  return;
};

export default Handler;
