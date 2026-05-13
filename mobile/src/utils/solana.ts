import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import { Buffer } from "buffer";
import * as Linking from "expo-linking";
if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer;
}
export const APP_IDENTITY = {
  name: "SolShare",
  uri: "https://im-apratap.github.io/solshare",
  icon: "favicon.ico",
};
export const SOLANA_CLUSTER = "mainnet-beta";
export const connection = new Connection(
  "https://api.mainnet-beta.solana.com",
  "confirmed",
);
export function getSolscanUrl(
  txSignature: string,
  cluster: string = SOLANA_CLUSTER,
): string {
  const baseUrl = "https://solscan.io/tx";
  if (cluster === "mainnet-beta" || cluster === "mainnet") {
    return `${baseUrl}/${txSignature}`;
  }
  return `${baseUrl}/${txSignature}?cluster=${cluster}`;
}
export async function openSolscanTx(txSignature: string): Promise<void> {
  const url = getSolscanUrl(txSignature);
  await Linking.openURL(url);
}
export async function connectWallet(): Promise<string> {
  return await transact(async (wallet) => {
    const authorizationResult = await wallet.authorize({
      cluster: "mainnet-beta",
      identity: APP_IDENTITY,
    });
    return authorizationResult.accounts[0].address;
  });
}
export async function signTransactionOnDevice(
  base64Transaction: string,
): Promise<string> {
  return await transact(async (wallet) => {
    await wallet.authorize({
      cluster: "mainnet-beta",
      identity: APP_IDENTITY,
    });
    const txBuffer = Buffer.from(base64Transaction, "base64");
    let transaction;
    try {
      transaction = VersionedTransaction.deserialize(new Uint8Array(txBuffer));
    } catch {
      transaction = Transaction.from(new Uint8Array(txBuffer));
    }
    const signedTransactions = await wallet.signTransactions({
      transactions: [transaction],
    });
    const signedTx = signedTransactions[0];
    if (signedTx instanceof VersionedTransaction) {
      return Buffer.from(signedTx.serialize()).toString("base64");
    } else {
      return Buffer.from(
        signedTx.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        }),
      ).toString("base64");
    }
  });
}
