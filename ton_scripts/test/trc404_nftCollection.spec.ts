import { owned_nft_limit, freemint_max_supply, freemint_price, getTrc404WalletAddressAndInit, CompiledCodeList, getTrc404NftItemAddressAndInit } from "../contract/compileContract";
import { getWalletContract, user1, user2 } from "../contract/clientAndWallet";
import { WalletContractV4 } from "@ton/ton";
import { OpenedContract, fromNano, toNano, Address, SendMode } from "@ton/core";

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
import { buildChangeOwnedNftLimitMsg, buildChangeRoyaltyParamsMsg } from "../message/nftCollectionMsg";

let compliedCodes: {
    erc404_collection_code: Cell, erc404_nft_item_code: Cell,
    erc404_jetton_wallet_code: Cell, erc404_master_code: Cell
};

let max_supply = 100000;


describe('Test Trc404 NftCollection change_royalty_params,get_royalty_params  ', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let Collection: SandboxContract<Trc404NftCollection>;
    let CompliedCodes: CompiledCodeList;


    beforeAll(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury("deployer");
        let res = await deployAndCheckCollectionAndMasterContract(blockchain, deployer);
        Collection = res.Collection;
        CompliedCodes = res.compliedCodes;
    });

    //**** Should be error cases  */
    it('should not change_royalty_params when sender is not admin', async () => {
        let gasFee = 0.01; //0.15 ton 
        let user1 = await blockchain.treasury("user1");
        let msg = buildChangeRoyaltyParamsMsg(50, 100, user1.address);
        const changeRoyaltyResult = await Collection.send(user1.getSender(), { value: toNano(gasFee) }, msg);
        expect(changeRoyaltyResult.transactions).toHaveTransaction({
            from: user1.address,
            to: Collection.address,
            success: false,
        });
    })

    it('should not withdraw amount when sender is not admin', async () => {
        let gasFee = 0.01; //0.15 ton 
        let user1 = await blockchain.treasury("user1");
        let msg = buildWithdrawMsg(100, user1.address);
        const withdrawResult = await Collection.send(user1.getSender(), { value: toNano(gasFee) }, msg);
        expect(withdrawResult.transactions).toHaveTransaction({
            from: user1.address,
            to: Collection.address,
            success: false,
        });
    })

    //  //**** Should be correct cases  */
    it('should  change_royalty_params when sender is  admin', async () => {
        let gasFee = 0.01; //0.15 ton 
        let user1 = await blockchain.treasury("user1");
        let msg = buildChangeRoyaltyParamsMsg(50, 100, user1.address);

        const changeRoyaltyResult = await Collection.send(deployer.getSender(), { value: toNano(gasFee) }, msg);
        expect(changeRoyaltyResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: Collection.address,
            success: true,
        });
        //check  royalty_params info
        let { numerator, denominator, owner_address } = await Collection.getRoyaltyParams();
        expect(numerator).toEqual(50n);
        expect(denominator).toEqual(100n);
        expect(owner_address).toEqualAddress(user1.address);
    })


})

