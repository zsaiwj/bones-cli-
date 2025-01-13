import { BaseTransaction } from "./models/Transaction";
import { ELECTRUM_URL } from "../constants";

export const postTransactionRaw = async (txhex: string) => {
  const response = await fetch(`${ELECTRUM_URL}/tx`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: txhex,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to post transaction: ${errorText}`);
  }

  return await response.text();
};

export const postTransactions = async (transactions: BaseTransaction[]) => {
  const successfullyPostedTransactions: BaseTransaction[] = [];

  // Post each transaction to the server
  for (const tx of transactions) {
    console.log(`Posting tx ${tx.id} with the following hex`);
    console.log(tx.hex);

    const response = await fetch(`${ELECTRUM_URL}/tx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: tx.hex,
    });

    // wait 100 ms
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to post transaction ${tx.id}: ${errorText}`);
    } else {
      // Only add the transaction to be saved if it was posted successfully
      successfullyPostedTransactions.push(tx);
    }
  }

  return successfullyPostedTransactions;
};
