import * as btc from "@scure/btc-signer";
import { hex } from "@scure/base";
import { BoneId, EnhancedUTXO, UTXO } from "../types";
import { getDogeSpender, utxo2InputDoge } from "./utils";
import { getTransferScript } from "../protocolMessages/transfers";
import { Output } from "./types";
import { BONES_UTXO_TARGET_SIZE } from "../constants";

export const createBoneTransferTransaction = ({
  boneId,
  amount,
  receiver,
  fundingUtxos,
  boneUtxos,
  hdPrivateKey,
  network,
  feePerByte,
}: {
  boneId: BoneId;
  amount: bigint;
  receiver: string;
  fundingUtxos: UTXO[];
  boneUtxos: EnhancedUTXO[];
  hdPrivateKey: Uint8Array;
  network: typeof btc.NETWORK;
  feePerByte: bigint;
}): btc.Transaction => {
  const spender = getDogeSpender(hdPrivateKey, network);

  const transferScript = getTransferScript([boneId], [amount], [2]);

  /**
   * output with protocol message
   * output to spender
   * output to transfer receiver
   * change output
   */

  const transferOutputs: Output[] = [
    {
      script: hex.decode(transferScript.toHex()),
      amount: 0n,
    },
    {
      address: spender.address!,
      amount: BigInt(BONES_UTXO_TARGET_SIZE),
    },
    {
      address: receiver,
      amount: BigInt(BONES_UTXO_TARGET_SIZE),
    },
  ];

  const transferTxEstimation = btc.selectUTXO(
    fundingUtxos.map(utxo2InputDoge(spender)),
    transferOutputs,
    "default",
    {
      changeAddress: spender.address!,
      feePerByte,
      network,
      bip69: false,
      createTx: true,
      allowUnknownOutputs: true,
      requiredInputs: boneUtxos.map(utxo2InputDoge(spender)),
      allowLegacyWitnessUtxo: true,
    },
  );

  if (!transferTxEstimation?.inputs)
    throw new Error("Failed to estimate transfer transaction");

  if (!transferTxEstimation.tx) throw new Error("Failed to create transaction");

  transferTxEstimation.tx.sign(hdPrivateKey);
  transferTxEstimation.tx.finalize();

  return transferTxEstimation.tx;
};
