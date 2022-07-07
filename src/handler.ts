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

  const currentTime = dayjs();
  const endOfAuction = dayjs.unix(BigNumber.from(auction.endTime).toNumber());
  const lagTime = Number(env.LAG_TIME);
  const lagPeriod = endOfAuction.add(lagTime, "minutes");

  const parsedGasLimit =
    typeof env.GAS_LIMIT !== "string"
      ? env.GAS_LIMIT.toString()
      : env.GAS_LIMIT;

  if (id % 10 === 9) {
    if (currentTime.isSameOrAfter(endOfAuction)) {
      if (currentTime.isSameOrAfter(lagPeriod)) {
        const currentGas = await provider.getGasPrice();
        const gasLimit = ethers.utils.parseUnits(parsedGasLimit, "gwei");

        if (currentGas.lte(gasLimit)) {
          console.log(`attempting to settle auction ${id}...`);
          const wallet = new ethers.Wallet(env.WKEY).connect(provider);
          Contract = new ethers.Contract(
            LilNouns.address,
            LilNouns.abi,
            wallet
          );
          try {
            // await Contract.settleCurrentAndCreateNewAuction();
          } catch (error) {
            console.log("something went wrong...", error);
          }
        } else {
          console.log(
            `auction ${id}. gas too high (${currentGas}). skipping remaining checks`
          );
        }
      } else {
        console.log(`lag period for auction ${id} not over...`);
      }
    } else {
      console.log(`auction ${id} not over...`);
    }
  } else {
    console.log(`auction ${id}. skipping remaining checks...`);
  }
};

export default Handler;
