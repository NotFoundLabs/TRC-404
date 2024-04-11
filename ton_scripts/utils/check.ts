import { getTrc404CollectionAndMasterAddress, getAllCompileCode } from "../contract/compileContract";
import { toNano, Address, Cell } from "@ton/core";
import { Trc404NftCollection } from "../test/warpper/Trc404NftCollection";
import { Trc404Master, checkMintFtTX } from "../test/warpper/Trc404Master";
import { Trc404Wallet } from "../test/warpper/Trc404Wallet";
import { owned_nft_limit } from "../contract/compileContract";


import {
    Blockchain,
    SandboxContract,
    TreasuryContract,
    printTransactionFees,
} from "@ton/sandbox";
import { getInitDeployMasterMsg } from "../contract/initDeployContract";



export async function deployAndCheckCollectionAndMasterContract(blockchain: Blockchain, deployer: SandboxContract<TreasuryContract>) {
    //****************1. compile and get contract address
    let compliedCodes = await getAllCompileCode();
    let { deployTrc404CollectionContract, collection_init, deployMasterContractAddress, master_init } =
        await getTrc404CollectionAndMasterAddress(compliedCodes, deployer.address); //deployer as admin of collection and master contract

    let Collection = blockchain.openContract(new Trc404NftCollection(deployTrc404CollectionContract, collection_init));
    let Master = blockchain.openContract(new Trc404Master(deployMasterContractAddress, master_init));

    //2. Send Transaction
    //deploy collection
    const deployCollectionResult = await Collection.send(deployer.getSender(),
        { value: toNano("0.02") }, Cell.EMPTY);
    expect(deployCollectionResult.transactions).toHaveTransaction({
        from: deployer.address,
        to: Collection.address,
        deploy: true,
        success: true,
    });

    //deploy master
    const deployMasterResult = await Master.send(deployer.getSender(),
        { value: toNano("0.02") }, getInitDeployMasterMsg(0));
    expect(deployMasterResult.transactions).toHaveTransaction({
        from: deployer.address,
        to: Master.address,
        deploy: true,
        success: true,
    });

    //3.check init data
    //check Master init data
    let jettonData = await Master.getGetJettonData();
    expect(jettonData.total_supply).toEqual(0n);
    expect(jettonData.mintable).toEqual(true);
    expect(jettonData.owner.equals(deployer.address));
    expect(jettonData.nft_collection_address.equals(Collection.address));

    //check collection init data
    let collectionData = await Collection.getGetFullData();
    expect(collectionData.next_item_index).toEqual(0n);
    expect(collectionData.owner_address.equals(deployer.address));
    expect(collectionData.master_address?.equals(Master.address));

    return { compliedCodes, Collection, Master };

}

export async function checkMintFt(mintAmount: number, gasFee: number, sender: SandboxContract<TreasuryContract>, blockchain: Blockchain,
    Master: SandboxContract<Trc404Master>, Collection: SandboxContract<Trc404NftCollection>,
    userAddress: Address, testNftItemIndex: bigint, msg: Cell, is_firstTime: boolean) {
    const user_trc404_Wallet = await Master.getGetWalletAddress(userAddress);
    const nft_item_adddress = await Collection.getGetNftAddressByIndex(testNftItemIndex) as Address;
    const totalSupplyBefore = (await Master.getGetJettonData()).total_supply;

    //check if there is a action occur error and bounced
    let walletJettonBalanceBefore = 0n;
    let walletOwnedNftNumberBefore = 0n;
    let Wallet = blockchain.openContract(new Trc404Wallet(user_trc404_Wallet));
    let mintFfResult = null;
    if (is_firstTime) {
        //mint FT to user1 
        mintFfResult = await Master.send(sender.getSender(), { value: toNano(gasFee) }, msg);

        printTransactionFees(mintFfResult.transactions);
        checkMintFtTX(mintFfResult, sender.address, Master.address, user_trc404_Wallet, Collection.address, nft_item_adddress);
    } else {
        walletJettonBalanceBefore = (await Wallet.getWalletData()).jetton_balance;
        walletOwnedNftNumberBefore = (await Wallet.getWalletData()).owned_nft_number;

        mintFfResult = await Master.send(sender.getSender(), { value: toNano(gasFee) }, msg);
        printTransactionFees(mintFfResult.transactions);
        checkMintFtTX(mintFfResult, sender.address, Master.address, user_trc404_Wallet, Collection.address, nft_item_adddress);
    }

    console.log("walletOwnedNftNumberBefore:", walletOwnedNftNumberBefore);

    const totalSupplyAfter = (await Master.getGetJettonData()).total_supply;
    expect(totalSupplyBefore + toNano(mintAmount)).toEqual(totalSupplyAfter);

    let wallet_DataRes = await Wallet.getWalletData();
    expect(wallet_DataRes.jetton_balance).toEqual(walletJettonBalanceBefore + toNano(mintAmount));
    expect(wallet_DataRes.owner_address.equals(userAddress));

    let lastest_owned_nft_number = (toNano(mintAmount) + toNano(walletOwnedNftNumberBefore)) / toNano(1);
    console.log("lastest_owned_nft_number:", lastest_owned_nft_number);
    console.log("mintAmount:", mintAmount);
    lastest_owned_nft_number = lastest_owned_nft_number >= BigInt(owned_nft_limit) ? BigInt(owned_nft_limit) : lastest_owned_nft_number;

    expect(wallet_DataRes.owned_nft_number).toEqual(lastest_owned_nft_number);
}