import { fetchAddressTransactions } from "./lib/fetchAddressTransactions";
import { fetchOutputs } from "./lib/fetchOutputs";

interface FundingUtxo {
  output: string;
  address: string;
  value: number;
}

export const listFundingUtxos = async (address: string) => {
  const allTxs = [];
  const seenTxids = new Set<string>();
  let afterTxid: string | null = null;

  // Fetch all transactions (mempool + chain) with pagination
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

  // Extract all outputs
  const outputIds = allTxs.flatMap((tx) =>
    tx.vout.map((_: any, index: number) => `${tx.txid}:${index}`),
  );

  if (outputIds.length === 0) {
    console.log("No outputs found for these transactions.");
    return [];
  }

  // Determine which outputs are spent by checking all vins
  const spentOutpoints = new Set<string>();
  for (const tx of allTxs) {
    for (const input of tx.vin) {
      const spentOutpoint = `${input.txid}:${input.vout}`;
      spentOutpoints.add(spentOutpoint);
    }
  }

  const outputs = await fetchOutputs(outputIds);

  // Filter for unspent funding UTXOs:
  // - Belong to the specified address
  // - value >= 50000000 (0.5 DOGE)
  // - no inscriptions
  // - not in spentOutpoints
  const ONE_DOGE = 50000000;
  const fundingUtxos: FundingUtxo[] = outputs
    .filter(
      (out) =>
        out.address === address &&
        out.value >= ONE_DOGE &&
        (!out.inscriptions || out.inscriptions.length === 0) &&
        !spentOutpoints.has(out.output), // Ensure not spent
    )
    .map((out) => ({
      output: out.output,
      address: out.address,
      value: out.value,
    }));

  return fundingUtxos;
};
