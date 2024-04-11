import { getAllCompileCode, getFixPriceSaleContractInit } from "./contract/compileContract";
import * as dotenv from "dotenv";
dotenv.config();
import { getWalletContract, user1, user2 } from "./contract/clientAndWallet";


(async () => {
  await getAllCompileCode();
})();
