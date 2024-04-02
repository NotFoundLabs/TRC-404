import { Address, beginCell, contractAddress, toNano, internal, fromNano, Cell, OpenedContract, Dictionary } from "@ton/core";
import { getWalletContract } from "./clientAndWallet";
import {TonClient4, TonClient,WalletContractV4} from "@ton/ton";
import { CompiledCodeList, getTrc404WalletAddressAndInit, getTrc404NftItemAddressAndInit } from "./compileContract";
import { buildMintFtMsg,buildWithdrawMsg,buildChangeMasterAdminMsg,buildChangeFreemintConfigMsg } from "../message/masterMsg";
import { buildTransferFtMsg } from "../message/walletMsg"; 
import { buildChangeOwnedNftLimitMsg, buildChangeRoyaltyParamsMsg } from "../message/nftCollectionMsg";
import { buildTransferNftMsg } from "../message/nftItemMsg";

export async function invokeMintFromTrc404Master(user_wallet: OpenedContract<WalletContractV4>, secretKey: Buffer, erc404_master_address: Address, to_address: Address, jetton_amount: number, amountStr: number) {
    // ========================================
    let deployAmount = toNano(amountStr);
    let seqno: number = await user_wallet.getSeqno();
    let balance: bigint = await user_wallet.getBalance();

    // ========================================
    console.log("================ " + seqno + " ======================== ")
    console.log("Current deployment wallet balance: ", fromNano(balance).toString(), "💎TON");
    console.log("Invoke Mint function of Trc404 master contract : ", erc404_master_address);

    //Deploy contract
    await user_wallet.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: erc404_master_address,
                value: deployAmount,
                bounce: true,
                body: buildMintFtMsg(to_address,jetton_amount),
            }),
        ],
    });

    return seqno;

}

export async function invokeTransferFTFromTrc404Wallet(input_seqo:number,user_wallet: OpenedContract<WalletContractV4>, secretKey: Buffer, compiledCodes: CompiledCodeList,
    erc404_master_address: Address, receiver_address: Address,
    jetton_amount: number, erc404_nft_collection_address: Address, msg_value_str: number) {
    // ========================================
    let msgValueAmount = toNano(msg_value_str);
    let seqno = input_seqo;
    if (input_seqo == 0){
        seqno = await user_wallet.getSeqno();
    }

    let balance: bigint = await user_wallet.getBalance();

    //calculate user's erc404 wallet address
    let  wallet_info= await getTrc404WalletAddressAndInit(user_wallet.address, erc404_master_address, compiledCodes.erc404_jetton_wallet_code, 
                                           compiledCodes.erc404_nft_item_code,erc404_nft_collection_address);
    let sender_erc404_wallet = wallet_info.address;
    // ========================================
    console.log("================ " + seqno + " ======================== ")
    console.log("Current sender client wallet balance: ", fromNano(balance).toString(), "💎TON");
    console.log("Invoke transfer FT function of user's Trc404 wallet contract: ", sender_erc404_wallet);
    console.log("Transfer ", jetton_amount, " erc404 token from ", user_wallet.address, " to ", receiver_address);

    //transfer ft
    await user_wallet.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: sender_erc404_wallet,
                value: msgValueAmount,
                bounce: true,
                body: buildTransferFtMsg(jetton_amount,receiver_address,user_wallet.address),
            }),
        ],
    });

    return seqno;

}


export async function invokeTransferNFTFromTrc404NftItem(input_seqo:number,user_wallet: OpenedContract<WalletContractV4>, secretKey: Buffer, compiledCodes: CompiledCodeList,
    erc404_nft_collection_address: Address, new_owner_address: Address,
    nft_item_index: bigint, msg_value_str: number) {
    // ========================================
    let msgValueAmount = toNano(msg_value_str);

    let seqno = input_seqo;
    if (input_seqo== 0){
        seqno = await user_wallet.getSeqno();
    }
    let balance: bigint = await user_wallet.getBalance();

    //calculate user's erc404  nft_item address
    let  nft_item_info= await getTrc404NftItemAddressAndInit(nft_item_index, compiledCodes.erc404_nft_item_code, erc404_nft_collection_address);
     let sender_nft_item_contract= nft_item_info.address;
    // ========================================
    console.log("================ " + seqno + " ======================== ")
    console.log("Current sender client wallet balance: ", fromNano(balance).toString(), "💎TON");
    console.log("Invoke transfer NFT item function of user's Trc404 NftItem contract:", sender_nft_item_contract);
    console.log("Transfer nft_item_index:", nft_item_index, " from ", user_wallet.address, " to ", new_owner_address);

    //Transfer one NFT 
    await user_wallet.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: sender_nft_item_contract,
                value: msgValueAmount,
                bounce: true,
                body: await buildTransferNftMsg(new_owner_address,user_wallet.address),
            }),
        ],
    });

    return seqno;
}

export async function invokeChangeFreemintConfigFromTrc404Master(user_wallet: OpenedContract<WalletContractV4>, secretKey: Buffer, 
    erc404_master_address: Address, freemint_flag: number, freemint_max_supply: number, freemint_price: number, msg_value_str: string) {
    let msgValueAmount = toNano(msg_value_str);
    let seqno: number = await user_wallet.getSeqno();
    let balance: bigint = await user_wallet.getBalance();

    // ========================================
    console.log("================ " + seqno + " ======================== ")
    console.log("Current sender client wallet balance: ", fromNano(balance).toString(), "💎TON");
    console.log("Invoke change Freemint config function of Trc404 master contract:", erc404_master_address);
    console.log("new_freemint_flag:", freemint_flag, ", freemint_max_supply ", freemint_max_supply, ", freemint_price: ", freemint_price);

    //change Freemint config 
    await user_wallet.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: erc404_master_address,
                value: msgValueAmount,
                bounce: true,
                body: buildChangeFreemintConfigMsg(freemint_flag,freemint_max_supply,freemint_price),
            }),
        ],
    });

    return seqno;
}


export async function invokeChangeRoyaltyParamsFromTrc404Collection(user_wallet: OpenedContract<WalletContractV4>, secretKey: Buffer,
    erc404_collection_address: Address, numerator: number, denominator: number, owner_address: Address, msg_value_str: string) {
    let msgValueAmount = toNano(msg_value_str);
    let seqno: number = await user_wallet.getSeqno();
    let balance: bigint = await user_wallet.getBalance();

    // ========================================
    console.log("================ " + seqno + " ======================== ")
    console.log("Current sender client wallet balance: ", fromNano(balance).toString(), "💎TON");
    console.log("Invoke change Royalty Params function of Trc404 collection contract:", erc404_collection_address);
    console.log("numerator:", numerator, ", denominator ", denominator, ", owner_address: ", owner_address);

    //change Royalty Params
    await user_wallet.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: erc404_collection_address,
                value: msgValueAmount,
                bounce: true,
                body: buildChangeRoyaltyParamsMsg(numerator,denominator,owner_address),
            }),
        ],
    });

    return seqno;
}


export async function invokeChangeOwnedNftLimitFromTrc404Collection(user_wallet: OpenedContract<WalletContractV4>, secretKey: Buffer,
    erc404_collection_address: Address, owned_nft_limit: number, msg_value_str: string) {
    let msgValueAmount = toNano(msg_value_str);
    let seqno: number = await user_wallet.getSeqno();
    let balance: bigint = await user_wallet.getBalance();

    // ========================================
    console.log("================ " + seqno + " ======================== ")
    console.log("Current sender client wallet balance: ", fromNano(balance).toString(), "💎TON");
    console.log("Invoke change owned nft limit function of Trc404 collection contract:", erc404_collection_address);
    console.log("owned_nft_limit:", owned_nft_limit);

    //change owned_nft_limit
    await user_wallet.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: erc404_collection_address,
                value: msgValueAmount,
                bounce: true,
                body: buildChangeOwnedNftLimitMsg(owned_nft_limit),
            }),
        ],
    });

    return seqno;
}


export async function invokeFreeMintFromTrc404Master(user_wallet: OpenedContract<WalletContractV4>, secretKey: Buffer,
    erc404_master_address: Address, msg_value_str: string) {
    let msgValueAmount = toNano(msg_value_str);
    let seqno: number = await user_wallet.getSeqno();
    let balance: bigint = await user_wallet.getBalance();

    // ========================================
    console.log("================ " + seqno + " ======================== ")
    console.log("Current sender client wallet balance: ", fromNano(balance).toString(), "💎TON");
    console.log("Invoke free Mint of Trc404 master contract:", erc404_master_address);
    console.log("msg_value_str:", msg_value_str);

    await user_wallet.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: erc404_master_address,
                value: msgValueAmount,
                bounce: true,
                //body: packed, //body is null
            }),
        ],
    });

    return seqno;

    }


export async function invokeWithDrawFromTrc404Master(user_wallet: OpenedContract<WalletContractV4>, secretKey: Buffer,
    erc404_master_address: Address, withdraw_amount:number,to_address:Address, msg_value_str: string) {
    let msgValueAmount = toNano(msg_value_str);
    let seqno: number = await user_wallet.getSeqno();
    let balance: bigint = await user_wallet.getBalance();

    // ========================================
    console.log("================ " + seqno + " ======================== ")
    console.log("Current sender client wallet balance: ", fromNano(balance).toString(), "💎TON");
    console.log("Invoke withdraw function of Trc404 master contract:", erc404_master_address);
    console.log("withdraw_amount:", withdraw_amount, ", to_address ", to_address);

    //withdraw
    await user_wallet.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: erc404_master_address,
                value: msgValueAmount,
                bounce: true,
                body: buildWithdrawMsg(withdraw_amount,to_address),
            }),
        ],
    });

    return seqno;
}

