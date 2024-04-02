import { Address, beginCell, contractAddress, toNano, internal, fromNano, Cell, OpenedContract, Dictionary } from "@ton/core";


export function buildMintFtMsg(to_address:Address,jettonAmount:number){
    let op_mint = 0x227d62e9;
    return beginCell().storeUint(op_mint, 32)  //op_code
        .storeUint(0, 64)  //query_id
        .storeAddress(to_address)  //to_address  ,use owner/kojh1 address
        .storeCoins(toNano(jettonAmount)) // the jetton_amount you want to mint
        .endCell();

}

export function buildWithdrawMsg(withdraw_amount:number,to_address:Address){
      let op_withdraw = 0xcb03bfaf; 
    return beginCell().storeUint(op_withdraw, 32)  //op_code
        .storeUint(0, 64)  //query_id
        .storeCoins(toNano(withdraw_amount))      //withdraw_amount
        .storeAddress(to_address)
        .endCell();
}

export function buildChangeMasterAdminMsg(new_admin_address:Address){
    let op_change_admin = 0xb6801836; 
   return beginCell().storeUint(op_change_admin, 32)  //op_code
        .storeUint(0, 64)  //query_id
        .storeAddress(new_admin_address)
        .endCell();
}

export function buildChangeFreemintConfigMsg(freemint_flag:number,freemint_max_supply:number,freemint_price:number){
    let change_freemint_config = 0x63e7f86a; 
   return beginCell().storeUint(change_freemint_config, 32)  //op_code
        .storeUint(0, 64)  //query_id
        .storeInt(freemint_flag,2)  //-1: true,0:false
        .storeCoins(toNano(freemint_max_supply))
        .storeCoins(toNano(freemint_price))
        .endCell();
}