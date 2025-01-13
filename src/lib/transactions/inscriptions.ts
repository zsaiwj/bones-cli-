import dogecore, { crypto, ScriptInstance } from "bitcore-lib-doge";
const { Hash, Signature } = crypto;
const { PrivateKey, Transaction, Script, Opcode } = dogecore;
import cbor from "cbor";
import { Output } from "./types";

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
  let buffer: Buffer;
  if (typeof b === "string") {
    buffer = Buffer.from(b, type);
  } else {
    buffer = b;
  }
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
          : Buffer.from([n % 256, n / 256]),
    len: n <= 16 ? 0 : n < 128 ? 1 : 2,
    opcodenum: n == 0 ? 0 : n <= 16 ? 80 + n : n < 128 ? 1 : 2,
  };
}

function opcodeToChunk(op: number): Chunk {
  return {
    opcodenum: op,
    len: 0,
    buf: undefined,
  };
}

// interface Output {
//   address?: string;
//   script?: ScriptInstance;
//   amount: number | bigint;
// }

const MAX_CHUNK_LEN = 240;
const MAX_PAYLOAD_LEN = 1500;
const contentType = "text/plain;charset=utf-8";

export const getP2sh = ({
  privKey,
  text,
}: {
  privKey: string;
  text: string;
}): {
  redeemScript: Buffer;
  p2sh: ScriptInstance;
  partial: ScriptInstance;
  lock: ScriptInstance;
} => {
  const privateKey = new PrivateKey(privKey);
  const publicKey = privateKey.toPublicKey();
  console.log("publicKey", publicKey);

  const hexData = Buffer.from(JSON.stringify(text)).toString("hex");
  let data = Buffer.from(hexData, "hex");

  const parts: Buffer[] = [];
  while (data.length) {
    const part = data.slice(0, Math.min(MAX_CHUNK_LEN, data.length));
    data = data.slice(part.length);
    parts.push(part);
  }

  const partial = new Script();
  const inscription = new Script();
  inscription.chunks.push(bufferToChunk("ord"));
  inscription.chunks.push(numberToChunk(parts.length));
  inscription.chunks.push(bufferToChunk(contentType));

  parts.forEach((part, n) => {
    inscription.chunks.push(numberToChunk(parts.length - n - 1));
    inscription.chunks.push(bufferToChunk(part));
  });

  const metadata = { BONE: text };
  const cborMetadata = cbor.encode(metadata);
  inscription.chunks.push(numberToChunk(5));
  inscription.chunks.push(bufferToChunk(cborMetadata));

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

export function getRevealTx({
  privKey,
  text,
  feePerByte,
  commitTxId,
  valueOfOutputToSpend,
  revealTxOutputs,
  changeReceiver,
}: {
  privKey: string;
  text: string;
  feePerByte: bigint;
  commitTxId: string;
  valueOfOutputToSpend: number;
  revealTxOutputs: Output[];
  changeReceiver: string;
}) {
  Transaction.FEE_PER_KB = Number(feePerByte / 1000n);
  const { redeemScript, p2sh, partial } = getP2sh({ privKey, text });

  const revealTx = new Transaction();
  revealTx.addInput(
    new Transaction.Input({
      prevTxId: commitTxId,
      outputIndex: 0,
      output: new Transaction.Output({
        satoshis: valueOfOutputToSpend,
        script: p2sh,
      }),
      script: Script.empty(),
    }),
  );

  for (const output of revealTxOutputs) {
    if ((output as { address: string; amount: bigint }).address) {
      revealTx.to(
        (output as { address: string; amount: bigint }).address,
        Number(output.amount),
      );
    } else if ((output as { script: Uint8Array; amount: bigint }).script) {
      revealTx.addOutput(
        new Transaction.Output({
          script: (output as { script: Uint8Array; amount: bigint })
            .script as unknown as ScriptInstance,
          satoshis: Number(output.amount),
        }),
      );
    }
  }

  const signature = Transaction.Sighash.sign(
    revealTx,
    new PrivateKey(privKey),
    Signature.SIGHASH_ALL,
    0,
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

  revealTx.inputs[0].setScript(unlock);

  return { revealTx };
}
