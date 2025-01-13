import {
  BaseTransaction,
  SealingTransaction,
  DeployTransaction,
  MintTransaction,
  SwapTransaction,
  RelicBuyTransaction,
  SealingBuyTransaction,
  RelicTransferTransaction,
  BtcTransferTransaction,
  BonestoneUnwrapTransaction,
} from "../models/Transaction";
import { TransactionFactoryParams } from "../types";

export class TransactionFactory {
  static createTransaction(params: TransactionFactoryParams): BaseTransaction {
    switch (params.transactionType) {
      case "sealing":
        return new SealingTransaction({
          transactionType: params.transactionType,
          tx: params.tx,
          state: params.state,
          tick: params.tick,
        });
      case "deploy":
        return new DeployTransaction({
          transactionType: params.transactionType,
          tx: params.tx,
          state: params.state,
          symbol: params.symbol,
          totalSupply: params.totalSupply,
          amountPerMint: params.amountPerMint,
          priceInRelic: params.priceInRelic,
          liquidityShare: params.liquidityShare,
          tick: params.tick,
        });
      case "mint":
        return new MintTransaction({
          transactionType: params.transactionType,
          tx: params.tx,
          state: params.state,
          tick: params.tick,
          amount: params.amount,
        });
      case "swap":
        return new SwapTransaction({
          transactionType: params.transactionType,
          tx: params.tx,
          state: params.state,
          inputTick: params.inputTick,
          outputTick: params.outputTick,
          inputAmount: params.inputAmount,
          outputAmount: params.outputAmount,
          isExactInput: params.isExactInput,
        });
      case "relicBuy":
        return new RelicBuyTransaction({
          transactionType: params.transactionType,
          tx: params.tx,
          state: params.state,
          from: params.from,
          tick: params.tick,
          amount: params.amount,
          price: params.price,
        });
      case "sealingBuy":
        return new SealingBuyTransaction({
          transactionType: params.transactionType,
          tx: params.tx,
          state: params.state,
          from: params.from,
          tick: params.tick,
          price: params.price,
        });
      case "relicTransfer":
        return new RelicTransferTransaction({
          transactionType: params.transactionType,
          tx: params.tx,
          state: params.state,
          ticker: params.ticker,
          receiver: params.receiver,
          amount: params.amount,
        });
      case "btcTransfer":
        return new BtcTransferTransaction({
          transactionType: params.transactionType,
          tx: params.tx,
          state: params.state,
          receiver: params.receiver,
          amount: params.amount,
        });
      case "boneStoneUnwrap":
        return new BonestoneUnwrapTransaction({
          transactionType: params.transactionType,
          tx: params.tx,
          state: params.state,
          receiver: params.receiver,
          amount: params.amount,
        });
      default:
        throw new Error("Invalid transaction type");
    }
  }
}
