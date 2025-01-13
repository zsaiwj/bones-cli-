import * as btc from "@scure/btc-signer";
import { secp256k1 } from "@noble/curves/secp256k1";
import { Script } from "bitcore-lib";
import { hex } from "@scure/base";
import { P2Ret } from "@scure/btc-signer/payment";
import { UTXO } from "../types";

export const getDogeSpender = (
  hdPrivateKey: Uint8Array,
  network: typeof btc.NETWORK,
) => btc.p2pkh(secp256k1.getPublicKey(hdPrivateKey!, true), network);

export function getOpReturnScript(data: Uint8Array = new Uint8Array()): Script {
  const script = new Script("");

  script.add("OP_RETURN");

  if (data.length > 0) {
    script.add(data);
  }

  return script;
}

export const utxo2InputDoge = (spender: P2Ret) => (utxo: UTXO) => ({
  ...spender,
  txid: hex.decode(utxo.txid),
  index: utxo.vout,
  witnessUtxo: {
    script: spender.script,
    amount: BigInt(utxo.value),
  },
});
