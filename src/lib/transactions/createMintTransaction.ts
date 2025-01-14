import { BoneId, EnhancedUTXO, UTXO } from "../types";
import { NETWORK } from "@scure/btc-signer";
import * as btc from "@scure/btc-signer";
import { Output } from "./types";
import { createTransferKeepsake } from "../protocolMessages/transfers";
import { hex } from "@scure/base";
import { getDogeSpender, utxo2InputDoge } from "./utils";
import { createScript } from "../protocolMessages/keepsake";
import { BONES_UTXO_TARGET_SIZE } from "../constants";
import { getFundingUtxosAfterTx } from "../utils/utxos/getFundingUtxosAfterTransaction";

const BASE_COLLECTOR_OUTPUT_INDEX = 1;
const MINT_COLLECTOR_OUTPUT_INDEX = 2;

export type BoneMintParams = {
  boneId: BoneId;
};

export const createMintTransactions = ({
  boneMintParams,
  numOfMints,
  fundingUtxos,
  boneUtxos,
  hdPrivateKey,
  network,
  feePerByte,
}: {
  boneMintParams: BoneMintParams;
  numOfMints: number;
  fundingUtxos: UTXO[];
  boneUtxos: EnhancedUTXO[];
  hdPrivateKey: Uint8Array;
  network: typeof NETWORK;
  feePerByte: bigint;
}): btc.Transaction[] => {
  const spender = getDogeSpender(hdPrivateKey, network);

  let fundingUtxosCache = fundingUtxos;
  let boneUtxosCache: UTXO[] = boneUtxos;

  const mintTxs: btc.Transaction[] = [];

  for (let i = 0; i < numOfMints; i++) {
    const keepsake = createTransferKeepsake(
      [boneMintParams.boneId],
      [BigInt(0)],
      [2],
    );
    keepsake.mint = boneMintParams.boneId;
    const script = createScript(keepsake);

    const mintOutputs: Output[] = [
      {
        script: hex.decode(script.toHex()),
        amount: 0n,
      },
    ];

    // collector for the base bones. @todo: this is not always necesarry (free mint)
    mintOutputs[MINT_COLLECTOR_OUTPUT_INDEX] = {
      address: spender.address!,
      amount: BigInt(BONES_UTXO_TARGET_SIZE),
    };

    mintOutputs[BASE_COLLECTOR_OUTPUT_INDEX] = {
      address: spender.address!,
      amount: BigInt(BONES_UTXO_TARGET_SIZE),
    };

    const mintTxEstimation = btc.selectUTXO(
      fundingUtxosCache.map(utxo2InputDoge(spender)),
      mintOutputs,
      "default",
      {
        changeAddress: spender.address!,
        feePerByte,
        network,
        bip69: false,
        createTx: true,
        allowUnknownOutputs: true,
        requiredInputs: boneUtxosCache.map(utxo2InputDoge(spender)),
        allowLegacyWitnessUtxo: true,
      },
    );

    if (!mintTxEstimation?.inputs)
      throw new Error("Insufficient funds in funding UTXOs");

    const mintTx = mintTxEstimation.tx;

    const change = mintTxEstimation.change;
    if (!mintTx) throw new Error("Failed to create mint transaction");

    mintTx.sign(hdPrivateKey);
    mintTx.finalize();

    // we set the 2 caches
    const { unusedFundingUtxos, txOutputs } = getFundingUtxosAfterTx({
      tx: mintTx,
      fundingUtxos: fundingUtxosCache,
    });

    if (change) {
      fundingUtxosCache = [
        ...unusedFundingUtxos,
        txOutputs[txOutputs.length - 1],
      ];
    } else {
      fundingUtxosCache = unusedFundingUtxos;
    }
    boneUtxosCache = [txOutputs[BASE_COLLECTOR_OUTPUT_INDEX]];

    mintTxs.push(mintTx);
  }
  return mintTxs;
};
