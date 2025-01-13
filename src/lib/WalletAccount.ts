import * as fs from "fs";
import * as crypto from "crypto";
import * as bip39 from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { HDKey } from "@scure/bip32";
import * as btc from "@scure/btc-signer";
import {
  BITCOINJSLIB_NETWORK,
  ENCRYPTED_ACCOUNT_SECRET_FILE,
  UTXO_TYPE,
} from "./constants";

export class WalletAccount {
  public seedPhrase?: string[];
  public privateKey?: string;

  private static readonly VALIDATION_MARKER = "VALIDATION_MARKER";

  constructor(
    args:
      | { seedPhrase: string[]; privateKey?: never }
      | { privateKey: string; seedPhrase?: never },
  ) {
    if ("seedPhrase" in args) {
      this.seedPhrase = args.seedPhrase;
    } else if ("privateKey" in args) {
      this.privateKey = args.privateKey;
    } else {
      throw new Error(
        "Either seedPhrase or privateKey must be provided, but not both.",
      );
    }
  }

  // Encrypt with AES-256-GCM using a derived key from the password.
  public encrypt(password: string): string {
    const data = JSON.stringify({
      validationMarker: WalletAccount.VALIDATION_MARKER,
      seedPhrase: this.seedPhrase,
      privateKey: this.privateKey,
    });

    // Derive a key from the password (synchronous)
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(password, salt, 32);

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([
      cipher.update(data, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    // Store salt, iv, authTag, and ciphertext in a single JSON string
    return JSON.stringify({
      salt: salt.toString("hex"),
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
      ciphertext: encrypted.toString("hex"),
    });
  }

  // Decrypt using the password (synchronous)
  public static decrypt(
    encryptedData: string,
    password: string,
  ): WalletAccount {
    const { salt, iv, authTag, ciphertext } = JSON.parse(encryptedData);

    const key = crypto.scryptSync(password, Buffer.from(salt, "hex"), 32);

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(iv, "hex"),
    );
    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    let decrypted = decipher.update(
      Buffer.from(ciphertext, "hex"),
      undefined,
      "utf8",
    );
    decrypted += decipher.final("utf8");

    const parsedData = JSON.parse(decrypted);
    if (parsedData.validationMarker !== WalletAccount.VALIDATION_MARKER) {
      throw new Error("Decryption failed: incorrect password.");
    }

    return new WalletAccount(parsedData);
  }

  // Method to derive a private key from the seed phrase (synchronous)
  public getPrivateKey(): { pk: Uint8Array; wif: string } {
    if (this.privateKey) {
      return {
        pk: btc.WIF(BITCOINJSLIB_NETWORK).decode(this.privateKey),
        wif: this.privateKey,
      };
    } else if (this.seedPhrase) {
      const mnemonic = this.seedPhrase.join(" ");
      const ent = bip39.mnemonicToSeedSync(mnemonic); // Synchronous version
      const rootKey = HDKey.fromMasterSeed(ent);
      const childKey = rootKey.derive("m/44'/3'/0'/0/0");
      return {
        pk: childKey.privateKey!,
        wif: btc.WIF(BITCOINJSLIB_NETWORK).encode(childKey.privateKey!),
      };
    }
    throw new Error("No valid seed phrase or private key available.");
  }

  // Method to derive an address from the private key (synchronous)
  public getAddress(): string {
    const privateKey = this.getPrivateKey();
    return (
      btc.getAddress(
        UTXO_TYPE,
        btc.WIF(BITCOINJSLIB_NETWORK).decode(privateKey.wif),
        BITCOINJSLIB_NETWORK,
      ) || ""
    );
  }

  public static createWalletAccount(): WalletAccount {
    const seedPhrase = bip39.generateMnemonic(wordlist);
    return new WalletAccount({ seedPhrase: seedPhrase.split(" ") });
  }

  // Check if file exists (synchronous)
  public static existsInFile(): boolean {
    return fs.existsSync(ENCRYPTED_ACCOUNT_SECRET_FILE);
  }

  public static getFromFile(password: string): WalletAccount | undefined {
    try {
      const encryptedData = fs.readFileSync(
        ENCRYPTED_ACCOUNT_SECRET_FILE,
        "utf8",
      );
      return WalletAccount.decrypt(encryptedData, password);
    } catch {
      return undefined;
    }
  }

  public static isPasswordCorrect(password: string): boolean {
    try {
      const account = WalletAccount.getFromFile(password);
      return !!account;
    } catch {
      return false;
    }
  }

  // Save to file (synchronous)
  public saveToFile(password: string): void {
    const encrypted = this.encrypt(password);
    fs.writeFileSync(ENCRYPTED_ACCOUNT_SECRET_FILE, encrypted, "utf8");
  }
}
