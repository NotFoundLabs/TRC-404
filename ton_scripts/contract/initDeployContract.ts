import { Address, beginCell, toNano,  internal, fromNano, Cell } from "@ton/core";
import { getWalletContract } from "./clientAndWallet";


export function getInitDeployMasterMsg(query_id:number){
    let op_deployMaster = 0xbbb9075c;
    return beginCell().storeUint(op_deployMaster, 32).storeUint(query_id,64).endCell();
}

export async function initDeployTrc404Collection(sender_userid:number,deployTrc404CollectionContract:Address,collection_init:{code:Cell;data:Cell}, amountStr: string) {
    // ========================================
    let { wallet_contract, secretKey } = await getWalletContract(sender_userid);
    let deployAmount = toNano(amountStr); //0.2 or 0.3 
    let seqno: number = await wallet_contract.getSeqno();
    let balance: bigint = await wallet_contract.getBalance();
    // ========================================
    console.log("================ " + seqno + " ======================== ")
    console.log("Current deployment wallet balance: ", fromNano(balance).toString(), "💎TON");
    console.log("Deploying Trc404 collection contract to address: ", deployTrc404CollectionContract);

    //Deploy contract 
    let packed = beginCell().endCell();
    await wallet_contract.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: deployTrc404CollectionContract,
                value: deployAmount,
                init: { code: collection_init.code, data: collection_init.data },
                bounce: true,
                body: packed,
            }),
        ],
    });
    return seqno;
}

export async function initDeployTrc404Master(sender_userid:number,deployContractAddress:Address,master_init:{code:Cell;data:Cell}, amountStr: string) {

    // ========================================
    let { wallet_contract, secretKey } = await getWalletContract(sender_userid);
    let deployAmount = toNano(amountStr); //0.1 or 0.2 
    let seqno: number = await wallet_contract.getSeqno();
    let balance: bigint = await wallet_contract.getBalance();

    // ========================================
    console.log("================ " + seqno + " ======================== ")
    console.log("Current deployment wallet balance: ", fromNano(balance).toString(), "💎TON");
    console.log("Deploying Trc404 master contract to address: ", deployContractAddress);

    //Deploy contract and master contract will send initCollection msg to Collection contract to init admin_address and master_address
    await wallet_contract.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: deployContractAddress,
                value: deployAmount,
                init: { code: master_init.code, data: master_init.data },
                bounce: true,
                body: getInitDeployMasterMsg(0),
            }),
        ],
    });

    return seqno;
}