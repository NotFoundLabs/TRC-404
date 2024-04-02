import { owned_nft_limit, freemint_max_supply, freemint_price, getTrc404WalletAddressAndInit, CompiledCodeList, getTrc404NftItemAddressAndInit } from "../contract/compileContract";
import { getWalletContract, user1, user2 } from "../contract/clientAndWallet";
import { WalletContractV4 } from "@ton/ton";
import { OpenedContract, fromNano, toNano, Address } from "@ton/core";

import "@ton/test-utils";
import { Cell } from "@ton/core";

import { Trc404Master, checkMintFtTX } from "./warpper/Trc404Master";
import { Trc404Wallet, checkTransferFtBranch1TX, checkTransferFtBranch2TX, checkTransferFtBranch3TX, checkTransferFtBranch4TX } from "./warpper/Trc404Wallet";
import { Trc404NftCollection } from "./warpper/Trc404NftCollection";
import { Trc404NftItem, checkTransferNftTX } from "./warpper/Trc404NftItem";
import { deployAndCheckCollectionAndMasterContract, checkMintFt } from "../utils/check";

import {
    Blockchain,
    SandboxContract,
    TreasuryContract,
    printTransactionFees,
    prettyLogTransactions,
    RemoteBlockchainStorage,
    wrapTonClient4ForRemote,
} from "@ton/sandbox";
import { getInitDeployMasterMsg } from "../contract/initDeployContract";
import { buildMintFtMsg, buildWithdrawMsg, buildChangeFreemintConfigMsg, buildChangeMasterAdminMsg } from "../message/masterMsg";
import { buildTransferFtMsg } from "../message/walletMsg";
import { buildTransferNftMsg } from "../message/nftItemMsg";
import { calculateUseridItemIndex } from "../utils/helpers";

let compliedCodes: {
    erc404_collection_code: Cell, erc404_nft_item_code: Cell,
    erc404_jetton_wallet_code: Cell, erc404_master_code: Cell
};

let max_supply = 100000;


describe('Test Trc404 NftItme transferNFT ', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let Collection: SandboxContract<Trc404NftCollection>;
    let Master: SandboxContract<Trc404Master>;
    let CompliedCodes: CompiledCodeList;

    let user1: SandboxContract<TreasuryContract>;
    let user2: SandboxContract<TreasuryContract>;
    let User1_Wallet: SandboxContract<Trc404Wallet>;
    let User2_Wallet: SandboxContract<Trc404Wallet>;


    beforeAll(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury("deployer");
        let res = await deployAndCheckCollectionAndMasterContract(blockchain, deployer);
        Master = res.Master;
        Collection = res.Collection;
        CompliedCodes = res.compliedCodes;

        let mintAmount = 2;  //mint 2 FT to user1  (item1,item2)
        let mintAmount2 = 2;  //mint 2 FT to  user2 (item3,item4)
        let gasFee = 0.15 * owned_nft_limit; //0.15 ton   gas_fee nees 0.15 ~  0.1 * owned_nft_limit/toNano("1") 

        user1 = await blockchain.treasury("user1");
        let { address, state_init } = await getTrc404WalletAddressAndInit(user1.address, Master.address, CompliedCodes.erc404_jetton_wallet_code,
            CompliedCodes.erc404_nft_item_code, Collection.address);
        User1_Wallet = blockchain.openContract(new Trc404Wallet(address, state_init));

        // let userId_1_ItemIndex_1 = calculateUseridItemIndex(1n,1n);
        let userId_1_ItemIndex_1 = 1n;
        let msg = buildMintFtMsg(user1.address, mintAmount);
        await checkMintFt(mintAmount, gasFee, deployer, blockchain, Master, Collection,
            user1.address, userId_1_ItemIndex_1, msg, true);

        user2 = await blockchain.treasury("user2");
        let { address: user2WalletAddress, state_init: user2WalletStateInit } = await getTrc404WalletAddressAndInit(user2.address, Master.address,
            CompliedCodes.erc404_jetton_wallet_code, CompliedCodes.erc404_nft_item_code, Collection.address);
        User2_Wallet = blockchain.openContract(new Trc404Wallet(user2WalletAddress, user2WalletStateInit));

        // let userId_2_ItemIndex_2 = calculateUseridItemIndex(2n,2n);  //because the owned_nft_limit,need to pay caution this param for the next_item_index
        let userId_2_ItemIndex_2 = 4n;
        let msg2 = buildMintFtMsg(user2.address, mintAmount2);
        await checkMintFt(mintAmount2, gasFee, deployer, blockchain, Master, Collection,
            user2.address, userId_2_ItemIndex_2, msg2, true);

    });

    //**** Should be error cases  */
    it('should not transfer NFT when sender is not owner', async () => {
        //user2 try to send transferNFT msg to nftItem1(owned by user1) contract to transfer ownership to user3
        let gasFee = 0.13; //0.15 ton  gas fee = 0.11 Ton  ~~ owned_nft_limit * 0.1
        let user3 = await blockchain.treasury("user3");

        // let userId_3_ItemIndex_1 = calculateUseridItemIndex(3n,1n);
        let userId_3_ItemIndex_1 = 3n; //this nft belong user2 ,not user1
        let { address, state_init } = await getTrc404NftItemAddressAndInit(userId_3_ItemIndex_1, CompliedCodes.erc404_nft_item_code, Collection.address)
        let NftItem1 = blockchain.openContract(new Trc404NftItem(address, state_init));

        let msg = await buildTransferNftMsg(user3.address, user2.address);
        const transferNftResult = await NftItem1.send(user1.getSender(), { value: toNano(gasFee) }, msg);
        expect(transferNftResult.transactions).toHaveTransaction({
            from: user1.address,
            to: NftItem1.address,
            success: false,
        });

    })


    //  //**** Should be correct cases  */
    it('should transfer NFT when sender is  owner', async () => {
        //user1 try to send transferNFT msg to nftItem1(owned by user1) contract to transfer ownership to user2
        //begin:User1: 2 FT ,2 NFT ;User2: 2 FT ,2 NFT ;
        //Notice: we can not use this gas fee the final gas fee,cause in real network,all tx from walletV4 contract,not directly from NftItem contract
        //let gasFee = 1.15; //0.13 ton  gas fee = 0.13 ton.  //test getgems.io put on sale 
        let gasFee = 0.17; //0.17 ton  gas fee = 0.11 ton.   //common transfer

        //  let userId_1_ItemIndex_1 = calculateUseridItemIndex(1n,1n);
        let userId_1_ItemIndex_1 = 1n;

        let { address, state_init } = await getTrc404NftItemAddressAndInit(userId_1_ItemIndex_1, CompliedCodes.erc404_nft_item_code, Collection.address);
        let NftItem1 = blockchain.openContract(new Trc404NftItem(address, state_init));
        //check nftItem owner,should be user1
        let NftItemInfoBefore = await NftItem1.getGetNftData();
        expect(NftItemInfoBefore.owner_address).toEqualAddress(user1.address);

        //  let user3 = await blockchain.treasury("user3");
        //  let {address:user3WalletAddress,state_init:user3WalletStateInit} = await getTrc404WalletAddressAndInit(user3.address,Master.address,
        //                                                      CompliedCodes.erc404_jetton_wallet_code,CompliedCodes.erc404_nft_item_code,Collection.address);
        //  let User3_Wallet = blockchain.openContract(new Trc404Wallet(user3WalletAddress,user3WalletStateInit));


        //send 1 NFT to others
        let msg = await buildTransferNftMsg(user2.address, user1.address);
        const transferNftResult = await NftItem1.send(user1.getSender(), { value: toNano(gasFee) }, msg);
        expect(transferNftResult.transactions).toHaveTransaction({
            from: user1.address,
            to: NftItem1.address,
            success: true,
        });
        printTransactionFees(transferNftResult.transactions);
        console.log("User1_Wallet.address:", User1_Wallet.address);
        console.log("User2_Wallet.address:", User2_Wallet.address);
        //check transferNFT tx
        checkTransferNftTX(transferNftResult, NftItem1.address, User1_Wallet.address, User2_Wallet.address, user2.address, Collection.address);

        //check nftItem owner,should be user2 
        let NftItemInfoAfter = await NftItem1.getGetNftData();
        expect(NftItemInfoAfter.owner_address).toEqualAddress(user2.address);

        //check A and B ‘s balance  and owned_nft_number
        //should be: A: 1 FT ,1 NFT 
        let user1_res = await User1_Wallet.getWalletData();
        expect(user1_res.jetton_balance).toEqual(toNano(1));
        expect(user1_res.owned_nft_number).toEqual(1n);

        //should be: B: 3 FT ,3 NFT ,no mint NFT
        let user2_res = await User2_Wallet.getWalletData();
        expect(user2_res.jetton_balance).toEqual(toNano(3));
        expect(user2_res.owned_nft_number).toEqual(3n);
    })



    it('should only transfer 1 FT when sender is owner and owned_nft_number >=5', async () => {

        // mint 5 NFT for user2
        let mintAmount = 5;  //mint 2 FT to  user2 (item3,item4)
        let gasFee = 0.15 * owned_nft_limit;
        let userId_2_ItemIndex_5 = 5n;
        let msg = buildMintFtMsg(user2.address, mintAmount);
        await checkMintFt(mintAmount, gasFee, deployer, blockchain, Master, Collection,
            user2.address, userId_2_ItemIndex_5, msg, false);
        let user2_res_before = await User2_Wallet.getWalletData();
        expect(user2_res_before.jetton_balance).toEqual(toNano(8));
        expect(user2_res_before.owned_nft_number).toEqual(5n);


        //now :A: 1 FT ,1 NFT  ,B: 8 FT, 5 NFT
        //user1 transfer 1 NFT to user2,because user2 alread owned 5 NFT,user2 will only get 1 FT, and burn this NFT transfered by user1

        //user1 send 1 NFT to user2
        let userId_1_ItemIndex_2 = 2n;

        let { address, state_init } = await getTrc404NftItemAddressAndInit(userId_1_ItemIndex_2, CompliedCodes.erc404_nft_item_code, Collection.address);
        let NftItem2 = blockchain.openContract(new Trc404NftItem(address, state_init));
        //check nftItem owner,should be user1
        let NftItemInfoBefore = await NftItem2.getGetNftData();
        expect(NftItemInfoBefore.owner_address).toEqualAddress(user1.address);

        let gas2 = 0.18;
        let msg2 = await buildTransferNftMsg(user2.address, user1.address);
        const transferNftResult = await NftItem2.send(user1.getSender(), { value: toNano(gas2) }, msg2);
        expect(transferNftResult.transactions).toHaveTransaction({
            from: user1.address,
            to: NftItem2.address,
            success: true,
        });
        printTransactionFees(transferNftResult.transactions);
        console.log("User1_Wallet.address:", User1_Wallet.address);
        console.log("User2_Wallet.address:", User2_Wallet.address);
        //check transferNFT tx
        checkTransferNftTX(transferNftResult, NftItem2.address, User1_Wallet.address, User2_Wallet.address, user2.address, Collection.address);

        //check nftItem2 owner,should be burned 
        //    let  NftItemInfoAfter= await NftItem2.getGetNftData();
        //    expect(NftItemInfoAfter.owner_address).toEqualAddress(user2.address);

        //check A and B ‘s balance  and owned_nft_number
        //should be: A: 0 FT ,0 NFT 
        let user1_res = await User1_Wallet.getWalletData();
        expect(user1_res.jetton_balance).toEqual(toNano(0));
        expect(user1_res.owned_nft_number).toEqual(0n);

        //should be: B: 9 FT ,5 NFT , and burn 1 NFT just received
        let user2_res = await User2_Wallet.getWalletData();
        expect(user2_res.jetton_balance).toEqual(toNano(9));
        expect(user2_res.owned_nft_number).toEqual(5n);



    })
})

