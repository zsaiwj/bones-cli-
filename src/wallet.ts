import { WalletAccount } from "./lib/WalletAccount";
import { BONES_CLI_PASSWORD } from "./lib/constants";

export const createWallet = () => {
  if (WalletAccount.existsInFile()) {
    throw new Error("A wallet already exists!");
  }

  const account = WalletAccount.createWalletAccount();
  account.saveToFile(BONES_CLI_PASSWORD);

  return account;
};

export const unlockWallet = () => {
  if (!WalletAccount.existsInFile()) {
    throw new Error("A wallet does not exist!");
  }

  return WalletAccount.getFromFile(BONES_CLI_PASSWORD);
};
