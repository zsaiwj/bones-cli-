import * as btc from "@scure/btc-signer";

export type Input = {
  txid: string;
  index: number;
  witnessUtxo: { script: Uint8Array; amount: bigint };
  type: string;
};

export type Output =
  | { address: string; amount: bigint }
  | { script: Uint8Array; amount: bigint };

export enum TransactionState {
  Created = "created",
  Submitted = "submitted",
  Pending = "pending",
  Confirmed = "confirmed",
}

export interface BaseTransactionParams {
  tx: btc.Transaction;
  state?: TransactionState;
  createdAt?: number;
}

export interface BaseTransactionSerialized {
  id: string;
  tx: string; // Hex
  state: TransactionState;
  createdAt: number;
}

// Shared interface for all transaction types
export interface SealingTransactionParams extends BaseTransactionParams {
  transactionType: "sealing";
  tick: string;
}

export interface SealingTransactionSerialized
  extends BaseTransactionSerialized {
  type: "sealing";
  tick: string;
}

export interface DeployTransactionParams extends BaseTransactionParams {
  transactionType: "deploy";
  symbol: string;
  totalSupply: bigint;
  amountPerMint: bigint;
  priceInRelic: bigint;
  liquidityShare: number;
  tick: string;
}

export interface DeployTransactionSerialized extends BaseTransactionSerialized {
  type: "deploy";
  symbol: string;
  totalSupply: string;
  amountPerMint: string;
  priceInRelic: string;
  liquidityShare: number;
  tick: string;
}

export interface MintTransactionSerialized extends BaseTransactionSerialized {
  type: "mint";
  amount: string;
  tick: string;
}

export interface MintTransactionParams extends BaseTransactionParams {
  transactionType: "mint";
  amount: bigint;
  tick: string;
}

export interface SwapTransactionParams extends BaseTransactionParams {
  transactionType: "swap";
  inputTick: string;
  outputTick: string;
  inputAmount: bigint;
  outputAmount: bigint;
  isExactInput: boolean;
}

export interface SwapTransactionSerialized extends BaseTransactionSerialized {
  type: "swap";
  inputTick: string;
  outputTick: string;
  inputAmount: string;
  outputAmount: string;
  isExactInput: boolean;
}

// NEW: RelicBuyTransaction types
export interface RelicBuyTransactionParams extends BaseTransactionParams {
  transactionType: "relicBuy";
  from: string;
  tick: string;
  amount: bigint;
  price: bigint;
}

export interface RelicBuyTransactionSerialized
  extends BaseTransactionSerialized {
  type: "relicBuy";
  from: string;
  tick: string;
  amount: string;
  price: string;
}

// NEW: SealingBuyTransaction types
export interface SealingBuyTransactionParams extends BaseTransactionParams {
  transactionType: "sealingBuy";
  from: string;
  tick: string;
  price: bigint;
}

export interface SealingBuyTransactionSerialized
  extends BaseTransactionSerialized {
  type: "sealingBuy";
  from: string;
  tick: string;
  price: string;
}

// Union type combining all transaction types
export type TransactionFactoryParams =
  | SealingTransactionParams
  | DeployTransactionParams
  | MintTransactionParams
  | SwapTransactionParams
  | RelicBuyTransactionParams
  | SealingBuyTransactionParams
  | RelicTransferTransactionParams
  | BtcTransferTransactionParams
  | BoneStoneUnwrapTransactionParams;

export interface RelicTransferTransactionParams extends BaseTransactionParams {
  transactionType: "relicTransfer";
  ticker: string;
  receiver: string;
  amount: bigint;
}

export interface RelicTransferTransactionSerialized
  extends BaseTransactionSerialized {
  type: "relicTransfer";
  ticker: string;
  receiver: string;
  amount: string;
}

export interface BtcTransferTransactionParams extends BaseTransactionParams {
  transactionType: "btcTransfer";
  receiver: string;
  amount: bigint;
}

export interface BtcTransferTransactionSerialized
  extends BaseTransactionSerialized {
  type: "btcTransfer";
  receiver: string;
  amount: string;
}

export interface BoneStoneUnwrapTransactionParams
  extends BaseTransactionParams {
  transactionType: "boneStoneUnwrap";
  receiver: string;
  amount: bigint;
}

export interface BoneStoneUnwrapTransactionSerialized
  extends BaseTransactionSerialized {
  type: "boneStoneUnwrap";
  receiver: string;
  amount: string;
}
