import BigNumber from "bignumber.js";
import * as bitcoinjslib from "bitcoinjs-lib";

require("dotenv").config();

export const BASE_TICKER = process.env.BASE_TICKER ?? "BONE";
export const ELECTRUM_URL = process.env.BONES_CLI_ELECTRUM_URL ?? "";
export const ORD_URL = process.env.BONES_CLI_ORD_URL ?? "";
export const BONES_UTXO_TARGET_SIZE = 100_000;
export const INSCRIPTION_TARGET_SIZE = 100_000;
export const FEE_PER_BYTE = 11000n;

const DEFAULT_NETWORK_ID = "doge";

const networks: Record<string, bitcoinjslib.Network> = {
  ["btc-rt"]: { ...bitcoinjslib.networks.regtest, bech32: "bcrt" },
  ["doge"]: {
    messagePrefix: "Dogecoin Signed Message:\n",
    // doge not support native segwit
    bech32: "bc",
    bip32: {
      public: 49990397,
      private: 49988504,
    },
    pubKeyHash: 30,
    scriptHash: 22,
    wif: 158,
  },
};

const utxoTypes: Record<string, "tr" | "pkh" | "wpkh"> = {
  ["btc-rt"]: "tr",
  ["doge"]: "pkh", // doge does not support segwit
};

export const BITCOINJSLIB_NETWORK: bitcoinjslib.Network =
  networks[process.env.BONES_CLI_NETWORK_ID ?? DEFAULT_NETWORK_ID];

export const ENCRYPTED_ACCOUNT_SECRET_FILE =
  process.env.BONES_CLI_ENCRYPTED_ACCOUNT_SECRET_FILE || ".wallet.json";

export const UTXO_TYPE =
  utxoTypes[process.env.BONES_CLI_NETWORK_ID ?? DEFAULT_NETWORK_ID];

export const BONES_CLI_PASSWORD = process.env.BONES_CLI_PASSWORD ?? "password";

export const PROTOCOL_OPCODE = process.env.BONES_CLI_PROTOCOL_OPCODE;

if (!PROTOCOL_OPCODE) {
  throw new Error("PROTOCOL_OPCODE not defined");
}

// Bone Decimals
export const BONE_DECIMALS = 8;
export const BONE_DECIMALS_DIVISOR = 10 ** BONE_DECIMALS;

export const SEAL_PRICE_IN_BASE_TOKEN = (length: number) => {
  switch (length) {
    case 0:
      return null;
    case 1:
      return BigInt(210_000 * BONE_DECIMALS_DIVISOR);
    case 2:
      return BigInt(21_000 * BONE_DECIMALS_DIVISOR);
    case 3:
      return BigInt(2_100 * BONE_DECIMALS_DIVISOR);
    case 4:
    case 5:
    case 6:
      return BigInt(500 * BONE_DECIMALS_DIVISOR);
    case 7:
    case 8:
    case 9:
    case 10:
    case 11:
    case 12:
      return BigInt(10 * BONE_DECIMALS_DIVISOR);
    default:
      return BigInt(BONE_DECIMALS_DIVISOR);
  }
};
