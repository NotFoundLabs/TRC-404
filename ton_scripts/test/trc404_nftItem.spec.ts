import {owned_nft_limit,getTrc404WalletAddressAndInit, CompiledCodeList, getTrc404NftItemAddressAndInit } from "../contract/compileContract";
import "@ton/test-utils";
import { toNano } from "@ton/core";
import { Trc404Master } from "./warpper/Trc404Master";
import { Trc404Wallet} from "./warpper/Trc404Wallet";
import { Trc404NftCollection } from "./warpper/Trc404NftCollection";
import { Trc404NftItem, checkTransferNftTX } from "./warpper/Trc404NftItem";
import { deployAndCheckCollectionAndMasterContract,checkMintFt } from "../utils/check";

import {
    Blockchain,
    SandboxContract,
    TreasuryContract,
} from "@ton/sandbox";
import {buildMintFtMsg} from "../message/masterMsg";
import {buildTransferNftMsg} from "../message/nftItemMsg";

describe('Test Trc404 NftItme transferNFT ', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let Collection: SandboxContract<Trc404NftCollection>;
    let Master: SandboxContract<Trc404Master>;
    let CompliedCodes:CompiledCodeList;

    let user1:SandboxContract<TreasuryContract>;
    let user2:SandboxContract<TreasuryContract>;
    let User1_Wallet:SandboxContract<Trc404Wallet>;
    let User2_Wallet:SandboxContract<Trc404Wallet>;

 
    beforeAll(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury("deployer");
        let res=await deployAndCheckCollectionAndMasterContract(blockchain,deployer);
        Master=res.Master;
        Collection=res.Collection;
        CompliedCodes=res.compliedCodes;

        let mintAmount =2;  //mint 2 FT to user1  (item1,item2)
        let mintAmount2 =2;  //mint 2 FT to  user2 (item3,item4)
        let gasFee = 0.1 * owned_nft_limit; //0.15 ton   gas_fee nees 0.15 ~  0.1 * owned_nft_limit/toNano("1") 
        
        user1 = await blockchain.treasury("user1");
        let {address,state_init} = await getTrc404WalletAddressAndInit(user1.address,Master.address,CompliedCodes.erc404_jetton_wallet_code,Collection.address);
        User1_Wallet = blockchain.openContract(new Trc404Wallet(address,state_init));

        let nft_item_index =1n;
        let msg = buildMintFtMsg(user1.address,mintAmount) ;
        await checkMintFt(mintAmount,gasFee,deployer,blockchain,Master,Collection,
                         user1.address,nft_item_index,msg);

        user2 = await blockchain.treasury("user2");
        let {address:user2WalletAddress,state_init:user2WalletStateInit} = await getTrc404WalletAddressAndInit(user2.address,Master.address,CompliedCodes.erc404_jetton_wallet_code,Collection.address);
        User2_Wallet = blockchain.openContract(new Trc404Wallet(user2WalletAddress,user2WalletStateInit));
        let nft_item_index2 =BigInt(3);  //because the owned_nft_limit,need to pay caution this param for the next_item_index
        let msg2 = buildMintFtMsg(user2.address,mintAmount2) ;
        await checkMintFt(mintAmount2,gasFee,deployer,blockchain,Master,Collection,
                         user2.address,nft_item_index2,msg2);

    });
    
     //**** Should be error cases  */
    it('should not transfer NFT when sender is not owner', async () => {
       //user2 try to send transferNFT msg to nftItem1(owned by user1) contract to transfer ownership to user3
        let gasFee = 0.11; //0.15 ton  gas fee = 0.11 Ton  ~~ owned_nft_limit * 0.1
        let user3 = await blockchain.treasury("user3");
       
        let nft_item_index =1;
        let {address,state_init}=await getTrc404NftItemAddressAndInit(nft_item_index,CompliedCodes.erc404_nft_item_code,Collection.address)
        let NftItem1 = blockchain.openContract(new Trc404NftItem(address,state_init));

        let msg = buildTransferNftMsg(user3.address,user2.address) ;
        const transferNftResult = await NftItem1.send(user2.getSender(), { value: toNano(gasFee) },msg);  
        expect(transferNftResult.transactions).toHaveTransaction({
            from: user2.address,
            to: NftItem1.address,
            success: false,
        });
       
    })


    //  //**** Should be correct cases  */
    it('should transfer NFT when sender is  owner', async () => {
        //user1 try to send transferNFT msg to nftItem1(owned by user1) contract to transfer ownership to user2
        //begin:User1: 2 FT ,2 NFT ;User2: 2 FT ,2 NFT ;
         let gasFee = 0.13; //0.13 ton  gas fee = 0.13 ton
        
         let nft_item_index =1;
         let {address,state_init}=await getTrc404NftItemAddressAndInit(nft_item_index,CompliedCodes.erc404_nft_item_code,Collection.address)
         let NftItem1 = blockchain.openContract(new Trc404NftItem(address,state_init));
         //check nftItem owner,should be user1
         let NftItemInfoBefore = await NftItem1.getGetNftData();
         expect(NftItemInfoBefore.owner_address).toEqualAddress(user1.address);
 
         let msg = buildTransferNftMsg(user2.address,user1.address) ;
         const transferNftResult = await NftItem1.send(user1.getSender(), { value: toNano(gasFee) },msg);  
         expect(transferNftResult.transactions).toHaveTransaction({
             from: user1.address,
             to: NftItem1.address,
             success: true,
         });
        //check transferNFT tx
        checkTransferNftTX(transferNftResult, NftItem1.address,User1_Wallet.address,User2_Wallet.address,Collection.address);
        
        //check nftItem owner,should be user2 
       let  NftItemInfoAfter= await NftItem1.getGetNftData();
       expect(NftItemInfoAfter.owner_address).toEqualAddress(user2.address);

        //check A and B ‘s balance  and owned_nft_number
        //should be: A: 1 FT ,1 NFT 
        let user1_res= await User1_Wallet.getWalletData();
        expect(user1_res.jetton_balance).toEqual(toNano(1));
        expect(user1_res.owned_nft_number).toEqual(1n);
        
        //should be: B: 3 FT ,3 NFT ,no mint NFT
        let user2_res= await User2_Wallet.getWalletData();
        expect(user2_res.jetton_balance).toEqual(toNano(3));
        expect(user2_res.owned_nft_number).toEqual(3n);
     
    } ) 
})

