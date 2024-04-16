import { getWalletContract, user1, user2 } from "./contract/clientAndWallet";
import { getTrc404CollectionAndMasterAddress, getAllCompileCode } from "./contract/compileContract";
import { initDeployTrc404Collection, initDeployTrc404Master } from "./contract/initDeployContract";

import { invokeMintFromTrc404Master, invokeTransferFTFromTrc404Wallet, invokeTransferNFTFromTrc404NftItem } from "./contract/invokeContract";
import { waitNextSeqo } from "./utils/helpers";
import * as dotenv from "dotenv";
import { sleep } from "./utils/helpers";
dotenv.config();

// ================================================================= //
(async () => {
  //get client wallet Contract
  let { wallet_contract: user1_wallet, secretKey: user1_secretKey } = await getWalletContract(user1);
  let { wallet_contract: user2_wallet, secretKey: user2_secretKey } = await getWalletContract(user2);

  //****************1. compile and get contract address
  let compliedCodes = await getAllCompileCode();
  let { deployTrc404CollectionContract, collection_init, deployMasterContractAddress, master_init } =
    await getTrc404CollectionAndMasterAddress(compliedCodes, user1_wallet.address);

  //****************2.deploy contract
  //2.1 deploy Trc404collection contract
  let collection_seqno = await initDeployTrc404Collection(user1, deployTrc404CollectionContract, collection_init, "0.01");
  await waitNextSeqo(user1_wallet, collection_seqno);

  // //2.2 deploy Trc404 Master contract
  let master_seqno = await initDeployTrc404Master(user1, deployMasterContractAddress, master_init, "0.02");
  await waitNextSeqo(user1_wallet, master_seqno);

  //**********3.invoke contract (test mint FT and transfer FT)*******************/
  //3.1 user1(admin) invoke batch_mint of Trc404-master  mint FT to user1
  let batch_mint_FT_TxSeqo = await invokeMintFromTrc404Master(user1_wallet, user1_secretKey,deployMasterContractAddress,user1_wallet.address, 6, 0.5);
  console.log("userAddress:", user1_wallet.address.toString(), ",userTxSeqo:", batch_mint_FT_TxSeqo);
  await waitNextSeqo(user1_wallet, batch_mint_FT_TxSeqo);
  await sleep(35000);

  //3.2 invoke transfer FT function  ,user1 transfer ft to user2
  let gas_fee = 0.18;
  let trasfer_ft_TxSeqo = await invokeTransferFTFromTrc404Wallet(0, user1_wallet, user1_secretKey, compliedCodes,deployMasterContractAddress, user2_wallet.address,1, deployTrc404CollectionContract, gas_fee);
  console.log("userAddress:", user1_wallet.address.toString(), ",userTxSeqo:", trasfer_ft_TxSeqo);
  await waitNextSeqo(user1_wallet, trasfer_ft_TxSeqo);
  await sleep(25000);


  // //**********4.invoke contract (test transfer NFT)*******************/
  //  invoke transfer NFT function , user1 transfer NFT to user2
  let userId_2_ItemIndex_1 = 2n;
  let gas_fee3 = 0.18;
  let trasfer_nft_TxSeqo = await invokeTransferNFTFromTrc404NftItem(0, user1_wallet, user1_secretKey, compliedCodes,
    deployTrc404CollectionContract,
    user2_wallet.address, userId_2_ItemIndex_1, gas_fee3);
  console.log("userAddress:", user1_wallet.address.toString(), ",userTxSeqo:", trasfer_nft_TxSeqo);
  await waitNextSeqo(user1_wallet, trasfer_nft_TxSeqo);

})();


