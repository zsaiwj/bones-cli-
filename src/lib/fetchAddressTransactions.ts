import { ELECTRUM_URL } from "./constants";
import { AddressTransaction } from "./types";
import axios from "axios";

type AddressTransactionsResponse = AddressTransaction[];

export const fetchAddressTransactions = async (
  address: string,
  afterTxid: string | null,
): Promise<AddressTransactionsResponse> => {
  if (!address) {
    return [];
  }

  try {
    const mempoolTxUrl = `${ELECTRUM_URL}/address/${address}/txs/mempool`;
    const mempoolTxResponse = await axios.get(mempoolTxUrl);

    const url = `${ELECTRUM_URL}/address/${address}/txs/chain${
      afterTxid ? `/${afterTxid}` : ""
    }`;

    const response = await axios.get(url);

    return [...mempoolTxResponse.data, ...response.data];
  } catch (error) {
    console.error(
      `Failed to fetch transactions for address: ${address}`,
      error,
    );
    throw error;
  }
};
