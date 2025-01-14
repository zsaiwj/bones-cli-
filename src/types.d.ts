declare module "bitcore-lib-doge" {
  import { Buffer } from "buffer";

  namespace crypto {
    class Hash {
      static sha256(buffer: Buffer): Buffer;
      static ripemd160(buffer: Buffer): Buffer;
    }

    class Signature {
      static SIGHASH_ALL: number;
      toBuffer(): Buffer;
    }
  }

  export { crypto };

  class PrivateKey {
    constructor(key: string);
    toPublicKey(): PublicKey;
    toBuffer(): Buffer;
  }

  class PublicKey {
    toBuffer(): Buffer;
  }

  class Opcode {
    static OP_CHECKSIGVERIFY: number;
    static OP_DROP: number;
    static OP_TRUE: number;
    static OP_HASH160: number;
    static OP_EQUAL: number;
  }

  interface ScriptChunk {
    buf?: Buffer;
    len: number;
    opcodenum: number;
  }

  /**
   * This interface describes the *instance* shape of a Script object.
   * Use it anywhere you need a variable/type to be "an instance of Script."
   */
  interface ScriptInstance {
    chunks: ScriptChunk[];
    toBuffer(): Buffer;
    toHex(): string;
  }

  /**
   * This interface describes the *constructor* and static methods
   * that are exported at runtime under the name "Script."
   */
  interface ScriptConstructor {
    new (): ScriptInstance;
    empty(): ScriptInstance;
    fromBuffer(buffer: Buffer): ScriptInstance;
  }

  /**
   * Export a *value* named "Script" which has the shape of a constructor.
   * This is what you'll actually import and call at runtime.
   */
  export const Script: ScriptConstructor;

  class Output {
    constructor(data: { satoshis: number; script: ScriptInstance });
  }

  namespace Transaction {
    class Input {
      constructor(data: {
        prevTxId: string;
        outputIndex: number;
        output: Output;
        script: ScriptInstance;
      });
      setScript(script: ScriptInstance): void;
    }

    class Output {
      satoshis: number;
      constructor(data: { satoshis: number; script: ScriptInstance });
    }

    class Sighash {
      static sign(
        transaction: import("bitcore-lib-doge").Transaction,
        privateKey: PrivateKey,
        sighashType: number,
        inputIndex: number,
        subscript: ScriptInstance,
      ): crypto.Signature;
    }
  }

  class Transaction {
    static FEE_PER_KB: number;
    id: string;
    inputs: Transaction.Input[];
    outputs: Transaction.Output[];
    constructor(hex?: string);
    addInput(input: Transaction.Input): this;
    addOutput(output: Transaction.Output): this;
    to(address: string, amount: number): this;
    toBuffer(): Buffer;
  }

  export { PrivateKey, PublicKey, Transaction, Opcode };
  export type { ScriptInstance }; // So you can import { ScriptInstance } if you need the type

  const _default: {
    crypto: typeof crypto;
    PrivateKey: typeof PrivateKey;
    PublicKey: typeof PublicKey;
    Transaction: typeof Transaction;
    Script: ScriptConstructor;
    Opcode: typeof Opcode;
  };
  export default _default;
}
