import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const CONFIG_PATH = join(homedir(), ".agent-arena", "config.json");
const DEFAULT_API_URL = "https://agentarena.site";

export interface Config {
  apiUrl: string;
  privateKey?: string;
}

export function getConfig(): Config {
  if (existsSync(CONFIG_PATH)) {
    try {
      const data = readFileSync(CONFIG_PATH, "utf-8");
      return JSON.parse(data) as Config;
    } catch {
      return { apiUrl: DEFAULT_API_URL };
    }
  }
  return { apiUrl: DEFAULT_API_URL };
}

export function getApiUrl(): string {
  return process.env.AGENT_ARENA_API_URL || getConfig().apiUrl || DEFAULT_API_URL;
}

export function getPrivateKey(): string | undefined {
  return process.env.AGENT_ARENA_PRIVATE_KEY || getConfig().privateKey;
}

// Lazy-loaded x402 client
let x402FetchInstance: ((url: string, options?: RequestInit) => Promise<Response>) | null = null;

async function getX402Fetch(): Promise<(url: string, options?: RequestInit) => Promise<Response>> {
  if (x402FetchInstance) return x402FetchInstance;
  
  const privateKey = getPrivateKey();
  if (!privateKey) {
    throw new Error(
      "This endpoint requires payment. Configure your private key:\n" +
      "  agent-arena config --set-key 0xYOUR_PRIVATE_KEY\n" +
      "Or set AGENT_ARENA_PRIVATE_KEY environment variable"
    );
  }

  // Dynamic imports for x402
  const { wrapFetchWithPayment } = await import("@x402/fetch");
  const { x402Client } = await import("@x402/core/client");
  const { registerExactEvmScheme } = await import("@x402/evm/exact/client");
  const { privateKeyToAccount } = await import("viem/accounts");

  const signer = privateKeyToAccount(privateKey as `0x${string}`);
  const client = new x402Client();
  registerExactEvmScheme(client, { signer });
  
  x402FetchInstance = wrapFetchWithPayment(fetch, client);
  return x402FetchInstance;
}

export async function apiGet(endpoint: string, params?: Record<string, string>): Promise<Response> {
  const url = new URL(endpoint, getApiUrl());
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
  }
  
  return fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "agent-arena-cli/1.0.0",
    },
  });
}

export async function apiPost(endpoint: string, body: object): Promise<Response> {
  const url = new URL(endpoint, getApiUrl());
  
  return fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "agent-arena-cli/1.0.0",
    },
    body: JSON.stringify(body),
  });
}

export async function apiGetWithPayment(endpoint: string, params?: Record<string, string>): Promise<Response> {
  const privateKey = getPrivateKey();
  
  // First try without payment
  const url = new URL(endpoint, getApiUrl());
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
  }
  
  // If no private key, try regular fetch first
  if (!privateKey) {
    const response = await fetch(url.toString(), {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "agent-arena-cli/1.0.0",
      },
    });
    
    if (response.status === 402) {
      throw new Error(
        "This endpoint requires payment. Configure your private key:\n" +
        "  agent-arena config --set-key 0xYOUR_PRIVATE_KEY\n" +
        "Or set AGENT_ARENA_PRIVATE_KEY environment variable"
      );
    }
    return response;
  }
  
  // Use x402 payment wrapper
  const fetchWithPayment = await getX402Fetch();
  return fetchWithPayment(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "agent-arena-cli/1.0.0",
    },
  });
}

export async function apiPostWithPayment(endpoint: string, body: object): Promise<Response> {
  const privateKey = getPrivateKey();
  const url = new URL(endpoint, getApiUrl());
  
  // If no private key, try regular fetch first
  if (!privateKey) {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "agent-arena-cli/1.0.0",
      },
      body: JSON.stringify(body),
    });
    
    if (response.status === 402) {
      throw new Error(
        "This endpoint requires payment. Configure your private key:\n" +
        "  agent-arena config --set-key 0xYOUR_PRIVATE_KEY\n" +
        "Or set AGENT_ARENA_PRIVATE_KEY environment variable"
      );
    }
    return response;
  }
  
  // Use x402 payment wrapper
  const fetchWithPayment = await getX402Fetch();
  return fetchWithPayment(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "agent-arena-cli/1.0.0",
    },
    body: JSON.stringify(body),
  });
}
