import { owned_nft_limit, freemint_max_supply, freemint_price } from "../contract/compileContract";
import { getWalletContract, user1, user2 } from "../contract/clientAndWallet";
import { WalletContractV4 } from "@ton/ton";
import { OpenedContract, fromNano, toNano, Address, SendMode } from "@ton/core";

import "@ton/test-utils";
import { Cell } from "@ton/core";
import { Trc404Master, checkMintFtTX } from "./warpper/Trc404Master";
import { Trc404Wallet } from "./warpper/Trc404Wallet";
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

let max_supply = 1000000;


describe('Test Trc404 Master admin Mint ', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let Collection: SandboxContract<Trc404NftCollection>;
    let Master: SandboxContract<Trc404Master>;


    beforeAll(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury("deployer");
        let res = await deployAndCheckCollectionAndMasterContract(blockchain, deployer);
        Master = res.Master;
        Collection = res.Collection;
    });

    //**** Should be error cases  */
    it('should not mint FT when sender is not admin', async () => {
        let mintAmount = 1;
        let gasFee = 0.15; //0.15 ton   gas_fee nees 0.15 ~  0.1 * owned_nft_limit/toNano("1") 
        let user1 = await blockchain.treasury("user1");
        let userAddress = user1.address;
        let msg = buildMintFtMsg(userAddress, mintAmount);
        const mintFfResult = await Master.send(user1.getSender(), { value: toNano(gasFee) }, msg);
        expect(mintFfResult.transactions).toHaveTransaction({
            from: user1.address,
            to: Master.address,
            success: false,
        });
    })
    //**** Should be correct cases  */
    it('should mint 1 FT and 1 NFT first time and then mint 1 FT/NFT again', async () => {
        let mintAmount = 1;
        let gasFee = 0.18; //0.18 ton   gas_fee nees 0.15 ~  0.1 * owned_nft_limit/toNano("1") 
        let user1 = await blockchain.treasury("user1");
        let userAddress = user1.address;
        let userIdItemIndex = 1n;
        let msg = buildMintFtMsg(userAddress, mintAmount);
        let is_firstTime = true;
        await checkMintFt(mintAmount, gasFee, deployer, blockchain, Master, Collection, userAddress, userIdItemIndex, msg, is_firstTime);

        // let userIdItemIndex2 = calculateUseridItemIndex(userid,nft_item_index+1n);
        let userIdItemIndex2 = 2n;
        await checkMintFt(mintAmount, gasFee, deployer, blockchain, Master, Collection, userAddress, userIdItemIndex2, msg, false);
    })

    it('should mint 1.5 FT and 1 NFT', async () => {
        let mintAmount = 1.5;
        let gasFee = 0.2; //0.15 ton   gas_fee nees 0.15 ~  0.1 * owned_nft_limit/toNano("1") 
        let user2 = await blockchain.treasury("user2");
        let userAddress = user2.address;

        let userIdItemIndex = 3n;
        //console.log("walletItemIndex:",walletItemIndex);
        let msg = buildMintFtMsg(userAddress, mintAmount);
        let is_firstTime = true;
        await checkMintFt(mintAmount, gasFee, deployer, blockchain, Master, Collection, userAddress, userIdItemIndex, msg, is_firstTime);
    })

    it('should mint 2 FT and 2 NFT', async () => {
        let mintAmount = 2;
        let gasFee = 0.5; //0.15 ton   gas_fee nees 0.15 ~  0.1 * owned_nft_limit/toNano("1") 
        let user4 = await blockchain.treasury("user4");
        let userAddress = user4.address;

        let userIdItemIndex = 4n;
        let msg = buildMintFtMsg(userAddress, mintAmount);
        let is_firstTime = true;
        await checkMintFt(mintAmount, gasFee, deployer, blockchain, Master, Collection, userAddress, userIdItemIndex, msg, is_firstTime);
    })

    it('should mint 3 FT and 3 NFT', async () => {
        let mintAmount = 3;
        let gasFee = 0.5; //0.15 ton   gas_fee nees 0.15 ~  0.1 * owned_nft_limit/toNano("1") 
        let user5 = await blockchain.treasury("user5");
        let userAddress = user5.address;

        let userIdItemIndex = 6n;
        let msg = buildMintFtMsg(userAddress, mintAmount);
        let is_firstTime = true;
        await checkMintFt(mintAmount, gasFee, deployer, blockchain, Master, Collection, userAddress, userIdItemIndex, msg, is_firstTime);
    })

    it('should mint 4 FT and 4 NFT', async () => {
        let mintAmount = 4;
        let gasFee = 0.5; //0.15 ton   gas_fee nees 0.15 ~  0.1 * owned_nft_limit/toNano("1") 
        let user6 = await blockchain.treasury("user6");
        let userAddress = user6.address;

        let userIdItemIndex = 9n;
        let msg = buildMintFtMsg(userAddress, mintAmount);
        let is_firstTime = true;
        await checkMintFt(mintAmount, gasFee, deployer, blockchain, Master, Collection, userAddress, userIdItemIndex, msg, is_firstTime);
    })

    it('should mint 5 FT and 5 NFT', async () => {
        let mintAmount = 5;
        let gasFee = 0.5; //0.15 ton   gas_fee nees 0.15 ~  0.1 * owned_nft_limit/toNano("1") 
        let user6 = await blockchain.treasury("user7");
        let userAddress = user6.address;

        let userIdItemIndex = 13n;
        let msg = buildMintFtMsg(userAddress, mintAmount);
        let is_firstTime = true;
        await checkMintFt(mintAmount, gasFee, deployer, blockchain, Master, Collection, userAddress, userIdItemIndex, msg, is_firstTime);
    })

    it('should mint 10000 FT and ' + owned_nft_limit + ' NFT', async () => {
        let mintAmount = 10000;
        let gasFee = 0.1 * owned_nft_limit; //0.15 ton   gas_fee nees 0.15 ~  0.1 * owned_nft_limit/toNano("1") 
        let user3 = await blockchain.treasury("user3");
        let userAddress = user3.address;
        let userIdItemIndex = 18n;

        let msg = buildMintFtMsg(userAddress, mintAmount);
        let is_firstTime = true;
        await checkMintFt(mintAmount, gasFee, deployer, blockchain, Master, Collection, userAddress, userIdItemIndex, msg, is_firstTime);
    })
})
