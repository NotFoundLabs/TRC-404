import { getWalletContract, user1, user2 } from "./contract/clientAndWallet";
import { getTrc404CollectionAndMasterAddress, getAllCompileCode } from "./contract/compileContract";
import { initDeployTrc404Collection, initDeployTrc404Master } from "./contract/initDeployContract";

import {
  invokeMintFromTrc404Master, invokeTransferFTFromTrc404Wallet, invokeTransferNFTFromTrc404NftItem,
  invokeChangeRoyaltyParamsFromTrc404Collection
} from "./contract/invokeContract";
import { waitNextSeqo } from "./utils/helpers";
import * as dotenv from "dotenv";
dotenv.config();

// ================================================================= //
(async () => {
  //get client wallet Contract
  let { wallet_contract: user1_wallet, secretKey: user1_secretKey } = await getWalletContract(user1);
  let { wallet_contract: user2_wallet, secretKey: user2_secretKey } = await getWalletContract(user2);
  // console.log(user2_wallet.address);

  // let user1 ="0QAxELnSBTtQqBeKaD6NZ9tLc4D15K_uuQXZ8ZSUIPrQ9a6i";
  // let user2 ="0QCfaqhw-vF2NQr_V1SY-vxMRdnZfle0bnRf1qbYA5MCvreF";
  // let user1 ="0QAkio1cn3uJXtN65GGL4AG4-RRxHmdOJFacMDzUn5mrv7uh";
  // let user2 ="0QBZ1yMP9AczSHhA2Ov7MRYg3nOwDVFCP5yz5ow6O7j-gvhc";

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


  // //**********3.invoke contract (test mint FT and transfer FT)*******************/
  //3.1 user1(admin) invoke batch_mint of Trc404-master  mint FT to user2 

  let batch_mint_FT_TxSeqo = await invokeMintFromTrc404Master(user1_wallet, user1_secretKey,
    deployMasterContractAddress,
    user1_wallet.address, 1, 0.15); //the max gas fee = 0.13 Ton ~~ (0.1 Ton * owned_nft_limit )for mint Tx (the max gas fee situation: need to mint one NFT),limit 
  console.log("userAddress:", user1_wallet.address.toString(), ",userTxSeqo:", batch_mint_FT_TxSeqo);
  await waitNextSeqo(user1_wallet, batch_mint_FT_TxSeqo);

  //  //3.2 invoke transfer FT function  of Trc404-wallet  ,user 2 transfer ft to user1
  // //at least needs  0.2 ton for transfer one FT tx for max gas fee situation
  // //the max gas fee situation:need to burn and mint one NFT,the min gas fee situation: just transfer one FT,doesn't need to burn or mint NFT
   let gas_fee = "0.16";  //max gas fee = 0.16 Ton  ~~ owned_nft_limit * 0.1 ,Notice: burn and mint 1 NFT ,needs at least 0.16 Ton
   let trasfer_ft_TxSeqo=await invokeTransferFTFromTrc404Wallet(user1_wallet,user1_secretKey,compliedCodes,
                            deployMasterContractAddress, user2_wallet.address,
                            1,deployTrc404CollectionContract,gas_fee); 
   console.log("userAddress:",user1_wallet.address.toString(),",userTxSeqo:",trasfer_ft_TxSeqo);
   await waitNextSeqo(user1_wallet,trasfer_ft_TxSeqo);


  // //**********4.invoke contract (test mint FT and transfer NFT)*******************/
  // //mint  FT/NFT to user1
   let batch_mint_FT_TxSeqo2=await invokeMintFromTrc404Master(user1_wallet,user1_secretKey,
    deployMasterContractAddress,
    user1_wallet.address,5,0.5); //gas_fee nees 0.16 ~  0.1 * owned_nft_limit
    console.log("userAddress:",user1_wallet.address.toString(),",userTxSeqo:",batch_mint_FT_TxSeqo2);  
    await waitNextSeqo(user1_wallet,batch_mint_FT_TxSeqo2);

   //  invoke transfer NFT function  of Trc404-userNft contract , transfer NFT from user1 --> user1
   let nft_item_index = 2 ; 
   let gas_fee2 = "0.16"; 
   let trasfer_nft_TxSeqo=await invokeTransferNFTFromTrc404NftItem(user2_wallet,user2_secretKey,compliedCodes,
                                deployTrc404CollectionContract,
                                user1_wallet.address, nft_item_index, gas_fee2); 
   console.log("userAddress:",user2_wallet.address.toString(),",userTxSeqo:",trasfer_nft_TxSeqo);
   await waitNextSeqo(user2_wallet,trasfer_nft_TxSeqo);

  // //**********5.invoke contract (test  ChangeRoyaltyParams )*******************/
  // *****ChangeRoyaltyParams
  let  numerator = 10;  //
  let  denominator = 100;  //
  let owner_address =user1_wallet.address;
  let changeRoyaltyParams_TxSeqo = await invokeChangeRoyaltyParamsFromTrc404Collection(user1_wallet, user1_secretKey,
    deployTrc404CollectionContract, numerator, denominator, owner_address, "0.01"); 
   console.log("userAddress:", user1_wallet.address.toString(), ",userTxSeqo:", changeRoyaltyParams_TxSeqo);
  await waitNextSeqo(user1_wallet, changeRoyaltyParams_TxSeqo);


})();
