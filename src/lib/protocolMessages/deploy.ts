import { Flag, Tag } from "./classes";
import { createScript } from "./keepsake";
import { Deployment, MintTerms } from "../types";
import { symbolAsNumber } from "./utils";

export function getDeployScript(
  symbol: string,
  seed: bigint,
  subsidy: bigint,
  mintTerms: MintTerms,
  turbo: boolean,
) {
  const keepsake = {
    deployment: {
      symbol,
      seed,
      subsidy,
      mintTerms,
      turbo,
    },
  };

  return createScript(keepsake);
}

export function encodeDeploymentProtocolMessage(deployment: Deployment): {
  flags: bigint;
  message: Uint8Array;
} {
  const payload: number[][] = [];
  let flags = Flag.mask(Flag.Deployment);

  if (deployment) {
    if (deployment.symbol) {
      Tag.encode(
        Tag.Symbol,
        BigInt(symbolAsNumber(deployment.symbol)),
        payload,
      );
    }

    if (deployment.seed) Tag.encode(Tag.Seed, deployment.seed, payload);
    if (deployment.subsidy)
      Tag.encode(Tag.Subsidy, deployment.subsidy, payload);

    // Set mint terms
    if (deployment.mintTerms) {
      flags = flags | Flag.mask(Flag.MintTerms);

      Tag.encode(Tag.Amount, BigInt(deployment.mintTerms.amount), payload);
      Tag.encode(Tag.Cap, BigInt(deployment.mintTerms.cap), payload);
      Tag.encode(Tag.Price, BigInt(deployment.mintTerms.price), payload);
    }

    if (deployment.turbo) {
      flags = flags | Flag.mask(Flag.Turbo);
    }
  }

  const message = new Uint8Array(payload.flat());

  return {
    flags,
    message,
  };
}

export default {
  getDeployScript,
  encodeDeploymentProtocolMessage,
};
