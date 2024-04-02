import { getAllCompileCode, getFixPriceSaleContractInit } from "./contract/compileContract";
import * as dotenv from "dotenv";
dotenv.config();
import { getWalletContract, user1, user2 } from "./contract/clientAndWallet";


(async () => {
  let { wallet_contract: user1_wallet, secretKey: user1_secretKey } = await getWalletContract(user1);
  await getAllCompileCode();
})();
