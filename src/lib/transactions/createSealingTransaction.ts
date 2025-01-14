import { hex } from "@scure/base";
import * as btc from "@scure/btc-signer";
import { NETWORK } from "@scure/btc-signer";

import { Output } from "./types";
import { getDogeSpender, utxo2InputDoge } from "./utils";
import { getP2sh, getRevealTx } from "./inscriptions";
import {
  BITCOINJSLIB_NETWORK,
  BONES_UTXO_TARGET_SIZE,
  INSCRIPTION_TARGET_SIZE,
} from "../constants";
import { EnhancedUTXO, Keepsake, UTXO } from "../types";
import { createScript } from "../protocolMessages/keepsake";

export const createSealingTransactions = ({
  ticker,
  fundingUtxos,
  boneUtxos,
  hdPrivateKey,
  network,
  feePerByte,
}: {
  ticker: string;
  fundingUtxos: UTXO[];
  boneUtxos: EnhancedUTXO[];
  hdPrivateKey: Uint8Array;
  network: typeof NETWORK;
  feePerByte: bigint;
}) => {
  const spender = getDogeSpender(hdPrivateKey, network);

  const res = getP2sh({
    privKey: btc.WIF(BITCOINJSLIB_NETWORK).encode(hdPrivateKey),
    text: ticker,
  });
  const { p2sh } = res;
  const commitOutputs: Output[] = [
    {
      script: hex.decode(p2sh.toHex()),
      amount: BigInt(
        BONES_UTXO_TARGET_SIZE + INSCRIPTION_TARGET_SIZE + 4_271_000,
      ),
    },
  ];

  const commitTxEstimation = btc.selectUTXO(
    fundingUtxos.map(utxo2InputDoge(spender)),
    commitOutputs,
    "default",
    {
      changeAddress: spender.address!,
      feePerByte,
      bip69: false,
      createTx: true,
      network,
      requiredInputs: boneUtxos.map(utxo2InputDoge(spender)),
      allowLegacyWitnessUtxo: true,
    },
  );

  if (!commitTxEstimation?.inputs)
    throw new Error("Failed to estimate commit transaction");

  if (!commitTxEstimation.tx)
    throw new Error("Failed to create commit transaction");

  commitTxEstimation.tx.sign(hdPrivateKey);
  commitTxEstimation.tx.finalize();

  const keepsake: Keepsake = {
    sealing: true,
    pointer: 1, // we assign all non-assigned bones to the first output
  };
  const sealingScript = createScript(keepsake);

  const revealOutputs: Output[] = [
    // output for the bones change
    {
      address: spender.address!,
      amount: BigInt(INSCRIPTION_TARGET_SIZE),
    },
    // output carrying the inscription
    {
      address: spender.address!,
      amount: BigInt(BONES_UTXO_TARGET_SIZE),
    },
    // output carrying the sealing script
    {
      script: hex.decode(sealingScript.toHex()),
      amount: 0n,
    },
  ];

  const { revealTx } = getRevealTx({
    privKey: btc.WIF(BITCOINJSLIB_NETWORK).encode(hdPrivateKey),
    text: ticker,
    feePerByte,
    commitTxId: commitTxEstimation.tx.id,
    valueOfOutputToSpend: Number(
      commitTxEstimation.tx.getOutput(0).amount!,
    ) as number,
    revealTxOutputs: revealOutputs,
    changeReceiver: spender.address!,
  });

  return {
    commitTx: commitTxEstimation.tx,
    revealTx: revealTx,
  };
};
