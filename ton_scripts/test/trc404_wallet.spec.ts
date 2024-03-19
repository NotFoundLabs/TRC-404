import { owned_nft_limit, getTrc404WalletAddressAndInit, CompiledCodeList } from "../contract/compileContract";
import { Cell,toNano,Address } from "@ton/core";
import "@ton/test-utils";
import { Trc404Master } from "./warpper/Trc404Master";
import { Trc404Wallet,checkTransferFtBranch1TX,checkTransferFtBranch2TX,checkTransferFtBranch3TX,checkTransferFtBranch4TX } from "./warpper/Trc404Wallet";
import { Trc404NftCollection } from "./warpper/Trc404NftCollection";
import { deployAndCheckCollectionAndMasterContract,checkMintFt } from "../utils/check";

import {
    Blockchain,
    SandboxContract,
    TreasuryContract,
} from "@ton/sandbox";
import {buildMintFtMsg} from "../message/masterMsg";
import { buildTransferFtMsg } from "../message/walletMsg";


describe('Test Trc404 Wallet transferFT,include 4 branches ', () => {
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

        let mintAmount =2.5;  //mint 2.5 FT to user1 
        let mintAmount2 =2;  //mint 2 FT to  user2
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
    it('should not transfer FT when sender is not owner', async () => {
       //user2 try to send transferFT msg to user1's trc404 wallet contractt
        let transferAmount =1;
        let gasFee = 0.11; //0.15 ton  gas fee = 0.11 Ton  ~~ owned_nft_limit * 0.1
        let msg = buildTransferFtMsg(transferAmount,user2.address,user2.address) ;

        const transferFtResult = await User1_Wallet.send(user2.getSender(), { value: toNano(gasFee) },msg);  
        expect(transferFtResult.transactions).toHaveTransaction({
            from: user2.address,
            to: User1_Wallet.address,
            success: false,
        });
       
    })

    it('should not transfer FT when transfer amount is more than balance', async () => {
         //user1 try to transfer 101 Ft to user2 (currently, user1 only has 100 FT)
        let transferAmount =3;
        let gasFee = 0.11; //0.15 ton  gas fee = 0.11 Ton  ~~ owned_nft_limit * 0.1
        let msg = buildTransferFtMsg(transferAmount,user2.address,user1.address) ;

        const transferFtResult = await User1_Wallet.send(user1.getSender(), { value: toNano(gasFee) },msg);  
        expect(transferFtResult.transactions).toHaveTransaction({
            from: user1.address,
            to: User1_Wallet.address,
            success: false,
        });
    
    })


     //**** Should be correct cases  */
    it('Test TransferFt Branch 1,should user1 transfer 0.5 FT to user2,no burn NFT,no mint NFT ', async () => {
        //begin: A: 2.5 FT ,2 NFT ;B: 2 FT ,2 NFT ;
        let transferAmount =0.5;
        let gasFee = 0.15; //0.15 ton  gas fee = 0.11 Ton  ~~ owned_nft_limit * 0.1
        let msg = buildTransferFtMsg(transferAmount,user2.address,user1.address) ;

        const transferFtResult = await User1_Wallet.send(user1.getSender(), { value: toNano(gasFee) },msg);  
        expect(transferFtResult.transactions).toHaveTransaction({
            from: user1.address,
            to: User1_Wallet.address,
            success: true,
        });
        //check Branch 1 tx
         checkTransferFtBranch1TX(transferFtResult,User1_Wallet.address,User2_Wallet.address);

        //check A and B ‘s balance  and owned_nft_number
        //should be: A: 2 FT ,2 NFT ,no burn NFT
        let user1_res= await User1_Wallet.getWalletData();
        expect(user1_res.jetton_balance).toEqual(toNano(2));
        expect(user1_res.owned_nft_number).toEqual(2n);
        
        //should be: B: 2.5 FT ,2 NFT ,no mint NFT
        let user2_res= await User2_Wallet.getWalletData();
        expect(user2_res.jetton_balance).toEqual(toNano(2.5));
        expect(user2_res.owned_nft_number).toEqual(2n);

        //next_item_index should be 5

    })

    it('Test TransferFt Branch 2,should user1 transfer 0.3 FT to user2,user1 burn 1 NFT,no mint NFT ', async () => {
        //begin: A: 2 FT ,2 NFT ;B: 2.5 FT ,2 NFT ;
        let transferAmount =0.3;
        let gasFee = 0.15; //0.15 ton  gas fee = 0.11 Ton  ~~ owned_nft_limit * 0.1
        let msg = buildTransferFtMsg(transferAmount,user2.address,user1.address) ;

        const transferFtResult = await User1_Wallet.send(user1.getSender(), { value: toNano(gasFee) },msg);  
        expect(transferFtResult.transactions).toHaveTransaction({
            from: user1.address,
            to: User1_Wallet.address,
            success: true,
        });
        //check Branch 2 tx
        const nft_item1_adddress = await Collection.getGetNftAddressByIndex(1n) as Address;
        checkTransferFtBranch2TX(transferFtResult,User1_Wallet.address,User2_Wallet.address,
                                    Collection.address,nft_item1_adddress);

        //check A and B ‘s balance  and owned_nft_number
        //should be: A: 1.7 FT ,1 NFT ,user1 burn 1 NFT
        let user1_res= await User1_Wallet.getWalletData();
        expect(user1_res.jetton_balance).toEqual(toNano(1.7));
        expect(user1_res.owned_nft_number).toEqual(1n);
        
        //should be: B: 2.8 FT ,2 NFT ,no mint NFT
        let user2_res= await User2_Wallet.getWalletData();
        expect(user2_res.jetton_balance).toEqual(toNano(2.8));
        expect(user2_res.owned_nft_number).toEqual(2n);

    })

    it('Test TransferFt Branch 3,should user1 transfer 0.2 FT to user2,no burn NFT,user2 will  mint 1 NFT ', async () => {
        //begin: A: 1.7 FT ,1 NFT ;B: 2.8 FT ,2 NFT ;
        let transferAmount =0.2;
        let gasFee = 0.15; //0.15 ton  gas fee = 0.11 Ton  ~~ owned_nft_limit * 0.1
        let msg = buildTransferFtMsg(transferAmount,user2.address,user1.address) ;

        const transferFtResult = await User1_Wallet.send(user1.getSender(), { value: toNano(gasFee) },msg);  
        expect(transferFtResult.transactions).toHaveTransaction({
            from: user1.address,
            to: User1_Wallet.address,
            success: true,
        });
        //check Branch 3 tx
        const nft_item5_adddress = await Collection.getGetNftAddressByIndex(5n) as Address;
        checkTransferFtBranch3TX(transferFtResult,User1_Wallet.address,User2_Wallet.address,
                                    Collection.address,nft_item5_adddress);

        //check A and B ‘s balance  and owned_nft_number
        //should be: A: 1.5 FT ,1 NFT ,no burn NFT
        let user1_res= await User1_Wallet.getWalletData();
        expect(user1_res.jetton_balance).toEqual(toNano(1.5));
        expect(user1_res.owned_nft_number).toEqual(1n);
        
        //should be: B: 3 FT ,3 NFT ,user2 will mint 1 NFT
        let user2_res= await User2_Wallet.getWalletData();
        expect(user2_res.jetton_balance).toEqual(toNano(3));
        expect(user2_res.owned_nft_number).toEqual(3n);

    })

    it('Test TransferFt Branch 4,should user1 transfer 1 FT to user2,user1 will  burn  NFT,user2 will  mint 1 NFT ', async () => {
        //begin: A: 1.5 FT ,1 NFT ;B: 3 FT ,3 NFT ;
        let transferAmount =1;
        let gasFee = 0.16; //0.16 ton  gas fee = 0.11 Ton  ~~ owned_nft_limit * 0.1 ; Notice: burn and mint 1 NFT ,needs at least 0.16 Ton
        let msg = buildTransferFtMsg(transferAmount,user2.address,user1.address) ;

        const transferFtResult = await User1_Wallet.send(user1.getSender(), { value: toNano(gasFee) },msg);  
        expect(transferFtResult.transactions).toHaveTransaction({
            from: user1.address,
            to: User1_Wallet.address,
            success: true,
        });
        //check Branch 4 tx
        const nft_item2_adddress = await Collection.getGetNftAddressByIndex(2n) as Address;
        const nft_item6_adddress = await Collection.getGetNftAddressByIndex(6n) as Address;
        checkTransferFtBranch4TX(transferFtResult,User1_Wallet.address,User2_Wallet.address,
                                    Collection.address,nft_item2_adddress,nft_item6_adddress);

        //check A and B ‘s balance  and owned_nft_number
        //should be: A: 0.5 FT ,0 NFT ,user1 burn 1 NFT
        let user1_res= await User1_Wallet.getWalletData();
        expect(user1_res.jetton_balance).toEqual(toNano(0.5));
        expect(user1_res.owned_nft_number).toEqual(0n);
        
        //should be: B: 4 FT ,4 NFT ,user2 will mint 1 NFT
        let user2_res= await User2_Wallet.getWalletData();
        expect(user2_res.jetton_balance).toEqual(toNano(4));
        expect(user2_res.owned_nft_number).toEqual(4n);

    })

   
})

