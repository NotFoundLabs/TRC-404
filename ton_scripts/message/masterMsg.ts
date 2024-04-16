import { Address, beginCell, toNano } from "@ton/core";


export function buildMintFtMsg(to_address:Address,jettonAmount:number){
    let op_mint = 0x227d62e9;
    return beginCell().storeUint(op_mint, 32)  //op_code
        .storeUint(0, 64)  //query_id
        .storeAddress(to_address)  //to_address  ,use owner/kojh1 address
        .storeCoins(toNano(jettonAmount)) // the jetton_amount you want to mint
        .endCell();

}