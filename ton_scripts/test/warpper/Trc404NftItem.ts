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
import { op_add_one_ft_and_nft } from '../../message/nftItemMsg';


//transfer Nft
export function checkTransferNftTX(txResult: SendMessageResult & { result: void; }, nftItem: Address,
                            senderTrc404Wallet:Address, receiverTrc404Wallet: Address,receiverAddress:Address,collection: Address, ) {
    //1.check step1  nftItem  --> collection , request_transfer_one_ft_and_nft msg
    expect(txResult.transactions).toHaveTransaction({
        from: nftItem,
        to: collection,
        success: true,
    });

    //2.check step2  nftItem  --> receiverAddress , ownership_assigned() msg
    expect(txResult.transactions).toHaveTransaction({
        from: nftItem ,
        to: receiverAddress,
        op: 0x05138d91 , // 0x05138d91  ownership_assigned()
        //success: true,
    });

    //3.check step3.1  collection  --> senderTrc404Wallet ,reduce_one_ft_and_nft msg
    expect(txResult.transactions).toHaveTransaction({
        from: collection ,
        to: senderTrc404Wallet,
        success: true,
    });

    //4.check step3.2  senderTrc404Wallet  --> receiverTrc404Wallet , add_one_ft_and_nft msg
     expect(txResult.transactions).toHaveTransaction({
        from: senderTrc404Wallet,
        to: receiverTrc404Wallet,
        //deploy: true,
        op: op_add_one_ft_and_nft,   //0x8a7827a7, add_one_ft_and_nft msg
        success: true,
    });

}


export class Trc404NftItem implements Contract {
   
    readonly address: Address; 
    readonly init?: { code: Cell, data: Cell };
    
    public constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: Cell) {   
        await provider.internal(via, { ...args, body: message }); 
    }
    
    async getGetNftData(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('get_nft_data', builder.build())).stack;

        let init = source.readNumber();   // -1:has init ,0 :hasn't init
        let index = source.readBigNumber();
        let collection_address = source.readAddress();
        let owner_address = source.readAddress();
        let content = source.readCell();

        return {init,index,collection_address,owner_address,content};
    }
 
    
}