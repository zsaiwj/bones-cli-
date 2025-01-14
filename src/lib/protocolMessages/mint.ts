import { Tag } from "./classes";
import { createScript } from "./keepsake";
import { Mint, BoneId } from "../types";

export function getMintScript(boneId: BoneId) {
  const keepsake = { mint: boneId };

  return createScript(keepsake);
}

export function encodeMintProtocolMessage(mint: Mint): Uint8Array {
  const payload: number[][] = [];

  if (mint) {
    Tag.encode(Tag.Mint, mint.block, payload);
    Tag.encode(Tag.Mint, mint.tx, payload);
  }

  return new Uint8Array(payload.flat());
}

export default {
  getMintScript,
  encodeMintProtocolMessage,
};
