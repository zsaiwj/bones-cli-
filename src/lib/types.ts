import BigNumber from "bignumber.js";

interface Vin {
  txid: string;
  vout: number;
  prevout: {
    scriptpubkey: string;
    scriptpubkey_asm: string;
    scriptpubkey_type: string;
    scriptpubkey_address: string;
    value: number;
  };
  scriptsig: string;
  scriptsig_asm: string;
  witness: string[];
  is_coinbase: boolean;
  sequence: number;
}

export interface Vout {
  scriptpubkey: string;
  scriptpubkey_asm: string;
  scriptpubkey_type: string;
  scriptpubkey_address: string;
  value: number;
}

export interface AddressTransaction {
  txid: string;
  version: number;
  locktime: number;
  vin: Vin[];
  vout: Vout[];
  size: number;
  weight: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height: number | null;
    block_hash: string | null;
    block_time: number | null;
    confirmed_by_ord: boolean;
  };
}

// Represents a single inscription entry from the final JSON structure
export type InscriptionData = {
  chain: string;
  genesis_fee: number;
  genesis_height: number;
  inscription: {
    body: any[];
    content_type: string | null;
    delegate: string;
    metadata: any | null;
    parents: any[];
  };
  inscription_id: string;
  inscription_number: number;
  next: string | null;
  output: {
    value: number;
    script_pubkey: string;
  };
  previous: string;
  dune: any | null;
  sat: any | null;
  satpoint: string;
  timestamp: string;
  relic_sealed: any | null;
  relic_enshrined: boolean;
  syndicate: any | null;
  charms: any[];
  child_count: number;
  children: any[];
};

export type BonesBalance = {
  amount: BigNumber;
  divisibility: number;
  symbol: string;
  ticker: string;
};

// Represents the full output data structure from the final JSON
export type OutputData = {
  address: string;
  inscriptions: InscriptionData[];
  dunes: any[];
  bones: Record<string, BonesBalance>;
  script_pubkey: string;
  transaction: string;
  output: string;
  value: number;
};

export type UTXO = {
  txid: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height: number | null;
    block_hash: string | null;
    block_time: number | null;
    confirmed_by_ord: boolean;
  };
  value: number;
  scriptpubkey_address?: string;
};

export type EnhancedUTXO = UTXO & {
  outputData: OutputData;
  singleAssetSafe?: boolean;
};

export type BoneId = {
  block: bigint; // u64
  tx: bigint; // u32 transaction index
};

export type SyndicateId = BoneId;
export type Mint = BoneId;

export type Bone = bigint;

export type MintTerms = {
  amount: bigint;
  cap: bigint;
  price: bigint;
};

export type Deployment = {
  symbol: string; // 1 char
  seed: bigint;
  subsidy: bigint;
  mintTerms: MintTerms;
  turbo: boolean;
} | null;

export type Swap = {
  input?: BoneId; // Fallback is base token
  output?: BoneId; // Fallback is base token
  inputAmount: bigint;
  outputAmount: bigint;
  // if false, this is an exact-output order
  // if true, this is an exact-input order
  isExactInput: boolean;
};

export type Transfer = {
  id: BoneId;
  amount: bigint;
  output: number;
};

export type Summoning = {
  treasure: BoneId; // ID of the bone the syndicate is for
  height: [bigint, bigint]; // from which block to which block chests can be created
  cap: bigint; // max number of chests that can exist at the same time
  quota: bigint; // how many bones needed per chest (exact)
  royalty: bigint; // royalty to be paid in base tokens (to the syndicate inscription owner), a flat fee paid to the owner for every chest created
  gated: boolean; // if this is set, only owner of the Syndicate inscription can chest
  lock: bigint; // how many blocks the bones should be locked in the chest, no withdrawal possible before
  reward: bigint; // rewards that are paid by having bones wrapped, measured in Bones per Chest per block
  lockSubsidy: boolean; // kill switch to deny any further Syndicates with reward
  turbo: boolean; // opt-in to future protocol changes
};

export type Keepsake = {
  transfers?: Transfer[]; // allocation of Bones to outputs
  pointer?: number; // output number to receive unallocated Bones, if not specified the first non-OP_RETURN output is used
  claim?: bigint; // if set any tokens claimable by the script of the given output will be allocated
  commitment?: boolean; // enable commitment check
  sealing?: boolean; // seal a Bone Ticker
  deployment?: Deployment; // deploy a previously sealed Bone
  mint?: Mint; // mint given Bone
  swap?: Swap; // execute token swap
  summoning?: Summoning; // summon a Syndicate
  encasing?: SyndicateId; // encase Bones into a non-fungible container
  reveal?: boolean; // release a Chest
};
