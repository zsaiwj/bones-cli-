import { fetchAddressTransactions } from "./lib/fetchAddressTransactions";
import { fetchOutputs } from "./lib/fetchOutputs";
import { EnhancedUTXO, UTXO } from "./lib/types";
import * as btc from "@scure/btc-signer";
import { createBonestoneUnwrap } from "./lib/transactions/createBonestoneUnwrap";

interface Stone {
  inscriptionId: string;
  output: string;
  value: number;
}

export const listStones = async (address: string) => {
  const allTxs = [];
  const seenTxids = new Set<string>();
  let afterTxid: string | null = null;

  // Fetch all transactions related to the address (mempool + chain) with pagination
  while (true) {
    const page = await fetchAddressTransactions(address, afterTxid);

    if (page.length === 0) {
      break; // No more transactions
    }

    const chainTxs = page.filter((tx) => tx.status.confirmed === true);
    const mempoolTxs = page.filter((tx) => tx.status.confirmed === false);

    for (const tx of [...mempoolTxs, ...chainTxs]) {
      if (!seenTxids.has(tx.txid)) {
        seenTxids.add(tx.txid);
        allTxs.push(tx);
      }
    }

    if (chainTxs.length === 0) {
      break; // No more chain transactions means we've reached the end
    }

    const lastChainTx = chainTxs[chainTxs.length - 1];
    afterTxid = lastChainTx.txid;
  }

  console.log(`Found ${allTxs.length} transactions for address ${address}`);

  // Identify spent outputs: these are referenced by the vin of subsequent transactions
  const spentOutpoints = new Set<string>();
  for (const tx of allTxs) {
    for (const input of tx.vin) {
      const spentOutpoint = `${input.txid}:${input.vout}`;
      spentOutpoints.add(spentOutpoint);
    }
  }

  // Extract all output IDs from fetched transactions
  const outputIds = allTxs.flatMap((tx) =>
    tx.vout.map((_: any, index: number) => `${tx.txid}:${index}`),
  );

  if (outputIds.length === 0) {
    console.log("No outputs found for these transactions.");
    return [];
  }

  // Fetch detailed outputs (inscriptions, relics, etc.)
  const outputs = await fetchOutputs(outputIds);
  console.log(`Fetched details for ${outputs.length} outputs.`);

  // Criteria for inscriptions
  const delegateToMatch =
    "babc46e7095a90c814d4c161b1d9d47f921c566ea93ad483d78741cc27c07debi0";
  const maxHeight = 5444000;
  const stones: Stone[] = [];

  for (const out of outputs) {
    // Exclude outputs that are already spent
    if (spentOutpoints.has(out.output)) {
      continue;
    }

    // Exclude OP_RETURN outputs since they can't be spent again (stone is lost)
    // The script_pubkey often contains "OP_RETURN" if it's an OP_RETURN output.
    if (out.script_pubkey?.startsWith("OP_RETURN")) {
      continue;
    }

    // Check if there are inscriptions that match our criteria
    if (out.inscriptions && out.inscriptions.length > 0) {
      for (const inscription of out.inscriptions) {
        if (
          inscription.inscription.delegate === delegateToMatch &&
          inscription.genesis_height < maxHeight
        ) {
          stones.push({
            inscriptionId: inscription.inscription_id,
            output: out.output,
            value: out.value,
          });
        }
      }
    }
  }

  return stones;
};

type Args = {
  utxosToBurn: EnhancedUTXO[];
  fundingUtxos: UTXO[];
  hdPrivateKey: Uint8Array;
  network: typeof btc.NETWORK;
  feePerByte: bigint;
};

export const unwrapStones = async ({
  utxosToBurn,
  fundingUtxos,
  hdPrivateKey,
  network,
  feePerByte,
}: Args) => {
  return createBonestoneUnwrap({
    utxosToBurn,
    fundingUtxos,
    hdPrivateKey,
    network,
    feePerByte,
  });
};
