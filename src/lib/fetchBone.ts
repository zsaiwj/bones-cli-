import axios from "axios";
import { BigNumber } from "bignumber.js";
import { ORD_URL } from "./constants";
import { InscriptionData, OutputData } from "./types";

type MintTerms = {
  amount: number;
  cap: number;
  price: number;
};

type State = {
  mints: number;
};

type BoneData = {
  id: string;
  entry: {
    mint_terms: MintTerms;
    state: State;
  };
};

export const fetchBone = async (ticker: string): Promise<BoneData> => {
  const response = await axios.get(`${ORD_URL}/bone/${ticker}?json=true`, {
    headers: {
      Accept: "application/json",
    },
  });

  return response.data;
};
