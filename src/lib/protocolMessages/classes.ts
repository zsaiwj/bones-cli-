import { varIntEncode } from "./utils";

export class TransferInstance {
  id: bigint;
  amount: bigint;
  output: number;

  // Constructor for Transfer
  constructor(id: bigint, amount: bigint, output: number) {
    this.id = id;
    this.amount = amount;
    this.output = output;
  }
}

export class Tag {
  // Tag values according to https://github.com/bonesprotocol/ord/blob/bones/crates/bones/src/keepsake/tag.rs
  static Body = 0;
  static Flags = 2;
  static Pointer = 4;
  static Claim = 6;

  // Enshrine
  static Seed = 10;
  static Amount = 12;
  static Cap = 14;
  static Price = 16;
  static Subsidy = 18;

  // Mint
  static Mint = 20;

  // Swap
  static SwapInput = 30;
  static SwapOutput = 32;
  static SwapInputAmount = 34;
  static SwapOutputAmount = 36;

  // Summoning
  static Treasure = 40;
  static SyndicateCap = 42;
  static Lock = 44;
  static HeightStart = 46;
  static HeightEnd = 48;
  static Quota = 50;
  static Royalty = 52;
  static Reward = 54;

  // Chest
  static Syndicate = 60;

  static Cenotaph = 126;

  static Symbol = 5;
  static Nop = 127;

  static take(tag: number, fields: Map<number, string>) {
    return fields.get(tag);
  }

  static encode(tag: number, value: bigint, payload: number[][]) {
    payload.push(varIntEncode(BigInt(tag)));
    if (value > 0n) {
      payload.push(varIntEncode(value));
    } else {
      payload.push([0]);
    }
  }
}

export class Flag {
  static Commitment = 0;
  static Sealing = 1;
  static Deployment = 2;
  static MintTerms = 3;
  static Swap = 4;
  static SwapExactInput = 5;
  static Summoning = 6;
  static Gated = 7;
  static LockSubsidy = 8;
  static Reveal = 9;
  static Turbo = 10;

  static Cenotaph = 127;

  static mask(flag: number) {
    return BigInt(1) << BigInt(flag);
  }

  static take(flag: number, flags: bigint) {
    const mask = Flag.mask(flag);
    const set = (flags & mask) !== 0n;
    flags &= ~mask;
    return set;
  }

  static set(flag: number, flags: bigint) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    flags |= Flag.mask(flag);
  }
}

export class PushBytes {
  bytes: Buffer;

  constructor(bytes: number[]) {
    this.bytes = Buffer.from(bytes);
  }

  static fromSliceUnchecked(bytes: number[]) {
    return new PushBytes(bytes);
  }

  static fromMutSliceUnchecked(bytes: number[]) {
    return new PushBytes(bytes);
  }

  static empty() {
    return new PushBytes([]);
  }

  asBytes() {
    return this.bytes;
  }

  asMutBytes() {
    return this.bytes;
  }
}
