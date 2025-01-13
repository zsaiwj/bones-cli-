import * as btc from "@scure/btc-signer";
import { EnhancedUTXO, UTXO } from "../types";
import { Output } from "./types";
import { getOpReturnScript, utxo2InputDoge } from "./utils";
import { hex } from "@scure/base";
import { secp256k1 } from "@noble/curves/secp256k1";
import { BONES_UTXO_TARGET_SIZE } from "../constants";

type Args = {
  utxosToBurn: EnhancedUTXO[];
  fundingUtxos: UTXO[];
  hdPrivateKey: Uint8Array;
  network: typeof btc.NETWORK;
  feePerByte: bigint;
};

export const createBonestoneUnwrap = ({
  utxosToBurn,
  fundingUtxos,
  hdPrivateKey,
  network,
  feePerByte,
}: Args): btc.Transaction => {
  const spender = btc.p2pkh(
    secp256k1.getPublicKey(hdPrivateKey!, true),
    network,
  );

  const opReturnScript = getOpReturnScript();

  console.log("utxosToBurn", utxosToBurn);

  const outputs: Output[] = [
    {
      script: hex.decode(opReturnScript.toHex()),
      amount: BigInt(utxosToBurn.reduce((acc, utxo) => acc + utxo.value, 0)),
    },
    { address: spender.address!, amount: BigInt(BONES_UTXO_TARGET_SIZE) },
  ];

  const superStoneEstimation = btc.selectUTXO(
    [...fundingUtxos.map(utxo2InputDoge(spender))],
    outputs,
    "default",
    {
      changeAddress: spender.address!,
      feePerByte,
      network,
      bip69: false,
      createTx: true,
      allowUnknownOutputs: true,
      allowLegacyWitnessUtxo: true,
      requiredInputs: utxosToBurn.map(utxo2InputDoge(spender)),
    },
  );

  if (!superStoneEstimation?.inputs)
    throw new Error("Failed to estimate relic swap transaction");

  if (!superStoneEstimation.change)
    throw new Error("Failed to create relic swap transaction");

  if (!superStoneEstimation.tx)
    throw new Error("Failed to create relic swap transaction");

  superStoneEstimation.tx.sign(hdPrivateKey);
  superStoneEstimation.tx.finalize();

  return superStoneEstimation.tx;
};
