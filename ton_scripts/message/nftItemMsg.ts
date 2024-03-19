
import { Address, beginCell } from "@ton/core";

export function buildTransferNftMsg( new_owner_address: Address, response_address: Address) {
    let op_transfer_user_nft = 0x5fcc3d14;

    return beginCell().storeUint(op_transfer_user_nft, 32)  //op_code
        .storeUint(0, 64)  //query_id
        .storeAddress(new_owner_address)     //new owner address  ,nft receiver's client wallet address
        .storeAddress(response_address)    //response_destination
        .storeBit(false)  // custom_payload  // no custom payload ,no use for getgems.io 
        .storeCoins(1)    //forward_ton_amount
        .storeBit(0) //no forward_payload
        .endCell();
}