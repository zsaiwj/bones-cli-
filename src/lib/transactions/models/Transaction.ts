import * as btc from "@scure/btc-signer";
import {
  BaseTransactionParams,
  SealingTransactionParams,
  DeployTransactionParams,
  TransactionState,
  BaseTransactionSerialized,
  DeployTransactionSerialized,
  SealingTransactionSerialized,
  MintTransactionParams,
  MintTransactionSerialized,
  SwapTransactionParams,
  SwapTransactionSerialized,
  RelicTransferTransactionSerialized,
  RelicTransferTransactionParams,
  BtcTransferTransactionParams,
  BtcTransferTransactionSerialized,
  BoneStoneUnwrapTransactionSerialized,
  BoneStoneUnwrapTransactionParams,
} from "../types";
import { hex } from "@scure/base";
import { BASE_TICKER } from "../../constants";

export abstract class BaseTransaction {
  tx: btc.Transaction;
  state: TransactionState;
  createdAt: number;

  constructor({ tx, state = TransactionState.Created }: BaseTransactionParams) {
    this.tx = tx;
    this.state = state;
    this.createdAt = Date.now();
  }

  get id(): string {
    return this.tx.id;
  }

  get hex(): string {
    return this.tx.hex;
  }

  updateState(newState: TransactionState) {
    this.state = newState;
  }

  serialize(): BaseTransactionSerialized {
    return {
      id: this.id,
      tx: this.tx.hex,
      state: this.state,
      createdAt: this.createdAt,
    };
  }

  static deserializeBase(
    data: BaseTransactionSerialized,
  ): BaseTransactionParams {
    return {
      tx: btc.Transaction.fromRaw(hex.decode(data.tx), {
        allowUnknownInputs: true,
        allowUnknownOutputs: true,
      }),
      state: data.state,
    };
  }
}

export class SealingTransaction extends BaseTransaction {
  public tick: string;

  constructor({ tx, state, tick }: SealingTransactionParams) {
    super({ tx, state });
    this.tick = tick;
  }

  serialize(): SealingTransactionSerialized {
    return {
      type: "sealing",
      ...super.serialize(),
      tick: this.tick,
    };
  }

  static deserialize(data: SealingTransactionSerialized): SealingTransaction {
    const baseParams = BaseTransaction.deserializeBase(data);
    return new SealingTransaction({
      transactionType: "sealing",
      ...baseParams,
      tick: data.tick,
    });
  }
}

export class DeployTransaction extends BaseTransaction {
  public tick: string;
  public symbol: string;
  public totalSupply: bigint;
  public amountPerMint: bigint;
  public priceInRelic: bigint;
  public liquidityShare: number;

  constructor({
    tx,
    state,
    symbol,
    totalSupply,
    amountPerMint,
    priceInRelic,
    liquidityShare,
    tick,
  }: DeployTransactionParams) {
    super({ tx, state });
    this.symbol = symbol;
    this.totalSupply = totalSupply;
    this.amountPerMint = amountPerMint;
    this.priceInRelic = priceInRelic;
    this.liquidityShare = liquidityShare;
    this.tick = tick;
  }

  serialize(): DeployTransactionSerialized {
    return {
      type: "deploy",
      ...super.serialize(),
      symbol: this.symbol,
      totalSupply: this.totalSupply.toString(),
      amountPerMint: this.amountPerMint.toString(),
      priceInRelic: this.priceInRelic.toString(),
      liquidityShare: this.liquidityShare,
      tick: this.tick,
    };
  }

  static deserialize(data: DeployTransactionSerialized): DeployTransaction {
    const baseParams = BaseTransaction.deserializeBase(data);
    return new DeployTransaction({
      transactionType: "deploy",
      ...baseParams,
      symbol: data.symbol,
      totalSupply: BigInt(data.totalSupply),
      amountPerMint: BigInt(data.amountPerMint),
      priceInRelic: BigInt(data.priceInRelic),
      liquidityShare: data.liquidityShare,
      tick: data.tick,
    });
  }
}

export class MintTransaction extends BaseTransaction {
  public tick: string;
  public amount: bigint;

  constructor({ tx, state, tick, amount }: MintTransactionParams) {
    super({ tx, state });
    this.tick = tick;
    this.amount = amount;
  }

  serialize(): MintTransactionSerialized {
    return {
      type: "mint",
      ...super.serialize(),
      tick: this.tick,
      amount: this.amount.toString(),
    };
  }

  static deserialize(data: MintTransactionSerialized): MintTransaction {
    const baseParams = BaseTransaction.deserializeBase(data);
    return new MintTransaction({
      transactionType: "mint",
      ...baseParams,
      tick: data.tick,
      amount: BigInt(data.amount),
    });
  }
}

export class SwapTransaction extends BaseTransaction {
  public inputTick: string;
  public outputTick: string;
  public inputAmount: bigint;
  public outputAmount: bigint;
  public isExactInput: boolean;

  constructor({
    tx,
    state,
    inputTick,
    outputTick,
    inputAmount,
    outputAmount,
    isExactInput,
  }: SwapTransactionParams) {
    super({ tx, state });
    this.inputTick = inputTick;
    this.outputTick = outputTick;
    this.inputAmount = inputAmount;
    this.outputAmount = outputAmount;
    this.isExactInput = isExactInput;
  }

  public get isSellOrder(): boolean {
    return this.outputTick === BASE_TICKER;
  }

  serialize(): SwapTransactionSerialized {
    return {
      type: "swap",
      ...super.serialize(),
      inputTick: this.inputTick,
      outputTick: this.outputTick,
      inputAmount: this.inputAmount.toString(),
      outputAmount: this.outputAmount.toString(),
      isExactInput: this.isExactInput,
    };
  }

  static deserialize(data: SwapTransactionSerialized): SwapTransaction {
    const baseParams = BaseTransaction.deserializeBase(data);
    return new SwapTransaction({
      transactionType: "swap",
      ...baseParams,
      inputTick: data.inputTick,
      outputTick: data.outputTick,
      inputAmount: BigInt(data.inputAmount),
      outputAmount: BigInt(data.outputAmount),
      isExactInput: data.isExactInput,
    });
  }
}
import {
  RelicBuyTransactionParams,
  RelicBuyTransactionSerialized,
} from "../types";

export class RelicBuyTransaction extends BaseTransaction {
  public from: string;
  public tick: string;
  public amount: bigint;
  public price: bigint;

  constructor({
    tx,
    state,
    from,
    tick,
    amount,
    price,
  }: RelicBuyTransactionParams) {
    super({ tx, state });
    this.from = from;
    this.tick = tick;
    this.amount = amount;
    this.price = price;
  }

  serialize(): RelicBuyTransactionSerialized {
    return {
      type: "relicBuy",
      ...super.serialize(),
      from: this.from,
      tick: this.tick,
      amount: this.amount.toString(),
      price: this.price.toString(),
    };
  }

  static deserialize(data: RelicBuyTransactionSerialized): RelicBuyTransaction {
    const baseParams = BaseTransaction.deserializeBase(data);
    return new RelicBuyTransaction({
      transactionType: "relicBuy",
      ...baseParams,
      from: data.from,
      tick: data.tick,
      amount: BigInt(data.amount),
      price: BigInt(data.price),
    });
  }
}

import {
  SealingBuyTransactionParams,
  SealingBuyTransactionSerialized,
} from "../types";

export class SealingBuyTransaction extends BaseTransaction {
  public from: string;
  public tick: string;
  public price: bigint;

  constructor({ tx, state, from, tick, price }: SealingBuyTransactionParams) {
    super({ tx, state });
    this.from = from;
    this.tick = tick;
    this.price = price;
  }

  serialize(): SealingBuyTransactionSerialized {
    return {
      type: "sealingBuy",
      ...super.serialize(),
      from: this.from,
      tick: this.tick,
      price: this.price.toString(),
    };
  }

  static deserialize(
    data: SealingBuyTransactionSerialized,
  ): SealingBuyTransaction {
    const baseParams = BaseTransaction.deserializeBase(data);
    return new SealingBuyTransaction({
      transactionType: "sealingBuy",
      ...baseParams,
      from: data.from,
      tick: data.tick,
      price: BigInt(data.price),
    });
  }
}

export class RelicTransferTransaction extends BaseTransaction {
  public ticker: string;
  public receiver: string;
  public amount: bigint;

  constructor({
    tx,
    state,
    ticker,
    receiver,
    amount,
  }: RelicTransferTransactionParams) {
    super({ tx, state });
    this.ticker = ticker;
    this.receiver = receiver;
    this.amount = amount;
  }

  serialize(): RelicTransferTransactionSerialized {
    return {
      type: "relicTransfer",
      ...super.serialize(),
      ticker: this.ticker,
      receiver: this.receiver,
      amount: this.amount.toString(),
    };
  }

  static deserialize(
    data: RelicTransferTransactionSerialized,
  ): RelicTransferTransaction {
    const baseParams = BaseTransaction.deserializeBase(data);
    return new RelicTransferTransaction({
      transactionType: "relicTransfer",
      ...baseParams,
      ticker: data.ticker,
      receiver: data.receiver,
      amount: BigInt(data.amount),
    });
  }
}

export class BonestoneUnwrapTransaction extends BaseTransaction {
  public receiver: string;
  public amount: bigint;

  constructor({
    tx,
    state,
    receiver,
    amount,
  }: BoneStoneUnwrapTransactionParams) {
    super({ tx, state });
    this.receiver = receiver;
    this.amount = amount;
  }

  serialize(): BoneStoneUnwrapTransactionSerialized {
    return {
      type: "boneStoneUnwrap",
      ...super.serialize(),
      receiver: this.receiver,
      amount: this.amount.toString(),
    };
  }

  static deserialize(
    data: BoneStoneUnwrapTransactionSerialized,
  ): BonestoneUnwrapTransaction {
    const baseParams = BaseTransaction.deserializeBase(data);
    return new BonestoneUnwrapTransaction({
      transactionType: "boneStoneUnwrap",
      ...baseParams,
      receiver: data.receiver,
      amount: BigInt(data.amount),
    });
  }
}

export class BtcTransferTransaction extends BaseTransaction {
  public receiver: string;
  public amount: bigint;

  constructor({ tx, state, receiver, amount }: BtcTransferTransactionParams) {
    super({ tx, state });
    this.receiver = receiver;
    this.amount = amount;
  }

  serialize(): BtcTransferTransactionSerialized {
    return {
      type: "btcTransfer",
      ...super.serialize(),
      receiver: this.receiver,
      amount: this.amount.toString(),
    };
  }

  static deserialize(
    data: BtcTransferTransactionSerialized,
  ): BtcTransferTransaction {
    const baseParams = BaseTransaction.deserializeBase(data);
    return new BtcTransferTransaction({
      transactionType: "btcTransfer",
      ...baseParams,
      receiver: data.receiver,
      amount: BigInt(data.amount),
    });
  }
}
