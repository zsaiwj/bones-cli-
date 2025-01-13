import dogecore, { crypto, ScriptInstance } from "bitcore-lib-doge";
import { Output } from "./types";
const { Hash, Signature } = crypto;
const { PrivateKey, Transaction, Script, Opcode } = dogecore;

if (process.env.FEE_PER_KB) {
  Transaction.FEE_PER_KB = parseInt(process.env.FEE_PER_KB);
} else {
  Transaction.FEE_PER_KB = 50000000;
}

type Chunk = {
  buf?: Buffer;
  len: number;
  opcodenum: number;
};

function bufferToChunk(b: string | Buffer, type?: BufferEncoding): Chunk {
  const buffer = typeof b === "string" ? Buffer.from(b, type) : b;
  return {
    buf: buffer.length ? buffer : undefined,
    len: buffer.length,
    opcodenum:
      buffer.length <= 75 ? buffer.length : buffer.length <= 255 ? 76 : 77,
  };
}

function numberToChunk(n: number): Chunk {
  return {
    buf:
      n <= 16
        ? undefined
        : n < 128
          ? Buffer.from([n])
          : Buffer.from([n % 256, Math.floor(n / 256)]),
    len: n <= 16 ? 0 : n < 128 ? 1 : 2,
    opcodenum: n === 0 ? 0 : n <= 16 ? 80 + n : n < 128 ? 1 : 2,
  };
}

function opcodeToChunk(op: number): Chunk {
  return { opcodenum: op, len: 0, buf: undefined };
}

const MAX_PAYLOAD_LEN = 1500;

class InscriptionId {
  txid: string;
  index: number;

  constructor(txid: string) {
    if (!/^[0-9a-fA-F]{64}$/.test(txid)) {
      throw new Error("Txid must be a hexadecimal string of length 64.");
    }

    this.txid = txid;
    this.index = 0;
  }

  value(): Buffer {
    const indexBytes = Buffer.alloc(4);
    indexBytes.writeUInt32LE(this.index);

    let indexSlice = indexBytes;
    while (indexSlice[indexSlice.length - 1] === 0) {
      indexSlice = indexSlice.subarray(0, indexSlice.length - 1);
    }

    const txidBytes = Buffer.from(this.txid, "hex").reverse();
    return txidBytes;
  }
}

export const getDelegateP2sh = ({
  privKey,
  delegate_inscription_tx,
}: {
  privKey: string;
  delegate_inscription_tx: string;
}): {
  redeemScript: Buffer;
  p2sh: ScriptInstance;
  partial: ScriptInstance;
  lock: ScriptInstance;
} => {
  const privateKey = new PrivateKey(privKey);
  const publicKey = privateKey.toPublicKey();

  const partial = new Script();
  const inscription = new Script();

  inscription.chunks.push(bufferToChunk("ord"));
  inscription.chunks.push(numberToChunk(1));
  inscription.chunks.push(numberToChunk(0));
  inscription.chunks.push(numberToChunk(0));
  inscription.chunks.push(numberToChunk(0));
  inscription.chunks.push(numberToChunk(11));
  const inscriptionId = new InscriptionId(delegate_inscription_tx);
  inscription.chunks.push(bufferToChunk(inscriptionId.value()));
  partial.chunks.push(inscription.chunks.shift()!);

  while (
    partial.toBuffer().length <= MAX_PAYLOAD_LEN &&
    inscription.chunks.length
  ) {
    partial.chunks.push(inscription.chunks.shift()!);
    partial.chunks.push(inscription.chunks.shift()!);
  }

  if (partial.toBuffer().length > MAX_PAYLOAD_LEN) {
    inscription.chunks.unshift(partial.chunks.pop()!);
    inscription.chunks.unshift(partial.chunks.pop()!);
  }

  const lock = new Script();
  lock.chunks.push(bufferToChunk(publicKey.toBuffer()));
  lock.chunks.push(opcodeToChunk(Opcode.OP_CHECKSIGVERIFY));
  partial.chunks.forEach(() => {
    lock.chunks.push(opcodeToChunk(Opcode.OP_DROP));
  });
  lock.chunks.push(opcodeToChunk(Opcode.OP_TRUE));

  const redeemScript = lock.toBuffer();
  const lockhash = Hash.ripemd160(Hash.sha256(lock.toBuffer()));

  const p2sh = new Script();
  p2sh.chunks.push(opcodeToChunk(Opcode.OP_HASH160));
  p2sh.chunks.push(bufferToChunk(lockhash));
  p2sh.chunks.push(opcodeToChunk(Opcode.OP_EQUAL));

  return { redeemScript, p2sh, partial, lock };
};

export function getDelegateRevealTx({
  privKey,
  feePerByte,
  commitTxId,
  valuesOfOutputsToSpend,
  indexesOfOutputsToSpend,
  revealTxOutputs,
  delegate_inscription_tx,
}: {
  privKey: string;
  feePerByte: bigint;
  commitTxId: string;
  valuesOfOutputsToSpend: number[];
  indexesOfOutputsToSpend: number[];
  revealTxOutputs: Output[];
  delegate_inscription_tx: string;
}) {
  Transaction.FEE_PER_KB = Number(feePerByte / 1000n);

  const { redeemScript, p2sh, partial } = getDelegateP2sh({
    privKey,
    delegate_inscription_tx,
  });

  const revealTx = new Transaction();
  indexesOfOutputsToSpend.forEach((outputIndex, i) => {
    revealTx.addInput(
      new Transaction.Input({
        prevTxId: commitTxId,
        outputIndex,
        output: new Transaction.Output({
          satoshis: valuesOfOutputsToSpend[i],
          script: p2sh,
        }),
        script: Script.empty(),
      }),
    );
  });

  for (const output of revealTxOutputs) {
    if ("address" in output) {
      revealTx.to(output.address, Number(output.amount));
    }
    if ("script" in output) {
      revealTx.addOutput(
        new Transaction.Output({
          script: output.script as unknown as ScriptInstance,
          satoshis: Number(output.amount),
        }),
      );
    }
  }

  revealTx.inputs.forEach((input, i) => {
    const signature = Transaction.Sighash.sign(
      revealTx,
      new PrivateKey(privKey),
      Signature.SIGHASH_ALL,
      i,
      Script.fromBuffer(redeemScript),
    );

    const txsignature = Buffer.concat([
      signature.toBuffer(),
      Buffer.from([Signature.SIGHASH_ALL]),
    ]);

    const unlock = new Script();
    unlock.chunks = unlock.chunks.concat(partial.chunks);
    unlock.chunks.push(bufferToChunk(txsignature));
    unlock.chunks.push(bufferToChunk(redeemScript));
    input.setScript(unlock);
  });

  return { revealTx };
}
