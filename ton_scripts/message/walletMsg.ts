import { Address, beginCell, toNano } from "@ton/core";

export function buildTransferFtMsg(jettonAmount:number,receiver_address:Address,response_address:Address){
    let op_transfer_ft = 0x0f8a7ea5;
    return  beginCell().storeUint(op_transfer_ft, 32)  //op_code
        .storeUint(0, 64)  //query_id
        .storeCoins(toNano(jettonAmount)) // the jetton_amount you want to transfer
        .storeAddress(receiver_address)  //to_address  ,the receiver's client wallet address
        .storeAddress(response_address)    //response_destination
        .storeBit(false)    //no custome payload
        .storeCoins(1)    //forward amount 
        .storeBit(0)   //no foward payload
        .endCell();
}