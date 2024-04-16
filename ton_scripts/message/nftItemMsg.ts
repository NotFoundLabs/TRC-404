
import { Address, beginCell} from "@ton/core";

export let op_transfer_user_nft = 0x5fcc3d14;
export let op_add_one_ft_and_nft = 0x8a7827a7; 

export async function buildTransferNftMsg( new_owner_address: Address, response_address: Address) {

    return beginCell().storeUint(op_transfer_user_nft, 32)  //op_code
        .storeUint(0, 64)  //query_id
        .storeAddress(new_owner_address)     //new owner address  ,nft receiver's client wallet address
        .storeAddress(response_address)    //response_destination
        .storeBit(false)  // custom_payload  // no custom payload ,no use for getgems.io 
        .storeCoins(1)  
        .storeBit(2) //no forward_payload
        .endCell();
}