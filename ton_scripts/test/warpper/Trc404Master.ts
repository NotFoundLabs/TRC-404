import {
    Cell,
    Slice,
    Address,
    Builder,
    beginCell,
    ComputeError,
    TupleItem,
    TupleReader,
    Dictionary,
    contractAddress,
    ContractProvider,
    Sender,
    Contract,
    ContractABI,
    ABIType,
    ABIGetter,
    ABIReceiver,
    TupleBuilder,
    DictionaryValue
} from '@ton/core';
import { SendMessageResult } from '@ton/sandbox';


export function checkMintFtTX(txResult: SendMessageResult & { result: void; }, sender: Address, master: Address, wallet: Address,
    collection: Address, nftItem: Address) {
    //1.check step1  sender -->master
    expect(txResult.transactions).toHaveTransaction({
        from: sender,
        to: master,
        success: true,
    });
    //2.check step2  master -->wallet    ,transferMsg
    expect(txResult.transactions).toHaveTransaction({
        from: master,
        to: wallet,
        success: true,
    });

    //3.check step3  wallet -->collection    ,add_nft_supply msg
    expect(txResult.transactions).toHaveTransaction({
        from: wallet,
        to: collection,
        success: true,
    });

    //4.check step4  collection -->nftItem    , deploy_nft_item msg
    expect(txResult.transactions).toHaveTransaction({
        from: collection,
        to: nftItem,
        success: true,
    });

     //5.check step5  nftItem -->wallet    , add_one_ft_and_nft msg
     expect(txResult.transactions).toHaveTransaction({
        from: nftItem,
        to: wallet,
        success: true,
    });


}



export class Trc404Master implements Contract {

    readonly address: Address;
    readonly init?: { code: Cell, data: Cell };

    public constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }

    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean | null | undefined }, message: Cell) {
        await provider.internal(via, { ...args, body: message });
    }

    async getGetJettonData(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('get_jetton_data', builder.build())).stack;

        let max_supply = source.readBigNumber();
        let mintable = source.readBoolean();
        let owner = source.readAddress();
        let content = source.readCell();
        let jetton_wallet_code = source.readCell();
        let nft_item_code = source.readCell();
        let nft_collection_address = source.readAddress();
        let total_supply = source.readBigNumber();

        return {
            max_supply, mintable, owner, content, jetton_wallet_code, nft_item_code,
            nft_collection_address, total_supply
        };
    }

    async getGetWalletAddress(provider: ContractProvider, owner: Address) {
        let builder = new TupleBuilder();
        builder.writeAddress(owner);
        let source = (await provider.get('get_wallet_address', builder.build())).stack;
        let result = source.readAddress();
        return result;
    }

    async getOwner(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('owner', builder.build())).stack;
        let result = source.readAddress();
        return result;
    }

}