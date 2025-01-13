import { PROTOCOL_OPCODE } from "../constants";
import bitcore from "bitcore-lib";

export const MAX_SCRIPT_ELEMENT_SIZE = 80;

export const createScriptWithProtocolMsg = () => {
  // create an OP_RETURN script with the protocol message
  return new bitcore.Script("").add("OP_RETURN").add(PROTOCOL_OPCODE);
};

export function varIntEncode(n: bigint): number[] {
  if (n === 0n) return [0];

  // Initialize an empty array
  const out: number[] = [];

  // Loop while n is greater than 0
  while (n > 0n) {
    // Get the lowest 7 bits of n
    let byte = Number(n & 0b01111111n);

    // Shift n right by 7 bits.
    n >>= 7n;

    // If n is still greater than 0, set the highest bit of the byte to 1.
    if (n > 0n) {
      byte |= 0b10000000;
    }

    // Append the resulting byte to the array.
    out.push(byte);
  }

  return out;
}

export function symbolAsNumber(symbol: string): number {
  // Get the code point at the first position (handles surrogate pairs)
  const codePoint = symbol.codePointAt(0);
  // Get the code point as a hex string
  const asHex = codePoint!.toString(16).toUpperCase();
  // Get the code point as a number
  return parseInt(asHex, 16);
}
