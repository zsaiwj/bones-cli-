import { Tag } from "./classes";

import { Keepsake, BoneId, Transfer } from "../types";
import { varIntEncode } from "./utils";
import { createScript } from "./keepsake";

export function createTransferKeepsake(
  id: BoneId[],
  amount: bigint[],
  output?: number[],
): Keepsake {
  if (
    id.length !== amount.length ||
    (output && output.length > 0 && id.length !== output.length)
  ) {
    throw new Error(
      "transfer: id, amount, and output must have the same length",
    );
  }

  const transfers = id.map((id, index) => {
    const outputValue = output && output.length > 0 ? output[index] : index;
    return { id, amount: amount[index], output: outputValue };
  });

  return { transfers };
}

export function getTransferScript(
  id: BoneId[],
  amount: bigint[],
  output?: number[],
) {
  // Use the helper function to create the keepsake
  const keepsake = createTransferKeepsake(id, amount, output);

  return createScript(keepsake);
}

export function encodeTransfersProtocolMessage(
  transfers: Transfer[],
): Uint8Array {
  const payload: number[][] = [];

  if (transfers.length > 0) {
    payload.push(varIntEncode(BigInt(Tag.Body)));

    // sort by Block and secondary Tx Index
    const sortedTransfers = transfers.slice().sort((a, b) => {
      const idBlockA = BigInt(a.id.block);
      const idBlockB = BigInt(b.id.block);

      return idBlockA < idBlockB
        ? -1
        : idBlockA > idBlockB
          ? 1
          : a.id.tx < b.id.tx
            ? -1
            : a.id.tx > b.id.tx
              ? 1
              : 0;
    });

    /// Delta Encoding Examples
    ///
    /// block heights
    ///(0) 100 200 5000 20000
    ///    100 100 4800 15000
    ///
    ///
    /// previous: { block: 12387112, tx: 1 }
    /// next: { block: 12387112, tx: 5 }
    /// result: { block: 0, tx: 4 }

    /// previous: { block: 1, tx: 1 }
    /// next: { block: 3, tx: 5 }
    /// result: { block: 2, tx: 5 }

    let prevIdBlock = 0n;
    let prevIdTxIndex = 0n;
    for (const transfer of sortedTransfers) {
      const deltaBlock: bigint = transfer.id.block - prevIdBlock;
      const deltaIndex: bigint =
        deltaBlock === 0n ? transfer.id.tx - prevIdTxIndex : transfer.id.tx;

      payload.push(varIntEncode(deltaBlock));
      payload.push(varIntEncode(deltaIndex));
      payload.push(varIntEncode(transfer.amount));
      payload.push(varIntEncode(BigInt(transfer.output)));

      prevIdBlock = deltaBlock;
      prevIdTxIndex = deltaIndex;
    }
  }

  return new Uint8Array(payload.flat());
}

export default {
  getTransferScript,
  encodeTransfersProtocolMessage,
};
