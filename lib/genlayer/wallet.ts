import {config} from "../config";

export type EIP1193Provider = {
  request(args: {method: string; params?: unknown[]}): Promise<unknown>;
  on?: (event: string, listener: (value: unknown) => void) => void;
  removeListener?: (event: string, listener: (value: unknown) => void) => void;
};

declare global { interface Window { ethereum?: EIP1193Provider } }

export const BACKFILL_ADDRESS_KEY = "backfill:address";
export const STUDIONET_CHAIN_ID = `0x${config.chainId.toString(16)}`;

export function getWindowProvider(): EIP1193Provider {
  if (typeof window === "undefined" || !window.ethereum) throw new Error("No injected wallet provider detected.");
  return window.ethereum;
}

export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export async function ensureStudionet(provider: EIP1193Provider): Promise<void> {
  let chainId = String(await provider.request({method: "eth_chainId"}));
  if (chainId.toLowerCase() !== STUDIONET_CHAIN_ID) {
    try {
      await provider.request({method: "wallet_switchEthereumChain", params: [{chainId: STUDIONET_CHAIN_ID}]});
    } catch (error) {
      const code = (error as {code?: number})?.code;
      const message = String((error as {message?: unknown})?.message ?? "").toLowerCase();
      if (code === 4902 || isUnknownChainMessage(message)) {
        try {
          await provider.request({method: "wallet_addEthereumChain", params: [{
            chainId: STUDIONET_CHAIN_ID,
            chainName: "GenLayer Studionet",
            nativeCurrency: {name: "GEN", symbol: "GEN", decimals: 18},
            rpcUrls: [config.rpc],
            blockExplorerUrls: [config.explorer],
          }]});
          await provider.request({method: "wallet_switchEthereumChain", params: [{chainId: STUDIONET_CHAIN_ID}]});
        } catch (addOrSwitchError) {
          if (isUserRejection(addOrSwitchError)) throw new Error("Studionet was not added or selected.");
          throw addOrSwitchError;
        }
      } else if (isUserRejection(error)) throw new Error("Studionet was not added or selected.");
      else if (code === -32601 || message.includes("method not found") || message.includes("unsupported")) {
        throw new Error("This injected wallet does not support automatic network switching. Choose another injected wallet or add GenLayer Studionet manually.");
      } else throw error;
    }
  }
  chainId = String(await provider.request({method: "eth_chainId"}));
  if (chainId.toLowerCase() !== STUDIONET_CHAIN_ID) throw new Error("Wallet is not on GenLayer Studionet (61999).");
}

function isUserRejection(error: unknown) {
  const code = (error as {code?: number})?.code;
  const message = String((error as {message?: unknown})?.message ?? "").toLowerCase();
  return code === 4001 || message.includes("user rejected") || message.includes("user denied") || message.includes("rejected");
}

function isUnknownChainMessage(message: string) {
  return ["unknown chain", "chain not found", "unrecognized chain", "unrecognised chain", "chain is not configured", "chain not configured", "chain does not exist", "chain isn't configured", "chain is unknown"].some((part) => message.includes(part));
}

export function normalizeWalletError(error: unknown): string {
  const code = (error as {code?: number})?.code;
  const message = String((error as {message?: unknown})?.message ?? error).toLowerCase();
  if (message.includes("studionet was not added or selected")) return "Studionet was not added or selected.";
  if (code === 4001 || message.includes("user rejected")) return message.includes("switch") || message.includes("network") ? "Network switch rejected in wallet." : "Transaction rejected in wallet.";
  if (code === -32601 || message.includes("method not found") || message.includes("unsupported")) return "This injected wallet does not support automatic network switching. Choose another injected wallet or add GenLayer Studionet manually.";
  if (message.includes("rpc") || message.includes("fetch") || message.includes("timeout")) return "Studionet RPC is currently unavailable.";
  if (message.includes("chain") || message.includes("network")) return "Switch your injected wallet to GenLayer Studionet (61999).";
  return "Wallet transaction could not be submitted.";
}

export function disconnectWallet(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(BACKFILL_ADDRESS_KEY);
}
