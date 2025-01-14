import * as btc from "@scure/btc-signer";
import { getUtxosForTxHex } from "./getUtxosForTxHex";
import { hex } from "@scure/base";
import { UTXO } from "../../types";

type Args = {
  tx: btc.Transaction;
  fundingUtxos: UTXO[];
};

type Return = {
  unusedFundingUtxos: UTXO[];
  txOutputs: UTXO[];
};

export const getFundingUtxosAfterTx = ({ tx, fundingUtxos }: Args): Return => {
  const inputUtxoIds = new Set<string>();

  for (let i = 0; i < tx.inputsLength; i++) {
    const input = tx.getInput(i);
    inputUtxoIds.add(`${hex.encode(input.txid!)}:${input.index}`);
  }

  const { utxos: txOutputs } = getUtxosForTxHex({
    txHex: tx.hex,
  });

  return {
    unusedFundingUtxos: fundingUtxos.filter((utxo) => {
      return !inputUtxoIds.has(`${utxo.txid}:${utxo.vout}`);
    }),
    txOutputs,
  };
};
