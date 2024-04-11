import { Cell,Address, ContractProvider, Sender,  Contract, TupleBuilder} from '@ton/core';

export class Trc404NftCollection implements Contract {
   
    readonly address: Address; 
    readonly init?: { code: Cell, data: Cell };
    
    public constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: Cell) {   
        await provider.internal(via, { ...args, body: message }); 
    }
    
    async getGetCollectionData(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('get_collection_data', builder.build())).stack;
        let next_item_index = source.readBigNumber();
        let collection_content = source.readCell();
        let owner_address = source.readAddress();
        return {next_item_index,collection_content,owner_address};
    }

    async getGetFullData(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('get_full_data', builder.build())).stack;
        let init  =source.readNumber()
        let owner_address = source.readAddress();
        let next_item_index = source.readBigNumber();
        let collection_content = source.readCell();
        let nft_item_code = source.readCell();
        let royalty_params = source.readCell();
        let jetton_wallet_code = source.readCell();
        let total_supply = source.readBigNumber();
        let master_address  =source.readAddressOpt();
        
        return {init,owner_address,next_item_index,collection_content,nft_item_code,royalty_params,
                jetton_wallet_code,total_supply,master_address};
    }
    
    async getGetNftAddressByIndex(provider: ContractProvider, item_index: bigint) {
        let builder = new TupleBuilder();
        builder.writeNumber(item_index);
        let source = (await provider.get('get_nft_address_by_index', builder.build())).stack;
        let result = source.readAddressOpt();
        return result;
    }

    
    async getGetNftContent(provider: ContractProvider, index: bigint, individual_content: Cell) {
        let builder = new TupleBuilder();
        builder.writeNumber(index);
        builder.writeCell(individual_content);
        let source = (await provider.get('get_nft_content', builder.build())).stack;
        let result = source.readCell();
        return result;
    }
    
    async getRoyaltyParams(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('royalty_params', builder.build())).stack;
        let numerator = source.readBigNumber();
        let denominator = source.readBigNumber();
        let owner_address = source.readAddress();

        return {numerator,denominator,owner_address};
    }
 
    
}