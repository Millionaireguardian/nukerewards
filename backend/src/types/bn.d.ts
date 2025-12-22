declare module 'bn.js' {
  export default class BN {
    constructor(num: number | string | number[] | Uint8Array | Buffer, base?: number | 'hex', endian?: 'le' | 'be');
    toString(base?: number | 'hex', padding?: number): string;
    toArray(endian?: 'le' | 'be', length?: number): number[];
    toArrayLike<T extends Uint8Array | Buffer>(arrayType: { new(length: number): T }, endian?: 'le' | 'be', length?: number): T;
    byteLength(): number;
    isZero(): boolean;
    add(b: BN): BN;
    sub(b: BN): BN;
    mul(b: BN): BN;
    div(b: BN): BN;
    mod(b: BN): BN;
    lt(b: BN): boolean;
    lte(b: BN): boolean;
    gt(b: BN): boolean;
    gte(b: BN): boolean;
    eq(b: BN): boolean;
  }
}

