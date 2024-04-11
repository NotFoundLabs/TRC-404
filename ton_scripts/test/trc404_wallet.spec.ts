import { owned_nft_limit, freemint_max_supply, freemint_price, getTrc404WalletAddressAndInit, CompiledCodeList, getTrc404NftItemAddressAndInit } from "../contract/compileContract";
import { getWalletContract, user1, user2 } from "../contract/clientAndWallet";
import { WalletContractV4 } from "@ton/ton";
import { OpenedContract, fromNano, toNano, Address } from "@ton/core";

import "@ton/test-utils";
import { Cell } from "@ton/core";

import { Trc404Master } from "./warpper/Trc404Master";
import { Trc404Wallet, checkTransferFtBranch1TX, checkTransferFtBranch2TX, checkTransferFtBranch3TX, checkTransferFtBranch4TX } from "./warpper/Trc404Wallet";
import { Trc404NftCollection } from "./warpper/Trc404NftCollection";
import { Trc404NftItem } from "./warpper/Trc404NftItem";
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
import { buildChangeOwnedNftLimitMsg } from "../message/nftCollectionMsg";


describe('Test Trc404 Wallet transferFT,include 4 branches ,and change owned_nft_limit', () => {
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


        let mintAmount = 2.5;  //mint 2.5 FT to user1 
        let mintAmount2 = 2;  //mint 2 FT to  user2
        let gasFee = 0.1 * mintAmount; //0.15 ton   gas_fee nees 0.15 ~  0.1 * owned_nft_limit/toNano("1") 

        user1 = await blockchain.treasury("user1");
        let { address, state_init } = await getTrc404WalletAddressAndInit(user1.address, Master.address, CompliedCodes.erc404_jetton_wallet_code,
            CompliedCodes.erc404_nft_item_code, Collection.address);
        User1_Wallet = blockchain.openContract(new Trc404Wallet(address, state_init));

        let userIdItemIndex = 1n;
        let msg = buildMintFtMsg(user1.address, mintAmount);
        await checkMintFt(mintAmount, gasFee, deployer, blockchain, Master, Collection,
            user1.address, userIdItemIndex, msg, true);

        user2 = await blockchain.treasury("user2");
        let { address: user2WalletAddress, state_init: user2WalletStateInit } = await getTrc404WalletAddressAndInit(user2.address, Master.address,
            CompliedCodes.erc404_jetton_wallet_code, CompliedCodes.erc404_nft_item_code, Collection.address);
        User2_Wallet = blockchain.openContract(new Trc404Wallet(user2WalletAddress, user2WalletStateInit));


        let userIdItemIndex2 = 3n;

        let msg2 = buildMintFtMsg(user2.address, mintAmount2);
        await checkMintFt(mintAmount2, gasFee, deployer, blockchain, Master, Collection,
            user2.address, userIdItemIndex2, msg2, true);

    });


    //**** Should be error cases  */
    it('should not transfer FT when sender is not owner', async () => {
        //user2 try to send transferFT msg to user1's trc404 wallet contractt
        let transferAmount = 1;
        let gasFee = 0.11; //0.15 ton  gas fee = 0.11 Ton  ~~ owned_nft_limit * 0.1
        let msg = buildTransferFtMsg(transferAmount, user2.address, user2.address);

        const transferFtResult = await User1_Wallet.send(user2.getSender(), { value: toNano(gasFee) }, msg);
        expect(transferFtResult.transactions).toHaveTransaction({
            from: user2.address,
            to: User1_Wallet.address,
            success: false,
        });

    })

    it('should not transfer FT when transfer amount is more than balance', async () => {
        //user1 try to transfer 101 Ft to user2 (currently, user1 only has 100 FT)
        let transferAmount = 3;
        let gasFee = 0.11; //0.15 ton  gas fee = 0.11 Ton  ~~ owned_nft_limit * 0.1
        let msg = buildTransferFtMsg(transferAmount, user2.address, user1.address);

        const transferFtResult = await User1_Wallet.send(user1.getSender(), { value: toNano(gasFee) }, msg);
        expect(transferFtResult.transactions).toHaveTransaction({
            from: user1.address,
            to: User1_Wallet.address,
            success: false,
        });

    })

    it('should not change_owned_nft_limit when sender is not owner', async () => {
        let gasFee = 0.01; //0.15 ton 
        let msg = buildChangeOwnedNftLimitMsg(3);
        const changeOwnedNftLimitResult = await User1_Wallet.send(user2.getSender(), { value: toNano(gasFee) }, msg);
        expect(changeOwnedNftLimitResult.transactions).toHaveTransaction({
            from: user2.address,
            to: User1_Wallet.address,
            success: false,
        });

    })


    //**** Should be correct cases  */
    it('Test TransferFt Branch 1,should user1 transfer 0.5 FT to user2,no burn NFT,no mint NFT ', async () => {
        //begin: A: 2.5 FT ,2 NFT ;B: 2 FT ,2 NFT ;
        let transferAmount = 0.5;
        let gasFee = 0.1; //0.15 ton  gas fee = 0.11 Ton  ~~ owned_nft_limit * 0.1
        let msg = buildTransferFtMsg(transferAmount, user2.address, user1.address);

        const transferFtResult = await User1_Wallet.send(user1.getSender(), { value: toNano(gasFee) }, msg);
        expect(transferFtResult.transactions).toHaveTransaction({
            from: user1.address,
            to: User1_Wallet.address,
            success: true,
        });
        //check Branch 1 tx
        checkTransferFtBranch1TX(transferFtResult, User1_Wallet.address, User2_Wallet.address);
        printTransactionFees(transferFtResult.transactions);
        //check A and B ‘s balance  and owned_nft_number
        //should be: A: 2 FT ,2 NFT ,no burn NFT
        let user1_res = await User1_Wallet.getWalletData();
        expect(user1_res.jetton_balance).toEqual(toNano(2));
        expect(user1_res.owned_nft_number).toEqual(2n);

        //should be: B: 2.5 FT ,2 NFT ,no mint NFT
        let user2_res = await User2_Wallet.getWalletData();
        expect(user2_res.jetton_balance).toEqual(toNano(2.5));
        expect(user2_res.owned_nft_number).toEqual(2n);

        //next_item_index should be 5
    })

    it('Test TransferFt Branch 2,should user1 transfer 0.3 FT to user2,user1 burn 1 NFT,no mint NFT ', async () => {
        //begin: A: 2 FT ,2 NFT ;B: 2.5 FT ,2 NFT ;
        let transferAmount = 0.3; //0.3
        let gasFee = 0.17; //0.15 ton  gas fee = 0.12 Ton  ~~ owned_nft_limit * 0.1
        let msg = buildTransferFtMsg(transferAmount, user2.address, user1.address);

        const transferFtResult = await User1_Wallet.send(user1.getSender(), { value: toNano(gasFee) }, msg);
        expect(transferFtResult.transactions).toHaveTransaction({
            from: user1.address,
            to: User1_Wallet.address,
            success: true,
        });
        printTransactionFees(transferFtResult.transactions);
        //check Branch 2 tx
        //  let userid =1n;
        //  let item_index=1n;
        //  let userIdItemIndex = calculateUseridItemIndex(userid,item_index);    
        let userIdItemIndex = 1n;
        const nft_item1_adddress = await Collection.getGetNftAddressByIndex(userIdItemIndex) as Address;

        checkTransferFtBranch2TX(transferFtResult, User1_Wallet.address, User2_Wallet.address,
            Collection.address, nft_item1_adddress);

        //check A and B ‘s balance  and owned_nft_number
        //should be: A: 1.7 FT ,1 NFT ,user1 burn 1 NFT
        let user1_res = await User1_Wallet.getWalletData();
        expect(user1_res.jetton_balance).toEqual(toNano(1.7));
        expect(user1_res.owned_nft_number).toEqual(1n);

        //should be: B: 2.8 FT ,2 NFT ,no mint NFT
        let user2_res = await User2_Wallet.getWalletData();
        expect(user2_res.jetton_balance).toEqual(toNano(2.8));
        expect(user2_res.owned_nft_number).toEqual(2n);

    })

    it('Test TransferFt Branch 3,should user1 transfer 0.2 FT to user2,no burn NFT,user2 will  mint 1 NFT ', async () => {
        //begin: A: 1.7 FT ,1 NFT ;B: 2.8 FT ,2 NFT ;
        let transferAmount = 0.2;
        let gasFee = 0.17; //0.15 ton  gas fee = 0.13 Ton  ~~ owned_nft_limit * 0.1
        let msg = buildTransferFtMsg(transferAmount, user2.address, user1.address);

        const transferFtResult = await User1_Wallet.send(user1.getSender(), { value: toNano(gasFee) }, msg);
        expect(transferFtResult.transactions).toHaveTransaction({
            from: user1.address,
            to: User1_Wallet.address,
            success: true,
        });
        printTransactionFees(transferFtResult.transactions);

        let userIdItemIndex = 5n;
        const nft_item_adddress = await Collection.getGetNftAddressByIndex(userIdItemIndex) as Address;

        checkTransferFtBranch3TX(transferFtResult, User1_Wallet.address, User2_Wallet.address,
            Collection.address, nft_item_adddress);

        //check A and B ‘s balance  and owned_nft_number
        //should be: A: 1.5 FT ,1 NFT ,no burn NFT
        let user1_res = await User1_Wallet.getWalletData();
        expect(user1_res.jetton_balance).toEqual(toNano(1.5));
        expect(user1_res.owned_nft_number).toEqual(1n);

        //should be: B: 3 FT ,3 NFT ,user2 will mint 1 NFT
        let user2_res = await User2_Wallet.getWalletData();
        expect(user2_res.jetton_balance).toEqual(toNano(3));
        expect(user2_res.owned_nft_number).toEqual(3n);

    })

    it('Test TransferFt Branch 4,should user1 transfer 1 FT to user2,user1 will  burn  1 NFT,user2 will  mint 1 NFT ', async () => {
        //begin: A: 1.5 FT ,1 NFT ;B: 3 FT ,3 NFT ;
        let transferAmount = 1;
        let gasFee = 0.181; //0.19 ton  gas fee = 0.11 Ton  ~~ owned_nft_limit * 0.11 ; Notice: burn and mint 1 NFT ,needs at least 0.16 Ton
        let msg = buildTransferFtMsg(transferAmount, user2.address, user1.address);

        const transferFtResult = await User1_Wallet.send(user1.getSender(), { value: toNano(gasFee) }, msg);
        printTransactionFees(transferFtResult.transactions);
        expect(transferFtResult.transactions).toHaveTransaction({
            from: user1.address,
            to: User1_Wallet.address,
            success: true,
        });

        //check Branch 4 tx
        // let user1Id2ItemIndex = calculateUseridItemIndex(1n,2n);     
        let user1Id2ItemIndex = 2n;
        const nft_item2_adddress = await Collection.getGetNftAddressByIndex(user1Id2ItemIndex) as Address;

        // let user2Id4ItemIndex = calculateUseridItemIndex(2n,4n);       
        let user2Id4ItemIndex = 6n;
        const nft_item4_adddress = await Collection.getGetNftAddressByIndex(user2Id4ItemIndex) as Address;


        checkTransferFtBranch4TX(transferFtResult, User1_Wallet.address, User2_Wallet.address,
            Collection.address, nft_item2_adddress, nft_item4_adddress);

        //check A and B ‘s balance  and owned_nft_number
        //should be: A: 0.5 FT ,0 NFT ,user1 burn 1 NFT
        let user1_res = await User1_Wallet.getWalletData();
        expect(user1_res.jetton_balance).toEqual(toNano(0.5));
        expect(user1_res.owned_nft_number).toEqual(0n);

        //should be: B: 4 FT ,4 NFT ,user2 will mint 1 NFT
        let user2_res = await User2_Wallet.getWalletData();
        expect(user2_res.jetton_balance).toEqual(toNano(4));
        expect(user2_res.owned_nft_number).toEqual(4n);

    })

    it('Test multiple TransferFt ,should user3 transfer 5 FT to user4,user3 will  burn  5 NFT,user4 will  mint 5 NFT ', async () => {
        let mintAmount = 2000;  //mint 10 FT to user3
        let gasFee_mint = 0.1 * owned_nft_limit; //0.15 ton   gas_fee nees 0.15 ~  0.1 * owned_nft_limit/toNano("1") 

        let user3 = await blockchain.treasury("user3");
        let user4 = await blockchain.treasury("user4");
        let { address, state_init } = await getTrc404WalletAddressAndInit(user3.address, Master.address, CompliedCodes.erc404_jetton_wallet_code,
            CompliedCodes.erc404_nft_item_code, Collection.address);
        let User3_Wallet = blockchain.openContract(new Trc404Wallet(address, state_init));

        let { address: address2, state_init: state_init2 } = await getTrc404WalletAddressAndInit(user4.address, Master.address, CompliedCodes.erc404_jetton_wallet_code,
            CompliedCodes.erc404_nft_item_code, Collection.address);
        let User4_Wallet = blockchain.openContract(new Trc404Wallet(address2, state_init2));

        let userIdItemIndex = 10n; //causer already mint 6 NFT
        let msg_mint = buildMintFtMsg(user3.address, mintAmount);
        await checkMintFt(mintAmount, gasFee_mint, deployer, blockchain, Master, Collection,
            user3.address, userIdItemIndex, msg_mint, true);

        //begin: A: 10 FT ,5 NFT ;B: 0 FT ,0 NFT ;
        let transferAmount = 2000;
        let gasFee = 0.6; //0.6 ton  gas fee = 0.17 Ton  ~~ owned_nft_limit * 0.12 ; Notice: burn and mint 1 NFT ,needs at least 0.16 Ton
        let msg = buildTransferFtMsg(transferAmount, user4.address, user3.address);

        const transferFtResult = await User3_Wallet.send(user3.getSender(), { value: toNano(gasFee) }, msg);
        expect(transferFtResult.transactions).toHaveTransaction({
            from: user3.address,
            to: User3_Wallet.address,
            success: true,
        });
        printTransactionFees(transferFtResult.transactions);

        //check Branch 4 tx
        // let user1Id2ItemIndex = calculateUseridItemIndex(1n,2n);     
        let user1Id2ItemIndex = 7n;
        const nft_item2_adddress = await Collection.getGetNftAddressByIndex(user1Id2ItemIndex) as Address;

        // let user2Id4ItemIndex = calculateUseridItemIndex(2n,4n);       
        let user2Id4ItemIndex = 12n;
        const nft_item4_adddress = await Collection.getGetNftAddressByIndex(user2Id4ItemIndex) as Address;


        checkTransferFtBranch4TX(transferFtResult, User3_Wallet.address, User4_Wallet.address,
            Collection.address, nft_item2_adddress, nft_item4_adddress);

        //check A and B ‘s balance  and owned_nft_number
        //should be: A: 0 FT ,0 NFT ,user3 burn 5 NFT
        let user1_res = await User3_Wallet.getWalletData();
        expect(user1_res.jetton_balance).toEqual(toNano(0));
        expect(user1_res.owned_nft_number).toEqual(0n);

        //should be: B: 10 FT ,5 NFT ,user4 will mint 5 NFT
        let user2_res = await User4_Wallet.getWalletData();
        expect(user2_res.jetton_balance).toEqual(toNano(transferAmount));
        expect(user2_res.owned_nft_number).toEqual(5n);

    })

    it('should  change_owned_nft_limit when sender is  owner', async () => {
        let gasFee = 0.01; //0.15 ton 
        let msg = buildChangeOwnedNftLimitMsg(3);
        const changeOwnedNftLimitResult = await User1_Wallet.send(user1.getSender(), { value: toNano(gasFee) }, msg);
        expect(changeOwnedNftLimitResult.transactions).toHaveTransaction({
            from: user1.address,
            to: User1_Wallet.address,
            success: true,
        });
        //check  owned_nft_limit info
        let walletInfo = await User1_Wallet.getWalletData();
        expect(walletInfo.owned_nft_limit).toEqual(3n);
    })


})


describe('Test Trc404 Wallet transferFT,transfer 1 FT,transfer 2 FT,transfer 3 FT,transfer 4 FT,transfer 5 FT and more', () => {
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
    })

    it('Test TransferFt 1 FT,user1 will  burn  1 NFT,user2 will  mint 1 NFT ', async () => {
        let mintAmount =1;  
        let gasFee1 = 0.18; //0.15 ton   gas_fee nees 0.15 ~  0.1 * owned_nft_limit/toNano("1") 

        let user1 = await blockchain.treasury("user1");
        let user2 = await blockchain.treasury("user2");
        let {address,state_init} = await getTrc404WalletAddressAndInit(user1.address,Master.address,CompliedCodes.erc404_jetton_wallet_code,
                                                                        CompliedCodes.erc404_nft_item_code,  Collection.address);
        User1_Wallet = blockchain.openContract(new Trc404Wallet(address,state_init));
        let {address:user2WalletAddress,state_init:user2WalletStateInit} = await getTrc404WalletAddressAndInit(user2.address,Master.address,CompliedCodes.erc404_jetton_wallet_code,
            CompliedCodes.erc404_nft_item_code,  Collection.address);
         User2_Wallet = blockchain.openContract(new Trc404Wallet(user2WalletAddress,user2WalletStateInit));

        let userIdItemIndex =1n;
        let msg1 = buildMintFtMsg(user1.address,mintAmount) ;
        await checkMintFt(mintAmount,gasFee1,deployer,blockchain,Master,Collection,
                         user1.address,userIdItemIndex,msg1,true);


        let transferAmount =1;
        let gasFee = 0.181; //0.19 ton  gas fee = 0.11 Ton  ~~ owned_nft_limit * 0.11 ; Notice: burn and mint 1 NFT ,needs at least 0.16 Ton
        let msg = buildTransferFtMsg(transferAmount,user2.address,user1.address) ;

        const transferFtResult = await User1_Wallet.send(user1.getSender(), { value: toNano(gasFee) },msg);  
        printTransactionFees(transferFtResult.transactions);
        expect(transferFtResult.transactions).toHaveTransaction({
            from: user1.address,
            to: User1_Wallet.address,
            success: true,
        });

        //check Branch 4 tx
        // let user1Id2ItemIndex = calculateUseridItemIndex(1n,2n);     
        let user1Id2ItemIndex =1n;  
        const nft_item2_adddress = await Collection.getGetNftAddressByIndex(user1Id2ItemIndex) as Address;

        // let user2Id4ItemIndex = calculateUseridItemIndex(2n,4n);       
        let user2Id4ItemIndex =2n;  
        const nft_item4_adddress = await Collection.getGetNftAddressByIndex(user2Id4ItemIndex) as Address;


        checkTransferFtBranch4TX(transferFtResult,User1_Wallet.address,User2_Wallet.address,
                                    Collection.address,nft_item2_adddress,nft_item4_adddress);

        //check A and B ‘s balance  and owned_nft_number
        //should be: A: 0 FT ,0 NFT ,user1 burn 1 NFT
        let user1_res= await User1_Wallet.getWalletData();
        expect(user1_res.jetton_balance).toEqual(toNano(0));
        expect(user1_res.owned_nft_number).toEqual(0n);

        //should be: B: 1 FT ,1 NFT ,user2 will mint 1 NFT
        let user2_res= await User2_Wallet.getWalletData();
        expect(user2_res.jetton_balance).toEqual(toNano(1));
        expect(user2_res.owned_nft_number).toEqual(1n);

    })

    it('Test TransferFt 2 FT,user1 will  burn  2 NFT,user2 will  mint 2 NFT ', async () => {
        let mintAmount =2;  
        let gasFee1 =  0.15 * owned_nft_limit; //0.15 ton   gas_fee nees 0.15 ~  0.1 * owned_nft_limit/toNano("1") 

        let user1 = await blockchain.treasury("user11");
        let user2 = await blockchain.treasury("user22");
        let {address,state_init} = await getTrc404WalletAddressAndInit(user1.address,Master.address,CompliedCodes.erc404_jetton_wallet_code,
                                                                        CompliedCodes.erc404_nft_item_code,  Collection.address);
        User1_Wallet = blockchain.openContract(new Trc404Wallet(address,state_init));
        let {address:user2WalletAddress,state_init:user2WalletStateInit} = await getTrc404WalletAddressAndInit(user2.address,Master.address,CompliedCodes.erc404_jetton_wallet_code,
            CompliedCodes.erc404_nft_item_code,  Collection.address);
         User2_Wallet = blockchain.openContract(new Trc404Wallet(user2WalletAddress,user2WalletStateInit));

        let userIdItemIndex =3n;
        let msg1 = buildMintFtMsg(user1.address,mintAmount) ;
        await checkMintFt(mintAmount,gasFee1,deployer,blockchain,Master,Collection,
                         user1.address,userIdItemIndex,msg1,true);


        let transferAmount =2;
        let gasFee = 0.181 * transferAmount; //0.19 ton  gas fee = 0.11 Ton  ~~ owned_nft_limit * 0.11 ; Notice: burn and mint 1 NFT ,needs at least 0.16 Ton
        let msg = buildTransferFtMsg(transferAmount,user2.address,user1.address) ;

        const transferFtResult = await User1_Wallet.send(user1.getSender(), { value: toNano(gasFee) },msg);  
        printTransactionFees(transferFtResult.transactions);
        expect(transferFtResult.transactions).toHaveTransaction({
            from: user1.address,
            to: User1_Wallet.address,
            success: true,
        });

        //check Branch 4 tx 
        let user1Id2ItemIndex =3n;  
        const nft_item2_adddress = await Collection.getGetNftAddressByIndex(user1Id2ItemIndex) as Address;
  
        let user2Id4ItemIndex =5n;  
        const nft_item4_adddress = await Collection.getGetNftAddressByIndex(user2Id4ItemIndex) as Address;


        checkTransferFtBranch4TX(transferFtResult,User1_Wallet.address,User2_Wallet.address,
                                    Collection.address,nft_item2_adddress,nft_item4_adddress);

        //check A and B ‘s balance  and owned_nft_number
        //should be: A: 0 FT ,0 NFT ,user1 burn 1 NFT
        let user1_res= await User1_Wallet.getWalletData();
        expect(user1_res.jetton_balance).toEqual(toNano(0));
        expect(user1_res.owned_nft_number).toEqual(0n);

        //should be: B: 2 FT ,2 NFT ,user2 will mint 2 NFT
        let user2_res= await User2_Wallet.getWalletData();
        expect(user2_res.jetton_balance).toEqual(toNano(2));
        expect(user2_res.owned_nft_number).toEqual(2n);

    })

    it('Test TransferFt 3 FT,user1 will  burn  3 NFT,user2 will  mint 3 NFT ', async () => {
        //current item_index=7
        let mintAmount =3;  
        let gasFee1 =  0.15 * owned_nft_limit; //0.15 ton   gas_fee nees 0.15 ~  0.1 * owned_nft_limit/toNano("1") 

        let user1 = await blockchain.treasury("user111");
        let user2 = await blockchain.treasury("user222");
        let {address,state_init} = await getTrc404WalletAddressAndInit(user1.address,Master.address,CompliedCodes.erc404_jetton_wallet_code,
                                                                        CompliedCodes.erc404_nft_item_code,  Collection.address);
        User1_Wallet = blockchain.openContract(new Trc404Wallet(address,state_init));
        let {address:user2WalletAddress,state_init:user2WalletStateInit} = await getTrc404WalletAddressAndInit(user2.address,Master.address,CompliedCodes.erc404_jetton_wallet_code,
            CompliedCodes.erc404_nft_item_code,  Collection.address);
         User2_Wallet = blockchain.openContract(new Trc404Wallet(user2WalletAddress,user2WalletStateInit));

        let userIdItemIndex =7n;
        let msg1 = buildMintFtMsg(user1.address,mintAmount) ;
        await checkMintFt(mintAmount,gasFee1,deployer,blockchain,Master,Collection,
                         user1.address,userIdItemIndex,msg1,true);


        let transferAmount =3;
        let gasFee = 0.181 * transferAmount; //0.19 ton  gas fee = 0.11 Ton  ~~ owned_nft_limit * 0.11 ; Notice: burn and mint 1 NFT ,needs at least 0.16 Ton
        let msg = buildTransferFtMsg(transferAmount,user2.address,user1.address) ;

        const transferFtResult = await User1_Wallet.send(user1.getSender(), { value: toNano(gasFee) },msg);  
        printTransactionFees(transferFtResult.transactions);
        expect(transferFtResult.transactions).toHaveTransaction({
            from: user1.address,
            to: User1_Wallet.address,
            success: true,
        });

        //check Branch 4 tx 
        let user1Id2ItemIndex =7n;  
        const nft_item2_adddress = await Collection.getGetNftAddressByIndex(user1Id2ItemIndex) as Address;
  
        let user2Id4ItemIndex =10n;  
        const nft_item4_adddress = await Collection.getGetNftAddressByIndex(user2Id4ItemIndex) as Address;


        checkTransferFtBranch4TX(transferFtResult,User1_Wallet.address,User2_Wallet.address,
                                    Collection.address,nft_item2_adddress,nft_item4_adddress);

        //check A and B ‘s balance  and owned_nft_number
        //should be: A: 0 FT ,0 NFT ,user1 burn 1 NFT
        let user1_res= await User1_Wallet.getWalletData();
        expect(user1_res.jetton_balance).toEqual(toNano(0));
        expect(user1_res.owned_nft_number).toEqual(0n);

        //should be: B: 2 FT ,2 NFT ,user2 will mint 2 NFT
        let user2_res= await User2_Wallet.getWalletData();
        expect(user2_res.jetton_balance).toEqual(toNano(3));
        expect(user2_res.owned_nft_number).toEqual(3n);

    })

    it('Test TransferFt 4 FT,user1 will  burn  4 NFT,user2 will  mint 4 NFT ', async () => {
        //current item_index=13
        let mintAmount =4;  
        let gasFee1 =  0.15 * owned_nft_limit; //0.15 ton   gas_fee nees 0.15 ~  0.1 * owned_nft_limit/toNano("1") 

        let user1 = await blockchain.treasury("user1111");
        let user2 = await blockchain.treasury("user2222");
        let {address,state_init} = await getTrc404WalletAddressAndInit(user1.address,Master.address,CompliedCodes.erc404_jetton_wallet_code,
                                                                        CompliedCodes.erc404_nft_item_code,  Collection.address);
        User1_Wallet = blockchain.openContract(new Trc404Wallet(address,state_init));
        let {address:user2WalletAddress,state_init:user2WalletStateInit} = await getTrc404WalletAddressAndInit(user2.address,Master.address,CompliedCodes.erc404_jetton_wallet_code,
            CompliedCodes.erc404_nft_item_code,  Collection.address);
         User2_Wallet = blockchain.openContract(new Trc404Wallet(user2WalletAddress,user2WalletStateInit));

        let userIdItemIndex =13n;
        let msg1 = buildMintFtMsg(user1.address,mintAmount) ;
        await checkMintFt(mintAmount,gasFee1,deployer,blockchain,Master,Collection,
                         user1.address,userIdItemIndex,msg1,true);


        let transferAmount =4;
        let gasFee = 0.181 * transferAmount; //0.19 ton  gas fee = 0.11 Ton  ~~ owned_nft_limit * 0.11 ; Notice: burn and mint 1 NFT ,needs at least 0.16 Ton
        let msg = buildTransferFtMsg(transferAmount,user2.address,user1.address) ;

        const transferFtResult = await User1_Wallet.send(user1.getSender(), { value: toNano(gasFee) },msg);  
        printTransactionFees(transferFtResult.transactions);
        expect(transferFtResult.transactions).toHaveTransaction({
            from: user1.address,
            to: User1_Wallet.address,
            success: true,
        });

        //check Branch 4 tx 
        let user1Id2ItemIndex =13n;  
        const nft_item2_adddress = await Collection.getGetNftAddressByIndex(user1Id2ItemIndex) as Address;
  
        let user2Id4ItemIndex =17n;  
        const nft_item4_adddress = await Collection.getGetNftAddressByIndex(user2Id4ItemIndex) as Address;


        checkTransferFtBranch4TX(transferFtResult,User1_Wallet.address,User2_Wallet.address,
                                    Collection.address,nft_item2_adddress,nft_item4_adddress);

        //check A and B ‘s balance  and owned_nft_number
        //should be: A: 0 FT ,0 NFT ,user1 burn 1 NFT
        let user1_res= await User1_Wallet.getWalletData();
        expect(user1_res.jetton_balance).toEqual(toNano(0));
        expect(user1_res.owned_nft_number).toEqual(0n);

        //should be: B: 2 FT ,2 NFT ,user2 will mint 2 NFT
        let user2_res= await User2_Wallet.getWalletData();
        expect(user2_res.jetton_balance).toEqual(toNano(4));
        expect(user2_res.owned_nft_number).toEqual(4n);

    })

    it('Test TransferFt 5 FT,user1 will  burn  5 NFT,user2 will  mint 5 NFT ', async () => {
        //current item_index=21
        let mintAmount =5;  
        let gasFee1 =  0.15 * owned_nft_limit; //0.15 ton   gas_fee nees 0.15 ~  0.1 * owned_nft_limit/toNano("1") 

        let user1 = await blockchain.treasury("user11111");
        let user2 = await blockchain.treasury("user22222");
        let {address,state_init} = await getTrc404WalletAddressAndInit(user1.address,Master.address,CompliedCodes.erc404_jetton_wallet_code,
                                                                        CompliedCodes.erc404_nft_item_code,  Collection.address);
        User1_Wallet = blockchain.openContract(new Trc404Wallet(address,state_init));
        let {address:user2WalletAddress,state_init:user2WalletStateInit} = await getTrc404WalletAddressAndInit(user2.address,Master.address,CompliedCodes.erc404_jetton_wallet_code,
            CompliedCodes.erc404_nft_item_code,  Collection.address);
         User2_Wallet = blockchain.openContract(new Trc404Wallet(user2WalletAddress,user2WalletStateInit));

        let userIdItemIndex =21n;
        let msg1 = buildMintFtMsg(user1.address,mintAmount) ;
        await checkMintFt(mintAmount,gasFee1,deployer,blockchain,Master,Collection,
                         user1.address,userIdItemIndex,msg1,true);


        let transferAmount =5;
        let gasFee = 0.181 * transferAmount; //0.19 ton  gas fee = 0.11 Ton  ~~ owned_nft_limit * 0.11 ; Notice: burn and mint 1 NFT ,needs at least 0.16 Ton
        let msg = buildTransferFtMsg(transferAmount,user2.address,user1.address) ;

        const transferFtResult = await User1_Wallet.send(user1.getSender(), { value: toNano(gasFee) },msg);  
        printTransactionFees(transferFtResult.transactions);
        expect(transferFtResult.transactions).toHaveTransaction({
            from: user1.address,
            to: User1_Wallet.address,
            success: true,
        });

        //check Branch 4 tx 
        let user1Id2ItemIndex =21n;  
        const nft_item2_adddress = await Collection.getGetNftAddressByIndex(user1Id2ItemIndex) as Address;
  
        let user2Id4ItemIndex =26n;  
        const nft_item4_adddress = await Collection.getGetNftAddressByIndex(user2Id4ItemIndex) as Address;


        checkTransferFtBranch4TX(transferFtResult,User1_Wallet.address,User2_Wallet.address,
                                    Collection.address,nft_item2_adddress,nft_item4_adddress);

        //check A and B ‘s balance  and owned_nft_number
        //should be: A: 0 FT ,0 NFT ,user1 burn 1 NFT
        let user1_res= await User1_Wallet.getWalletData();
        expect(user1_res.jetton_balance).toEqual(toNano(0));
        expect(user1_res.owned_nft_number).toEqual(0n);

        //should be: B: 2 FT ,2 NFT ,user2 will mint 2 NFT
        let user2_res= await User2_Wallet.getWalletData();
        expect(user2_res.jetton_balance).toEqual(toNano(5));
        expect(user2_res.owned_nft_number).toEqual(5n);

    })

})



