import {  CompiledCodeList } from "../contract/compileContract";
import {  toNano} from "@ton/core";
import "@ton/test-utils";
import { Trc404NftCollection } from "./warpper/Trc404NftCollection";
import { deployAndCheckCollectionAndMasterContract } from "../utils/check";
import {Blockchain,SandboxContract,TreasuryContract,} from "@ton/sandbox";
import { buildChangeRoyaltyParamsMsg } from "../message/nftCollectionMsg";


describe('Test Trc404 NftCollection change_royalty_params,get_royalty_params  ', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let Collection: SandboxContract<Trc404NftCollection>;
    let CompliedCodes: CompiledCodeList;


    beforeAll(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury("deployer");
        let res = await deployAndCheckCollectionAndMasterContract(blockchain, deployer);
        Collection = res.Collection;
        CompliedCodes = res.compliedCodes;
    });

    //**** Should be error cases  */
    it('should not change_royalty_params when sender is not admin', async () => {
        let gasFee = 0.01; //0.15 ton 
        let user1 = await blockchain.treasury("user1");
        let msg = buildChangeRoyaltyParamsMsg(50, 100, user1.address);
        const changeRoyaltyResult = await Collection.send(user1.getSender(), { value: toNano(gasFee) }, msg);
        expect(changeRoyaltyResult.transactions).toHaveTransaction({
            from: user1.address,
            to: Collection.address,
            success: false,
        });
    })


    //  //**** Should be correct cases  */
    it('should  change_royalty_params when sender is  admin', async () => {
        let gasFee = 0.01; //0.15 ton 
        let user1 = await blockchain.treasury("user1");
        let msg = buildChangeRoyaltyParamsMsg(50, 100, user1.address);

        const changeRoyaltyResult = await Collection.send(deployer.getSender(), { value: toNano(gasFee) }, msg);
        expect(changeRoyaltyResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: Collection.address,
            success: true,
        });
        //check  royalty_params info
        let { numerator, denominator, owner_address } = await Collection.getRoyaltyParams();
        expect(numerator).toEqual(50n);
        expect(denominator).toEqual(100n);
        expect(owner_address).toEqualAddress(user1.address);
    })


})

