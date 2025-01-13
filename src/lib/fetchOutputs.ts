import axios from "axios";
import { BigNumber } from "bignumber.js";
import { ORD_URL } from "./constants";
import { InscriptionData, OutputData } from "./types";

export const fetchOutputs = async (
  outputIds: string[],
): Promise<OutputData[]> => {
  const CHUNK_SIZE = 100;
  const outputChunks = chunkArray(outputIds, CHUNK_SIZE);

  const requests = outputChunks.map(async (chunk) => {
    const queryParam = chunk.join(",");
    const response = await axios.get(`${ORD_URL}/outputs/${queryParam}`, {
      headers: {
        Accept: "application/json",
      },
    });

    return response.data.map((item: any) => {
      const bones = Object.keys(item.bones).reduce((acc: any, key: string) => {
        acc[key] = {
          ...item.bones[key],
          amount: new BigNumber(item.bones[key].amount),
          ticker: key,
        };
        return acc;
      }, {});

      return {
        ...item,
        bones,
      };
    });
  });

  const results = await Promise.all(requests);
  return results.flat();
};

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
