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
  const lagPeriod = endOfAuction.add(env.LAG_PERIOD, "minutes");

  // console.log("eoa:", endOfAuction);
  // console.log("end of lag period:", lagPeriod);
  // console.log("current:", currentTime);
  // console.log(now.isSameOrAfter(lagPeriod));

  if (currentTime.isSameOrAfter(endOfAuction)) {
    if (id % 10 === 9) {
      if (currentTime.isSameOrAfter(lagPeriod)) {
        console.log(`attempting to settle auction ${id}...`);
        const wallet = new ethers.Wallet(env.WKEY).connect(provider);
        Contract = new ethers.Contract(LilNouns.address, LilNouns.abi, wallet);
        try {
          await Contract.settleCurrentAndCreateNewAuction();
        } catch (error) {
          console.log("something went wrong...", error);
        }
      } else {
        console.log(`lag period for auction ${id} not over...`);
      }
    } else {
      console.log(`auction ${id}. skipping remaining checks...`);
    }
  } else {
    console.log(`auction ${id} not over...`);
  }
};

export default Handler;
