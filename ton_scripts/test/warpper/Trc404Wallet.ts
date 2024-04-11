import {Cell,Address,ContractProvider,Sender,Contract,TupleBuilder,} from '@ton/core';
import { SendMessageResult } from '@ton/sandbox';


//only transfer FT, no burn NFT, no mint NFT
export function checkTransferFtBranch1TX(txResult: SendMessageResult & { result: void; }, senderTrc404Wallet: Address, receiverTrc404Wallet: Address,) {
    //1.check step1  sender wallet  -->receiver wallett
    expect(txResult.transactions).toHaveTransaction({
        from: senderTrc404Wallet,
        to: receiverTrc404Wallet,
        success: true,
    });
}

//transfer FT, and sender will burn NFT, but receiver will  not mint NFT
export function checkTransferFtBranch2TX(txResult: SendMessageResult & { result: void; }, senderTrc404Wallet: Address, receiverTrc404Wallet: Address,
    collection: Address, nftItem: Address) {
    //1.check step1  sender wallet  -->receiver wallett
    expect(txResult.transactions).toHaveTransaction({
        from: senderTrc404Wallet,
        to: receiverTrc404Wallet,
        success: true,
    });

     //2.check step3  sender wallet -->collection    , reduce_nft_supply msg
     expect(txResult.transactions).toHaveTransaction({
        from: senderTrc404Wallet,
        to: collection,
        success: true,
    });

    //3.check step4    collection -->nftItem    , burn_nft_item msg
    expect(txResult.transactions).toHaveTransaction({
        from: collection,
        to: nftItem,
        success: true,
    });

    //4.check step5    nftItem -->wallet    , cb_burn_nft msg
     expect(txResult.transactions).toHaveTransaction({
        from: nftItem,
        to: senderTrc404Wallet,
        success: true,
    });

   
}


//transfer FT, and sender will not burn NFT, but receiver will   mint NFT
export function checkTransferFtBranch3TX(txResult: SendMessageResult & { result: void; }, senderTrc404Wallet: Address, receiverTrc404Wallet: Address,
    collection: Address, nftItem: Address) {
    //1.check step1  sender wallet  -->receiver wallet
    expect(txResult.transactions).toHaveTransaction({
        from: senderTrc404Wallet,
        to: receiverTrc404Wallet,
        success: true,
    });

    //2.check step2  receiver wallet -->collection  , add_nft_supply msg
       expect(txResult.transactions).toHaveTransaction({
        from: receiverTrc404Wallet,
        to: collection,
        success: true,
    });

     //3.check step3  collection -->nftItem  , deploy_nft_item msg
     expect(txResult.transactions).toHaveTransaction({
        from: collection,
        to: nftItem,
        success: true,
    });

     //4.check step4  nftItem -->receiver wallet  , add_one_ft_and_nft msg
     expect(txResult.transactions).toHaveTransaction({
        from: nftItem,
        to: receiverTrc404Wallet,
        success: true,
    });

  
}

//transfer FT, and sender will  burn NFT, and receiver will also mint NFT
export function checkTransferFtBranch4TX(txResult: SendMessageResult & { result: void; }, senderTrc404Wallet: Address, receiverTrc404Wallet: Address,
    collection: Address, burnNftItem: Address,mintNftItem:Address) {
    //1.check step1  sender wallet  -->receiver wallett
    expect(txResult.transactions).toHaveTransaction({
        from: senderTrc404Wallet,
        to: receiverTrc404Wallet,
        success: true,
    });

    //2.check step2.1  sender wallet -->collection    , reduce_nft_supply msg
      expect(txResult.transactions).toHaveTransaction({
        from: senderTrc404Wallet,
        to: collection,
        success: true,
    });

    //3.check step2.2    collection -->nftItem    , burn_nft_item msg
    expect(txResult.transactions).toHaveTransaction({
        from: collection,
        to: burnNftItem,
        success: true,
    });

    //4.check step2.3   nftItem--> sender wallet    , cb_burn_nft_item msg
    expect(txResult.transactions).toHaveTransaction({
        from: burnNftItem,
        to: senderTrc404Wallet,
        success: true,
    });

  
    //5.check step3.1  receiver wallet -->collection   ,add_nft_supply msg
    expect(txResult.transactions).toHaveTransaction({
        from: receiverTrc404Wallet,
        to: collection,
        success: true,
    });

    //6.check step3.2  collection -->nftItem  , deploy_nft_item msg
       expect(txResult.transactions).toHaveTransaction({
        from: collection,
        to: mintNftItem,
        success: true,
    });

    //7.check step3.3 nftItem--> receiver wallet   , add_one_ft_and_nft msg
    expect(txResult.transactions).toHaveTransaction({
        from: mintNftItem,
        to: receiverTrc404Wallet,
        success: true,
    });
}


export class Trc404Wallet implements Contract {

    readonly address: Address;
    readonly init?: { code: Cell, data: Cell };

    public constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }

    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean | null | undefined }, message: Cell) {
        await provider.internal(via, { ...args, body: message });
    }

    async getWalletData(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('get_wallet_data', builder.build())).stack;

        let jetton_balance = source.readBigNumber();
        let owner_address = source.readAddress();
        let jetton_master_address = source.readAddress();
        let jetton_wallet_code = source.readCell();
        let nft_item_code = source.readCell();
        let nft_collection_address = source.readAddress();
        let owned_nft_dict = source.readCellOpt();
        let owned_nft_number = source.readBigNumber();
        let owned_nft_limit = source.readBigNumber();
        let pending_reduce_jetton_balance = source.readBigNumber();
        let pending_transfer_nft_queue = source.readCellOpt();

        return { jetton_balance, owner_address, jetton_master_address, jetton_wallet_code,nft_item_code ,
                nft_collection_address, owned_nft_dict, owned_nft_number,
                owned_nft_limit,pending_reduce_jetton_balance,pending_transfer_nft_queue };
    }
}