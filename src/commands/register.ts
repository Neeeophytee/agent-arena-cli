import ora from "ora";
import { apiPostWithPayment } from "../utils/api.js";
import { printJson, printError, printSuccess, printHeader, printInfo } from "../utils/output.js";

interface RegisterOptions {
  name: string;
  description: string;
  capabilities?: string;
  endpoint?: string;
  wallet?: string;
  price?: string;
  chain?: string;
  human?: boolean;
}

interface RegisterResponse {
  globalId: string;
  agentId: string;
  chain: string;
  chainId: number;
  txHash: string;
  profileUrl: string;
}

interface ErrorResponse {
  error?: string;
  detail?: string;
}

export async function register(options: RegisterOptions): Promise<void> {
  const spinner = ora("Registering agent on-chain...").start();

  try {
    const body: Record<string, unknown> = {
      name: options.name,
      description: options.description,
      preferredChain: options.chain || "base",
    };

    if (options.capabilities) {
      body.capabilities = options.capabilities.split(",").map(c => c.trim().toLowerCase());
    }

    if (options.endpoint) {
      body.services = [{ name: "x402", endpoint: options.endpoint }];
      body.x402Support = true;
    }

    if (options.wallet) {
      body.agentWallet = options.wallet;
    }

    if (options.price) {
      body.pricing = {
        per_task: parseFloat(options.price),
        currency: "USDC",
        chain: options.chain || "base",
      };
    }

    const response = await apiPostWithPayment("/api/register", body);

    if (!response.ok) {
      const error = await response.json() as ErrorResponse;
      spinner.fail("Registration failed");
      printError(error.error || `HTTP ${response.status}`);
      if (error.detail) printError(error.detail);
      return;
    }

    const data = await response.json() as RegisterResponse;
    spinner.succeed("Agent registered successfully!");

    // JSON is default, --human for human-readable
    if (!options.human) {
      printJson(data);
      return;
    }

    printHeader("Registration Complete");
    printSuccess(`Agent "${options.name}" is now live on ${data.chain}!`);
    
    console.log();
    console.log("  Global ID:    ", data.globalId);
    console.log("  Agent ID:     ", data.agentId);
    console.log("  Chain:        ", data.chain, `(${data.chainId})`);
    console.log("  TX Hash:      ", data.txHash);
    console.log("  Profile URL:  ", data.profileUrl);
    
    console.log();
    printInfo("IMPORTANT: Save these values! You'll need them for updates and reviews.");
    
    console.log();
    printInfo("Next steps:");
    console.log("  1. View your profile: agent-arena profile", data.globalId);
    console.log("  2. Update your profile: agent-arena register --update ...");
    console.log("  3. Clients will discover you via: agent-arena search <capability>");

  } catch (err) {
    spinner.fail("Registration failed");
    printError(String(err));
  }
}
