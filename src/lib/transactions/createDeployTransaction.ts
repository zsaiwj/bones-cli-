import * as btc from "@scure/btc-signer";

import { hex } from "@scure/base";
import { getDogeSpender, utxo2InputDoge } from "./utils";
import { EnhancedUTXO, MintTerms, UTXO } from "../types";
import { getDeployScript } from "../protocolMessages/deploy";
import { Output } from "./types";
import { BITCOINJSLIB_NETWORK, INSCRIPTION_TARGET_SIZE } from "../constants";
import { getDelegateP2sh, getDelegateRevealTx } from "./delegateInscriptions";

export type BoneDeployParams = {
  symbol: string;
  seed: bigint;
  subsidy: bigint;
  mintTerms: MintTerms;
  turbo: boolean;
};

const { NETWORK } = btc;

export const createDeployTransaction = ({
  boneDeployParams,
  fundingUtxos,
  sealingUtxo,
  hdPrivateKey,
  network,
  feePerByte,
  delegateInscription,
}: {
  boneDeployParams: BoneDeployParams;
  fundingUtxos: UTXO[];
  sealingUtxo: EnhancedUTXO;
  hdPrivateKey: Uint8Array;
  network: typeof NETWORK;
  feePerByte: bigint;
  delegateInscription: string;
}) => {
  const spender = getDogeSpender(hdPrivateKey, network);

  const res = getDelegateP2sh({
    privKey: btc.WIF(BITCOINJSLIB_NETWORK).encode(hdPrivateKey),
    delegate_inscription_tx: delegateInscription.replace(/i0$/, ""),
  });

  const { p2sh } = res;
  const commitOutputs: Output[] = [
    // the output for the funding of the reveal tx and carrying the sealing inscription
    {
      script: hex.decode(p2sh.toHex()),
      amount: BigInt(INSCRIPTION_TARGET_SIZE + 4_271_000),
    },
    // carrying the revealed delegate inscription
    {
      script: hex.decode(p2sh.toHex()),
      amount: BigInt(INSCRIPTION_TARGET_SIZE),
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
      requiredInputs: [sealingUtxo].map(utxo2InputDoge(spender)),
      allowLegacyWitnessUtxo: true,
    },
  );

  if (!commitTxEstimation?.inputs)
    throw new Error("Failed to estimate commit transaction");

  if (!commitTxEstimation.tx)
    throw new Error("Failed to create commit transaction");

  commitTxEstimation.tx.sign(hdPrivateKey);
  commitTxEstimation.tx.finalize();

  const { symbol, seed, subsidy, mintTerms, turbo } = boneDeployParams;
  const deployScript = getDeployScript(symbol, seed, subsidy, mintTerms, turbo);

  const revealOutputs: Output[] = [
    // output carrying the delegate inscription
    {
      address: spender.address!,
      amount: BigInt(INSCRIPTION_TARGET_SIZE),
    },
    // output carrying the sealing inscription
    {
      address: spender.address!,
      amount: BigInt(INSCRIPTION_TARGET_SIZE),
    },
    // output carrying the sealing script
    {
      script: hex.decode(deployScript.toHex()),
      amount: 0n,
    },
  ];

  const { revealTx } = getDelegateRevealTx({
    privKey: btc.WIF(BITCOINJSLIB_NETWORK).encode(hdPrivateKey),
    feePerByte,
    commitTxId: commitTxEstimation.tx.id,
    valuesOfOutputsToSpend: [
      Number(commitTxEstimation.tx.getOutput(1).amount!),
      Number(commitTxEstimation.tx.getOutput(0).amount!),
    ],
    indexesOfOutputsToSpend: [1, 0],
    revealTxOutputs: revealOutputs,
    delegate_inscription_tx: delegateInscription.replace(/i0$/, ""),
  });

  return {
    commitTx: commitTxEstimation.tx,
    revealTx: revealTx,
  };
};
