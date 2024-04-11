
import { Address, beginCell, contractAddress, toNano, internal, fromNano, Cell, OpenedContract, Dictionary } from "@ton/core";
import { item_index_length } from "../utils/helpers";

export function buildChangeRoyaltyParamsMsg(numerator: number, denominator: number, owner_address: Address) {
    
    let op_change_royalty_params = 0xe90af271

    let royalty_params = beginCell().storeUint(numerator, 16)   //numerator
        .storeUint(denominator, 16)   //denominator
        .storeAddress(owner_address)    //destination owner_address
        .endCell();   //means 0/100 no royalty

    return beginCell().storeUint(op_change_royalty_params, 32)  //op_code
        .storeUint(0, 64)  //query_id
        .storeRef(royalty_params)      //royalty_params
        .endCell();
}


export function buildChangeOwnedNftLimitMsg(owned_nft_limit: number) {
    
    let op_change_owned_nft_limit = 0xba5f8281;

    return beginCell().storeUint(op_change_owned_nft_limit, 32)  //op_code
        .storeUint(0, 64)  //query_id
        .storeUint(owned_nft_limit,item_index_length)      //owned_nft_limit
        .endCell();
}




