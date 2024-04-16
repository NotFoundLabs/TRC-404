import {  TonClient4, WalletContractV4,  } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";


export const user1 =1,user2 =2,user3 =3;
export const client = new TonClient4({
    endpoint: "https://sandbox-v4.tonhubapi.com",
    //endpoint: "https://sandbox.tonhubapi.com",
     //endpoint: 'https://toncenter.com/api/v2/jsonRPC',
   // endpoint: 'https://testnet.toncenter.com/api/v4/jsonRPC',
});

export async function getWalletContract(userid:number) {
    let mnemonics="";
    if (userid ==user1){
         mnemonics = (process.env.mnemonics_1 || "").toString(); // 🔴 Change to your own, by creating .env file!
    }
    if (userid ==user2){
        mnemonics = (process.env.mnemonics_2 || "").toString(); // 🔴 Change to your own, by creating .env file!
    }
    if (userid ==user3){
        mnemonics = (process.env.mnemonics_3 || "").toString(); // 🔴 Change to your own, by creating .env file!
    }
    
    let keyPair = await mnemonicToPrivateKey(mnemonics.split(" "));
    let secretKey = keyPair.secretKey;
    let workchain = 0;
    let wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
    let wallet_contract = client.open(wallet);
    console.log("Tonkeeper Wallet address: ", wallet_contract.address);
    return { wallet_contract, secretKey };
}