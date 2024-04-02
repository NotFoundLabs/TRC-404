import { Address, beginCell, contractAddress, toNano, internal, fromNano, Cell, OpenedContract, Dictionary } from "@ton/core";

export let op_transfer_ft = 0xf8a7ea5;
export function buildTransferFtMsg(jettonAmount:number,receiver_address:Address,response_address:Address){
  
    return  beginCell().storeUint(op_transfer_ft, 32)  //op_code
        .storeUint(0, 64)  //query_id
        .storeCoins(toNano(jettonAmount)) // the jetton_amount you want to transfer
        .storeAddress(receiver_address)  //to_address  ,the receiver's client wallet address
        .storeAddress(response_address)    //response_destination
        .storeBit(false)    //no custome payload
        //.storeBit(true)    //no custome payload
        .storeCoins(toNano(0.001))    //forward amount 
        .storeBit(2)   //no foward payload
        .endCell();
}