import * as btc from "@scure/btc-signer";
import readline from "readline";
import { program } from "commander";
import { listStones, unwrapStones } from "./src/stones";
import { createWallet, unlockWallet } from "./src/wallet";
import { listFundingUtxos } from "./src/funding";
import {
  BITCOINJSLIB_NETWORK,
  BONES_CLI_PASSWORD,
  FEE_PER_BYTE,
  SEAL_PRICE_IN_BASE_TOKEN,
} from "./src/lib/constants";
import { EnhancedUTXO, UTXO } from "./src/lib/types";
import { BaseTransaction } from "./src/lib/transactions/models/Transaction";
import { TransactionFactory } from "./src/lib/transactions/factory/transactionFactory";
import { TransactionState } from "./src/lib/transactions/types";
import {
  postTransactionRaw,
  postTransactions,
} from "./src/lib/transactions/broadcast";
import { listBones } from "./src/bones";
import { fetchBone } from "./src/lib/fetchBone";
import { createBoneTransferTransaction } from "./src/lib/transactions/createBoneTransferTransaction";
import { createSealingTransactions } from "./src/lib/transactions/createSealingTransaction";
import { listTickers } from "./src/tickers";
import {
  BoneDeployParams,
  createDeployTransaction,
} from "./src/lib/transactions/createDeployTransaction";
import { WalletAccount } from "./src/lib/WalletAccount";

program
  .name("transactions-cli")
  .description("CLI to interact with the Bones Protocol on Doge")
  .version("0.1.0");

const bones = program.command("bones").description("Manage bones");

bones
  .command("deploy")
  .description("Deploy a new bone")
  .argument("[ticker]", "The ticker of the bone to be deployed")
  .argument("[symbol]", "The symbol of the bone to be deployed")
  .argument("[amount]", "The amount per mint")
  .argument("[cap]", "The max. number of mints")
  .argument("[price]", "The price per mint in BONE")
  .argument("[seed]", "Number of tokens in initial LP pool")
  .argument("[image]", "Inscription ID of the token image (using delegation)")
  .action(async (ticker, symbol, amount, cap, price, seed, image) => {
    const boneDeployParams: BoneDeployParams = {
      symbol,
      seed: BigInt(seed),
      subsidy: BigInt(0),
      mintTerms: {
        amount: BigInt(amount),
        cap: BigInt(cap),
        price: BigInt(price),
      },
      turbo: false,
    };
    const account = unlockWallet();
    if (!account) {
      console.error("Account not found!");
      process.exit(1);
    }
    const tickerUtxos = await listTickers(account.getAddress());
    const fundingData = await listFundingUtxos(account.getAddress());
    const fundingUtxos = fundingData.map((utxo: any) => {
      const [txid, voutStr] = utxo.output.split(":");
      return {
        txid,
        vout: parseInt(voutStr, 10),
        value: utxo.value,
        status: {
          confirmed: true,
          block_height: 0,
          block_hash: "",
          block_time: 0,
        },
      } as UTXO; // or EnhancedUTXO if needed
    });

    const network = BITCOINJSLIB_NETWORK;
    const ownedTicker = tickerUtxos.find((t) => t.ticker === ticker);
    if (!ownedTicker) {
      console.error("Ticker not owned!");
      process.exit(1);
    }

    const sealingUtxo = {
      txid: ownedTicker.output.split(":")[0],
      vout: parseInt(ownedTicker.output.split(":")[1], 10),
      value: ownedTicker.value,
      status: {
        confirmed: true,
        block_height: 0,
        block_hash: "",
        block_time: 0,
      },
    } as EnhancedUTXO;

    const { pk } = account.getPrivateKey();
    const { commitTx, revealTx } = createDeployTransaction({
      boneDeployParams,
      fundingUtxos,
      sealingUtxo,
      hdPrivateKey: pk,
      network,
      feePerByte: FEE_PER_BYTE,
      delegateInscription: image,
    });

    await postTransactionRaw(commitTx.hex);

    const totalSupply =
      boneDeployParams.mintTerms.amount * boneDeployParams.mintTerms.cap;

    const transaction: BaseTransaction = TransactionFactory.createTransaction({
      transactionType: "deploy",
      tx: btc.Transaction.fromRaw(revealTx.toBuffer(), {
        allowUnknownOutputs: true,
      }), // empty transaction, because we already submitted
      state: TransactionState.Created,
      priceInRelic: boneDeployParams.mintTerms.price,
      symbol: boneDeployParams.symbol,
      totalSupply:
        boneDeployParams.mintTerms.amount * boneDeployParams.mintTerms.cap,
      tick: ticker,
      liquidityShare: Number(
        ((boneDeployParams.seed * 100n) / totalSupply).toString(),
      ),
      amountPerMint: boneDeployParams.mintTerms.amount,
    });

    console.log(transaction);

    const postedTxs = await postTransactions([transaction]);
    console.log(postedTxs);
  });

bones
  .command("list")
  .description("List all bones of wallet")
  .argument("[address]", "The address to list bone stones for")
  .action(async (address) => {
    let bones;

    // If `address` was provided, use it. Otherwise, handle the default logic.
    if (address) {
      console.log(`Listing bones for address: ${address}`);
      bones = await listBones(address);
    } else {
      console.log("Listing bones for the default wallet");
      const account = unlockWallet();
      if (!account) {
        console.error("Account not found!");
        process.exit(1);
      }
      bones = await listBones(account?.getAddress());
    }

    console.log(`Found ${bones!.length} bones entries`);
    console.log(bones);
  });

bones
  .command("transfer")
  .description("Transfer bones to another address")
  .argument("[ticker]", "Ticker of the bone to be transferred")
  .argument("[amount]", "Amount of the bone to be transferred (in sats/shibes)")
  .argument("[receiver]", "The receiver of the bones")
  .action(async (ticker, amount, receiver) => {
    const bone = await fetchBone(ticker);
    const account = unlockWallet();
    if (!account) {
      console.error("Account not found!");
      process.exit(1);
    }
    let totalAmountOwned = 0n;
    const bonesList = await listBones(account.getAddress());
    for (const b of bonesList) {
      totalAmountOwned += BigInt(b.amount);
    }
    if (totalAmountOwned < BigInt(amount)) {
      console.error("Insufficient bones!");
      process.exit(1);
    }
    const [boneBlock, boneTxIndex] = bone.id.split(":");
    const fundingData = await listFundingUtxos(account.getAddress());
    const fundingUtxos = fundingData.map((utxo: any) => {
      const [txid, voutStr] = utxo.output.split(":");
      return {
        txid,
        vout: parseInt(voutStr, 10),
        value: utxo.value,
        status: {
          confirmed: true,
          block_height: 0,
          block_hash: "",
          block_time: 0,
        },
      } as UTXO; // or EnhancedUTXO if needed
    });
    const network = BITCOINJSLIB_NETWORK;
    const rawBoneUtxos = bonesList
      .filter((b) => b.ticker === ticker)
      .map((b) => {
        const [txid, voutStr] = b.output.split(":");
        return {
          txid,
          vout: parseInt(voutStr, 10),
          value: b.value,
          status: {
            confirmed: true,
            block_height: 0,
            block_hash: "",
            block_time: 0,
          },
        } as EnhancedUTXO;
      });
    rawBoneUtxos.sort((a, b) => Number(BigInt(b.value) - BigInt(a.value)));
    let selectedBoneUtxos: EnhancedUTXO[] = [];
    let collected = 0n;
    for (const utxo of rawBoneUtxos) {
      selectedBoneUtxos.push(utxo);
      collected += BigInt(utxo.value);
      if (collected >= BigInt(amount)) break;
    }
    const { pk } = account.getPrivateKey();
    const tx = createBoneTransferTransaction({
      boneId: { block: BigInt(boneBlock), tx: BigInt(boneTxIndex) },
      amount: BigInt(amount),
      receiver,
      fundingUtxos,
      boneUtxos: selectedBoneUtxos,
      hdPrivateKey: pk,
      network,
      feePerByte: FEE_PER_BYTE,
    });

    const transaction: BaseTransaction = TransactionFactory.createTransaction({
      transactionType: "relicTransfer",
      amount: BigInt(selectedBoneUtxos.length * 10e8),
      receiver,
      ticker,
      tx: tx,
      state: TransactionState.Created,
    });

    const postedTxs = await postTransactions([transaction]);
    console.log(postedTxs);
  });

const stones = program.command("stones").description("Manage stones");

stones
  .command("list")
  .description("List all bone stones of wallet")
  .argument("[address]", "The address to list bone stones for")
  .action(async (address) => {
    let stones;

    // If `address` was provided, use it. Otherwise, handle the default logic.
    if (address) {
      console.log(`Listing bone stones for address: ${address}`);
      stones = await listStones(address);
    } else {
      console.log("Listing bone stones for the default wallet");
      const account = unlockWallet();
      if (!account) {
        console.error("Account not found!");
        process.exit(1);
      }
      stones = await listStones(account?.getAddress());
    }

    console.log(`Found ${stones!.length} stones`);
    console.log(stones);
  });

stones
  .command("unwrap")
  .description("Unwrap stones for first wallet in account")
  .argument("[amount]", "The amount of stones to unwrap (max 100)")
  .action(async (amount) => {
    try {
      const account = unlockWallet();
      if (!account) {
        console.error(
          "No wallet found! Please create one first or ensure the password is correct.",
        );
        process.exit(1);
      }

      const maxUnwrap = amount || 100;

      // Get the address and private key from the account
      const address = account.getAddress();
      const { pk } = account.getPrivateKey();
      const stonesData = await listStones(address);

      // Limit the number of stones to unwrap
      const utxosToBurn = stonesData.slice(0, maxUnwrap).map((stone: any) => {
        const [txid, voutStr] = stone.output.split(":");
        return {
          txid,
          vout: parseInt(voutStr, 10),
          value: stone.value,
        } as EnhancedUTXO;
      });

      const fundingData = await listFundingUtxos(address);
      const fundingUtxos = fundingData.map((utxo: any) => {
        const [txid, voutStr] = utxo.output.split(":");
        return {
          txid,
          vout: parseInt(voutStr, 10),
          value: utxo.value,
        } as UTXO;
      });

      const network = BITCOINJSLIB_NETWORK;

      const tx = await unwrapStones({
        utxosToBurn,
        fundingUtxos,
        hdPrivateKey: pk,
        network,
        feePerByte: FEE_PER_BYTE,
      });

      const transaction: BaseTransaction = TransactionFactory.createTransaction(
        {
          transactionType: "boneStoneUnwrap",
          amount: BigInt(utxosToBurn.length * 10e8),
          receiver: address,
          tx: tx,
          state: TransactionState.Created,
        },
      );
      const postedTxs = await postTransactions([transaction]);
      console.log(postedTxs);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

const tickers = program.command("tickers").description("Manage tickers");

tickers
  .command("claim")
  .description("Claim a ticker by spending BONE")
  .argument("[ticker]", "The ticker you want to claim")
  .argument("[receiver]", "The receiver of the ticker inscription")
  .action(async (ticker, receiver) => {
    const deployableTicker = ticker.replace(/^•+|•+$/g, "");
    const sealingPrice = SEAL_PRICE_IN_BASE_TOKEN(deployableTicker.length);
    if (sealingPrice === null) {
      console.error("Could not get sealing price!");
      process.exit(1);
    }

    const bone = await fetchBone("BONE");
    const account = unlockWallet();
    if (!account) {
      console.error("Account not found!");
      process.exit(1);
    }

    let totalAmountOwned = 0n;
    const bonesList = await listBones(account.getAddress(), "BONE");
    for (const b of bonesList) {
      totalAmountOwned += BigInt(b.amount);
    }

    if (totalAmountOwned < sealingPrice) {
      console.error("Insufficient bones!");
      process.exit(1);
    }

    const boneUtxos: EnhancedUTXO[] = [];
    for (const b of bonesList.sort((a, b) =>
      Number(BigInt(b.amount) - BigInt(a.amount)),
    )) {
      const [txid, voutStr] = b.output.split(":");
      boneUtxos.push({
        txid,
        vout: parseInt(voutStr, 10),
        value: b.value,
        status: {
          confirmed: true,
          block_height: 0,
          block_hash: "",
          block_time: 0,
        },
      } as EnhancedUTXO);
    }

    const fundingData = await listFundingUtxos(account.getAddress());
    const fundingUtxos = fundingData.map((utxo: any) => {
      const [txid, voutStr] = utxo.output.split(":");
      return {
        txid,
        vout: parseInt(voutStr, 10),
        value: utxo.value,
        status: {
          confirmed: true,
          block_height: 0,
          block_hash: "",
          block_time: 0,
        },
      } as UTXO; // or EnhancedUTXO if needed
    });

    const network = BITCOINJSLIB_NETWORK;

    const { pk } = account.getPrivateKey();
    const { commitTx, revealTx } = createSealingTransactions({
      ticker: deployableTicker,
      fundingUtxos,
      boneUtxos,
      hdPrivateKey: pk,
      network,
      feePerByte: FEE_PER_BYTE,
    });

    await postTransactionRaw(commitTx.hex);

    const transaction: BaseTransaction = TransactionFactory.createTransaction({
      transactionType: "sealing",
      tick: ticker,
      tx: btc.Transaction.fromRaw(revealTx.toBuffer(), {
        allowUnknownOutputs: true,
      }), // empty transaction, because we already submitted
      state: TransactionState.Created,
    });

    const postedTxs = await postTransactions([transaction]);
    console.log(postedTxs);
  });

tickers
  .command("list")
  .description("List all tickers in wallet")
  .argument("[address]", "The address to list tickers for")
  .action(async (address) => {
    let tickers;

    // If `address` was provided, use it. Otherwise, handle the default logic.
    if (address) {
      console.log(`Listing tickers for address: ${address}`);
      tickers = await listTickers(address);
    } else {
      console.log("Listing tickers for the default wallet");
      const account = unlockWallet();
      if (!account) {
        console.error("Account not found!");
        process.exit(1);
      }
      tickers = await listTickers(account?.getAddress());
    }

    console.log(`Found ${tickers!.length} tickers`);
    console.log(tickers);
  });

const wallet = program.command("wallet").description("Manage wallets");

wallet
  .command("export")
  .description("Export the private key of the wallet")
  .action(async () => {
    try {
      const account = unlockWallet();
      if (!account) {
        console.error("Account not found!");
        process.exit(1);
      }
      const { wif } = account.getPrivateKey();
      console.log(`Private key: ${wif}`);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

wallet
  .command("create")
  .description("Create a new wallet")
  .action(async () => {
    try {
      console.log("Creating a new wallet...");
      const account = createWallet();
      console.log("New wallet created successfully!");
      console.log(`First address of account: ${account.getAddress()}`);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1); // Exit with a non-zero code to indicate an error
    }
  });

wallet
  .command("import")
  .description(
    "Import a wallet using a seed phrase (will overwrite the existing wallet)",
  )
  .action(async () => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (query: string): Promise<string> =>
      new Promise((resolve) => rl.question(query, resolve));

    try {
      // Check if a wallet already exists
      if (WalletAccount.existsInFile()) {
        const confirmation = await question(
          "A wallet already exists. Importing a new wallet will overwrite the existing one. Are you sure? (yes/no): ",
        );

        if (confirmation.toLowerCase() !== "yes") {
          console.log("Import cancelled.");
          process.exit(0);
        }
      }

      // Ask for the seed phrase
      const seedPhrase = await question(
        "Enter your seed phrase (space-separated): ",
      );

      // Create a new wallet with the provided seed phrase
      const account = new WalletAccount({
        seedPhrase: seedPhrase.trim().split(" "),
      });

      // Save the new wallet to the file
      account.saveToFile(BONES_CLI_PASSWORD);

      console.log("Wallet imported successfully!");
      console.log(
        `First address of the imported account: ${account.getAddress()}`,
      );
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    } finally {
      rl.close();
    }
  });

wallet
  .command("funding")
  .description(
    "List all possible funding UTXOs (≥1 DOGE, no inscriptions) of a wallet",
  )
  .argument("[address]", "The address to list funding UTXOs for")
  .action(async (address) => {
    try {
      let utxos;
      if (address) {
        console.log(`Listing funding UTXOs for address: ${address}`);
        utxos = await listFundingUtxos(address);
      } else {
        console.log("Listing funding UTXOs for the default wallet");
        const account = unlockWallet();
        if (!account) {
          console.error("Account not found!");
          process.exit(1);
        }
        utxos = await listFundingUtxos(account.getAddress());
      }

      console.log(`Found ${utxos.length} funding UTXOs`);
      console.log(utxos);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

wallet
  .command("receive")
  .description("Display an address of your wallet to receive funds")
  .action(async () => {
    try {
      const account = unlockWallet();
      if (!account) {
        console.error(
          "No wallet found! Please create one first or ensure the password is correct.",
        );
        process.exit(1);
      }
      const address = account.getAddress();
      console.log(`Your receiving address is: ${address}`);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1); // Exit with a non-zero code to indicate an error
    }
  });

program.parse(process.argv);
