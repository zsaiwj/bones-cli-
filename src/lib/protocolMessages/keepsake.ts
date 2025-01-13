import { Script } from "bitcore-lib";

import { Flag, PushBytes, Tag } from "./classes";

import { Keepsake } from "../types";
import { MAX_SCRIPT_ELEMENT_SIZE, createScriptWithProtocolMsg } from "./utils";
import { encodeTransfersProtocolMessage } from "./transfers";
import { encodeDeploymentProtocolMessage } from "./deploy";

export function encodeProtocolMessage(keepsake: Keepsake): Uint8Array {
  let result = new Uint8Array();

  // Init bitmask
  let flags = 0n;

  if (keepsake.commitment) {
    flags = flags | Flag.mask(Flag.Commitment);
  }

  if (keepsake.sealing) {
    flags = flags | Flag.mask(Flag.Sealing);
  }

  if (keepsake.reveal) {
    flags = flags | Flag.mask(Flag.Reveal);
  }

  if (keepsake.deployment) {
    const { flags: deploymentFlags, message: deploypmentProtocolMessage } =
      encodeDeploymentProtocolMessage(keepsake.deployment);
    flags = flags | deploymentFlags;
    result = new Uint8Array([...result, ...deploypmentProtocolMessage]);
  }

  // Set flags
  const flagsMerged = flags;
  const flagsPayload: number[][] = [];
  if (flags > 0n) {
    Tag.encode(Tag.Flags, flagsMerged, flagsPayload);
    result = new Uint8Array([...result, ...flagsPayload.flat()]);
  }

  // handle further payload
  const furtherPayload: number[][] = [];
  if (keepsake.pointer !== undefined) {
    Tag.encode(Tag.Pointer, BigInt(keepsake.pointer || 0), furtherPayload);
  }
  if (keepsake.claim !== undefined) {
    Tag.encode(Tag.Claim, keepsake.claim, furtherPayload);
  }

  result = new Uint8Array([...result, ...furtherPayload.flat()]);

  // Handle transfers
  if (keepsake.transfers) {
    const transfersProtocolMessage = encodeTransfersProtocolMessage(
      keepsake.transfers,
    );
    result = new Uint8Array([...result, ...transfersProtocolMessage]);
  }

  return result;
}

export function encodedProtocolMessageToScript(
  encodedProtocolMessage: Uint8Array,
): Script {
  // Create script with protocol message
  const script = createScriptWithProtocolMsg();

  // Add encoded protocol message to script
  for (
    let i = 0;
    i < encodedProtocolMessage.length;
    i += MAX_SCRIPT_ELEMENT_SIZE
  ) {
    // Push payload bytes to script
    const chunk = encodedProtocolMessage.slice(i, i + MAX_SCRIPT_ELEMENT_SIZE);
    const push = PushBytes.fromSliceUnchecked(Array.from(chunk));
    script.add(Buffer.from(push.asBytes()));
  }

  return script;
}

export function createScript(keepsake: Keepsake): Script {
  const encodedProtocolMessage = encodeProtocolMessage(keepsake);
  return encodedProtocolMessageToScript(encodedProtocolMessage);
}
