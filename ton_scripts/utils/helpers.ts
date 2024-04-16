import { Sha256 } from "@aws-crypto/sha256-js";
import { Dictionary, beginCell, Cell, OpenedContract } from "@ton/core";
import {  WalletContractV4 } from "@ton/ton";

const ONCHAIN_CONTENT_PREFIX = 0x00;
const SNAKE_PREFIX = 0x00;
const CELL_MAX_SIZE_BYTES = Math.floor((1023 - 8) / 8);


export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const userid_prefix_length = 20;
export const item_index_length = 34;

export async function waitNextSeqo(wallet_contract: OpenedContract<WalletContractV4>, lastSeqo: number) {
    let nextSeqno: number = lastSeqo;
    let counter = 0;
    var start = performance.now();
    while (nextSeqno < lastSeqo + 1) {
        await sleep(100);
        nextSeqno = await wallet_contract.getSeqno();
        counter = counter + 1;
    }
    var end = performance.now();
    var result = (end - start) / 1000;
    console.log('Waited', `${result}s`, ',queried ', counter, 'times');
}

const sha256 = (str: string) => {
    const sha = new Sha256();
    sha.update(str);
    return Buffer.from(sha.digestSync());
};

const toKey = (key: string) => {
    return BigInt(`0x${sha256(key).toString("hex")}`);
};

export function buildOnchainMetadata(data: { name: string; description: string; image: string }): Cell {
    let dict = Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());

    // Store the on-chain metadata in the dictionary
    Object.entries(data).forEach(([key, value]) => {
        dict.set(toKey(key), makeSnakeCell(Buffer.from(value, "utf8")));
    });

    return beginCell().storeInt(ONCHAIN_CONTENT_PREFIX, 8).storeDict(dict).endCell();
}

export function makeSnakeCell(data: Buffer) {
    // Create a cell that package the data
    let chunks = bufferToChunks(data, CELL_MAX_SIZE_BYTES);

    const b = chunks.reduceRight((curCell, chunk, index) => {
        if (index === 0) {
            curCell.storeInt(SNAKE_PREFIX, 8);
        }
        curCell.storeBuffer(chunk);
        if (index > 0) {
            const cell = curCell.endCell();
            return beginCell().storeRef(cell);
        } else {
            return curCell;
        }
    }, beginCell());
    return b.endCell();
}

function bufferToChunks(buff: Buffer, chunkSize: number) {
    let chunks: Buffer[] = [];
    while (buff.byteLength > 0) {
        chunks.push(buff.slice(0, chunkSize));
        buff = buff.slice(chunkSize);
    }
    return chunks;
}
