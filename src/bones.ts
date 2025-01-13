import { fetchAddressTransactions } from "./lib/fetchAddressTransactions";
import { fetchOutputs } from "./lib/fetchOutputs";
import { BoneId, EnhancedUTXO, UTXO } from "./lib/types";
import * as btc from "@scure/btc-signer";
import { createBonestoneUnwrap } from "./lib/transactions/createBonestoneUnwrap";
import { createBoneTransferTransaction } from "./lib/transactions/createBoneTransferTransaction";

interface BoneEntry {
  ticker: string;
  symbol: string;
  amount: string; // BigNumber serialized as string
  divisibility: number;
  output: string;
  address: string | null;
  value: number;
}

export const listBones = async (address: string, ticker?: string) => {
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

  const bonesList: BoneEntry[] = [];

  for (const out of outputs) {
    // Exclude spent outputs
    if (spentOutpoints.has(out.output)) {
      continue;
    }

    // Exclude OP_RETURN outputs since they're not spendable
    if (out.script_pubkey?.startsWith("OP_RETURN")) {
      continue;
    }

    // Check if output contains bones
    // `bones` is an object with keys as ticker and values as { amount, divisibility, symbol, ticker }
    if (out.bones && Object.keys(out.bones).length > 0) {
      for (const [boneTicker, boneData] of Object.entries(out.bones)) {
        if (out.address !== address) {
          continue;
        }

        if (ticker && boneTicker !== ticker) {
          continue;
        }

        bonesList.push({
          ticker: boneTicker,
          symbol: boneData.symbol,
          amount: boneData.amount.toString(), // amount as string (from the fetched data)
          divisibility: boneData.divisibility,
          output: out.output,
          address: out.address || null, // address might be null in some cases
          value: out.value,
        });
      }
    }
  }

  return bonesList;
};

type TransferArgs = {
  boneId: BoneId;
  amount: bigint;
  receiver: string;
  fundingUtxos: UTXO[];
  boneUtxos: EnhancedUTXO[];
  hdPrivateKey: Uint8Array;
  network: typeof btc.NETWORK;
  feePerByte: bigint;
};

export const transferBones = async ({
  boneId,
  amount,
  receiver,
  fundingUtxos,
  boneUtxos,
  hdPrivateKey,
  network,
  feePerByte,
}: TransferArgs) => {
  return createBoneTransferTransaction({
    boneId,
    amount,
    receiver,
    fundingUtxos,
    boneUtxos,
    hdPrivateKey,
    network,
    feePerByte,
  });
};

type UnwrapArgs = {
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
}: UnwrapArgs) => {
  return createBonestoneUnwrap({
    utxosToBurn,
    fundingUtxos,
    hdPrivateKey,
    network,
    feePerByte,
  });
};
