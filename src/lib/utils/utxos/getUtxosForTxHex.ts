import dogecore from "bitcore-lib-doge";
import { UTXO } from "../../types";
const { Transaction } = dogecore;

export const getUtxosForTxHex = ({
  txHex,
}: {
  txHex: string;
}): { utxos: UTXO[] } => {
  const tx = new Transaction(txHex);

  // map the outputs to UTXOs
  const utxos: UTXO[] = tx.outputs.map((output, index) => ({
    txid: tx.id,
    vout: index,
    value: output.satoshis,
    status: {
      confirmed: false,
      block_height: 0,
      block_hash: "",
      block_time: 0,
      confirmed_by_ord: false,
    },
  }));

  return { utxos };
};
