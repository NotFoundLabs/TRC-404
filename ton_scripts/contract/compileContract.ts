import * as fs from "fs";
import { Address, beginCell, contractAddress, toNano,  internal, fromNano, Cell, OpenedContract, Dictionary } from "@ton/core";
import {TonClient4, TonClient,WalletContractV4} from "@ton/ton";
import { compileFunc } from "@ton-community/func-js";
import { client, getWalletContract } from "./clientAndWallet";
import { buildOnchainMetadata,item_index_length,userid_prefix_length } from "../utils/helpers";

async function compileFuncFile(name: string) {
    let result = "";
    const compileResult = await compileFunc({
        targets: ["./sources/" + name + ".fc"],
        sources: (x) => fs.readFileSync(x).toString("utf8"),
    });

    if (compileResult.status === "error") {
        console.error("compile " + name + " contract error:", compileResult.message);
    } else {
        const contractPath = "./build/" + name + ".compiled.base64";
        result = Cell.fromBoc(Buffer.from(compileResult.codeBoc, "base64"))[0].toBoc().toString("base64");
        fs.writeFileSync(contractPath, result);
    }
    return result;
}

export type CompiledCodeList = {
    erc404_collection_code: Cell;
    erc404_nft_item_code: Cell,
    erc404_jetton_wallet_code: Cell,
    erc404_master_code: Cell
};


export let owned_nft_limit = 5;
export let freemint_current_supply = 0
export let freemint_max_supply = 5000;
export let freemint_price =1 ;             //1 TON ,for test script need to change 1 TON

export async function getFixPriceSaleContractInit(admin_address:Address,nft_address:Address,){
    let fix_price_sale_code = Cell.fromBase64(await compileFuncFile("nft-fixprice-sale"));

    let fees_cell = beginCell().storeCoins(1)       //marketplace_fee,
                     .storeAddress(admin_address)   //marketplace_fee_address
                     .storeAddress(admin_address)    //royalty_address
                     .storeCoins(1)                  //royalty_amount
                     .endCell();

    let fix_price_sale_init_data = beginCell()
    .storeAddress(admin_address)  //marketplace_address
    .storeAddress(nft_address)  //marketplace_address
    .storeCoins(toNano(1))     // full_price
    .storeRef(fees_cell)      // fees_cell
    .endCell();

    let fix_price_sale_init = { code: fix_price_sale_code ,data: fix_price_sale_init_data };
    return fix_price_sale_init;
}


export async function getAllCompileCode() {
    let erc404_collection_code = Cell.fromBase64(await compileFuncFile("trc404_nftCollection"));
    let erc404_nft_item_code = Cell.fromBase64(await compileFuncFile("trc404_nftItem"));
    let erc404_jetton_wallet_code = Cell.fromBase64(await compileFuncFile("trc404_wallet"));
    let erc404_master_code = Cell.fromBase64(await compileFuncFile("trc404_master"));
    return { erc404_collection_code, erc404_nft_item_code, erc404_jetton_wallet_code, erc404_master_code };
}



export async function getTrc404WalletAddressAndInit(user_client_wallet: Address, jetton_master_address: Address,
    jetton_wallet_code: Cell,nft_item_code:Cell, nft_collection_address: Address) {
    //********1. init Trc404 wallet state and calculate wallet contrtact address*/
    let wallet_init_data = beginCell()
        .storeCoins(0) //;; jetton_balance ,
        .storeAddress(user_client_wallet) // ;; owner_address
        .storeAddress(jetton_master_address) //;; Jetton_master_address
        .storeRef(jetton_wallet_code) //;; Jetton_wallet_code
        .storeRef(nft_item_code) //;; Nft_item_code
        .storeAddress(nft_collection_address) // ;; jetton_wallet_code
        .storeDict(Dictionary.empty())    //owned nft list
        .storeInt(0,item_index_length + 1)   //owned_nft_number
        .storeUint(owned_nft_limit,item_index_length)   //Owned_nft_limit
        .storeCoins(0) //;; pending_reduce_jetton_balance ,
        .storeDict(Dictionary.empty())    //pending_burn_nft_queue
        .endCell();

    let state_init = { code: jetton_wallet_code, data: wallet_init_data };
    let address = contractAddress(0, state_init);
    return {address,state_init};
}

export async function getTrc404NftItemAddressAndInit(item_index:bigint,erc404_nft_item_code: Cell, nft_collection_address: Address) {
    let nftItem_init_data = beginCell()
                .storeUint(item_index, 64)            //;; item_index
                .storeAddress(nft_collection_address) // ;; nft_collection_address
                .endCell();

    let state_init = { code: erc404_nft_item_code, data: nftItem_init_data };
    let address = contractAddress(0, state_init);
    return {address,state_init};
}



export async function getTrc404CollectionAndMasterAddress(compliedCodes: CompiledCodeList, admin_address: Address) {
    //********1. init Trc404 collection state and calculate collection contrtact address*/
    
    let seed= Math.floor(Math.random() * 100001); //in order to make different contract
    let time=new Date().getTime(); //in order to make different contract
    let nonce = seed.toString()+time.toString();

    // let nonce ="19791712017835984";
    // let seed  = 1979;
    // console.log("********compile contract nonce:",nonce,"seed:",seed);
    
    // on chain way to store collection content
    const collecionParams = {
        image: "https://raw.githubusercontent.com/NotFoundLabs/TRC-404/main/logo-blue.png?raw=true",
        //name: "Test"+seed+"TRC-404 Replicant NFT",
        name: "TRC-404 Replicant NFT",
        description: "TRC-404 is an innovative, mixed Jetton & NFT implementation with native liquidity and fractionalization for semi-fungible tokens.",
        social_linnks: ['https://x.com/ton_trc404','https://t.me/trc404news','https://trc-404.xyz'],
        marketplace: "https://getgems.io",
        nonce: nonce
    };
    // Create content Cell
    let collection_content = buildOnchainMetadata(collecionParams);

    let royalty_params = beginCell().storeUint(0, 16)   //numerator
                                  .storeUint(100, 16)   //denominator
                                  .storeAddress(admin_address)    //destination owner_address
                                  .endCell();   //means 0/100 no royalty

    let collection_init_data = beginCell()
        .storeAddress(admin_address)
        .storeUint(0, 64) //;; next_item_index ,
        .storeRef(collection_content) // ;; collection_content
        .storeRef(compliedCodes.erc404_nft_item_code) //;; nft_item_code
        .storeRef(royalty_params) //;; royalty_params
        .storeRef(compliedCodes.erc404_jetton_wallet_code) // ;; jetton_wallet_code
        .storeUint(0, 64) //;; total_supply
        .endCell();

    let collection_init = { code: compliedCodes.erc404_collection_code, data: collection_init_data };

    let deployTrc404CollectionContract = contractAddress(0, collection_init);

    
    //********2. init Trc 404 master state and calculate master contrtact address

    const jettonParams = {
        //name: "Test"+seed+"TRC404 Token",
        name: "TRC404 Token",
        description: "TRC-404 is an innovative, mixed Jetton & NFT implementation with native liquidity and fractionalization for semi-fungible tokens.",
        symbol: "T404",
        decimals: "9",
        image: "https://raw.githubusercontent.com/NotFoundLabs/TRC-404/main/logo-blue.png?raw=true",
        nonce: nonce
    };
    // Create content Cell
    let content = buildOnchainMetadata(jettonParams);

    let init_data = beginCell()
        .storeCoins(0) //;; total_supply  //must use storeCoins，if use storeUint,it will lead to all the storage is wrong!
        .storeAddress(admin_address)   //;; admin_address
        .storeAddress(deployTrc404CollectionContract) //;; nft_collection_address
        .storeRef(content) // ;; content
        .storeRef(compliedCodes.erc404_jetton_wallet_code) //;; jetton_wallet_code
        .storeRef(compliedCodes.erc404_nft_item_code) //;; nft_item_code
        .storeInt(-1,2)   //FreeMint flag, -1:true,0:false
        .storeCoins(toNano(freemint_current_supply))    //;;FreeMint freemint_current_supply 
        .storeCoins(toNano(freemint_max_supply))    //FreeMint freemint_max_supply  
        .storeCoins(toNano(freemint_price))    //;; freemint_price,
        .storeInt(-1, 2) //;; mintable -1: true, 0 :false
        .endCell();

    let master_init = { code: compliedCodes.erc404_master_code, data: init_data };
    let deployMasterContractAddress = contractAddress(0, master_init);
    return { deployTrc404CollectionContract, collection_init, deployMasterContractAddress, master_init };
}


export { client };

