import { createScript } from "./keepsake";

export function getSealingScript() {
  const keepsake = { sealing: true };

  return createScript(keepsake);
}

export function encodeSealingProtocolMessage(): Uint8Array {
  const payload: number[][] = [];

  // Sealing has no body to encode yet
  return new Uint8Array(payload.flat());
}

export default {
  getSealingScript,
  encodeSealingProtocolMessage,
};
