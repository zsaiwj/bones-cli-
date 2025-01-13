import { fetchAddressTransactions } from "./lib/fetchAddressTransactions";
import { fetchOutputs } from "./lib/fetchOutputs";

interface Ticker {
  inscriptionId: string;
  output: string;
  value: number;
  ticker: string;
}

export const listTickers = async (address: string) => {
  const allTxs = [];
  const seenTxids = new Set<string>();
  let afterTxid: string | null = null;

  // Fetch all transactions (mempool + chain) for the address with pagination
  while (true) {
    const page = await fetchAddressTransactions(address, afterTxid);
    if (page.length === 0) break;

    const chainTxs = page.filter((tx) => tx.status.confirmed === true);
    const mempoolTxs = page.filter((tx) => tx.status.confirmed === false);

    for (const tx of [...mempoolTxs, ...chainTxs]) {
      if (!seenTxids.has(tx.txid)) {
        seenTxids.add(tx.txid);
        allTxs.push(tx);
      }
    }

    if (chainTxs.length === 0) break;
    const lastChainTx = chainTxs[chainTxs.length - 1];
    afterTxid = lastChainTx.txid;
  }

  console.log(`Found ${allTxs.length} transactions for address ${address}`);

  // Identify spent outputs
  const spentOutpoints = new Set<string>();
  for (const tx of allTxs) {
    for (const input of tx.vin) {
      if (input.prevout.scriptpubkey_address !== address) {
        continue;
      }
      const spentOutpoint = `${input.txid}:${input.vout}`;
      spentOutpoints.add(spentOutpoint);
    }
  }

  // Extract all output IDs
  const outputIds = allTxs.flatMap((tx) =>
    tx.vout.map((_: any, index: number) => `${tx.txid}:${index}`),
  );

  if (outputIds.length === 0) {
    console.log("No outputs found for these transactions.");
    return [];
  }

  // Fetch output details
  const outputs = await fetchOutputs(outputIds);
  console.log(`Fetched details for ${outputs.length} outputs.`);

  const tickers: Ticker[] = [];

  for (const out of outputs) {
    // Exclude spent outputs
    if (spentOutpoints.has(out.output)) {
      continue;
    }

    // Exclude OP_RETURN outputs since they're not spendable
    if (out.script_pubkey?.startsWith("OP_RETURN")) {
      continue;
    }

    // Check if there are inscriptions that match our criteria
    if (out.inscriptions && out.inscriptions.length > 0) {
      for (const inscription of out.inscriptions) {
        // todo - missing validation here, could have metadata but not be an actual bone
        if (inscription.inscription.metadata.BONE) {
          tickers.push({
            inscriptionId: inscription.inscription_id,
            output: out.output,
            value: out.value,
            ticker: inscription.inscription.metadata.BONE,
          });
        }
      }
    }
  }

  return tickers;
};
