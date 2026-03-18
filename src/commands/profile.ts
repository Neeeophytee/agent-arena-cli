import ora from "ora";
import { apiGet } from "../utils/api.js";
import { printJson, printError, printHeader, printInfo, printSuccess } from "../utils/output.js";
import chalk from "chalk";

interface ProfileOptions {
  human?: boolean;
}

interface Review {
  normalized_score: number;
  tag1?: string;
  payment_verified?: boolean;
  feedback_note?: string;
}

interface CrossChainEntry {
  chain: string;
  chainId: number;
  globalId: string;
}

interface ProfileResponse {
  name?: string;
  globalId: string;
  chain: string;
  chainId: number;
  agentId: string;
  ownerAddress: string;
  agentWallet: string;
  description?: string;
  capabilities?: string[];
  reputation?: {
    score?: number;
    reviewCount?: number;
    verifiedReviews?: number;
    jobCount?: number;
    chainCount?: number;
  };
  pricing?: {
    per_task?: number;
    currency?: string;
  };
  x402Support?: boolean;
  x402Endpoint?: string;
  a2aEndpoint?: string;
  mcpEndpoint?: string;
  domainVerified?: boolean;
  crossChainPresence?: CrossChainEntry[];
  recentReviews?: Review[];
  links?: {
    onChainExplorer?: string;
    submitReview?: string;
  };
}

interface ErrorResponse {
  error?: string;
  hint?: string;
}

export async function profile(globalIdOrPath: string, options: ProfileOptions): Promise<void> {
  const spinner = ora("Fetching agent profile...").start();

  try {
    let endpoint: string;

    // Check if it's a globalId (eip155:8453:0x...#123) or chainId/agentId
    if (globalIdOrPath.includes(":")) {
      // Parse globalId: eip155:8453:0x8004A169...#247
      const match = globalIdOrPath.match(/eip155:(\d+):0x[0-9a-fA-F]+#(\d+)/);
      if (!match) {
        spinner.fail("Invalid globalId format");
        printError("Expected format: eip155:{chainId}:{registry}#{agentId}");
        return;
      }
      endpoint = `/api/agent/${match[1]}/${match[2]}`;
    } else if (globalIdOrPath.includes("/")) {
      // chainId/agentId format
      endpoint = `/api/agent/${globalIdOrPath}`;
    } else {
      spinner.fail("Invalid agent identifier");
      printError("Use globalId (eip155:8453:0x...#123) or chainId/agentId (8453/123)");
      return;
    }

    const response = await apiGet(endpoint);

    if (!response.ok) {
      const error = await response.json() as ErrorResponse;
      spinner.fail("Failed to fetch profile");
      printError(error.error || `HTTP ${response.status}`);
      if (error.hint) printInfo(error.hint);
      return;
    }

    const data = await response.json() as ProfileResponse;
    spinner.succeed("Profile loaded");

    // JSON is default, --human for human-readable
    if (!options.human) {
      printJson(data);
      return;
    }

    printHeader(data.name || "Agent Profile");

    console.log();
    console.log(chalk.bold("Identity"));
    console.log("  Global ID:     ", data.globalId);
    console.log("  Chain:         ", data.chain, `(${data.chainId})`);
    console.log("  Agent ID:      ", data.agentId);
    console.log("  Owner:         ", data.ownerAddress);
    console.log("  Agent Wallet:  ", data.agentWallet);

    if (data.description) {
      console.log();
      console.log(chalk.bold("Description"));
      console.log("  ", data.description);
    }

    if (data.capabilities?.length) {
      console.log();
      console.log(chalk.bold("Capabilities"));
      console.log("  ", data.capabilities.join(", "));
    }

    console.log();
    console.log(chalk.bold("Reputation"));
    const rep = data.reputation || {};
    const score = rep.score || 0;
    const scoreColor = score >= 80 ? chalk.green : score >= 50 ? chalk.yellow : chalk.red;
    console.log("  Score:           ", scoreColor(`${score}/100`));
    console.log("  Total Reviews:   ", rep.reviewCount || 0);
    console.log("  Verified Reviews:", rep.verifiedReviews || 0);
    console.log("  Jobs Completed:  ", rep.jobCount || 0);
    console.log("  Chain Count:     ", rep.chainCount || 1);

    if (data.pricing) {
      console.log();
      console.log(chalk.bold("Pricing"));
      console.log("  Per Task:      ", `$${data.pricing.per_task || "N/A"} ${data.pricing.currency || "USDC"}`);
    }

    console.log();
    console.log(chalk.bold("Endpoints"));
    console.log("  x402 Support:  ", data.x402Support ? chalk.green("Yes") : chalk.gray("No"));
    if (data.x402Endpoint) console.log("  x402 Endpoint: ", data.x402Endpoint);
    if (data.a2aEndpoint) console.log("  A2A Endpoint:  ", data.a2aEndpoint);
    if (data.mcpEndpoint) console.log("  MCP Endpoint:  ", data.mcpEndpoint);

    if (data.domainVerified) {
      console.log();
      printSuccess("Domain Verified ✓");
    }

    if (data.crossChainPresence?.length) {
      console.log();
      console.log(chalk.bold("Cross-Chain Presence"));
      for (const sibling of data.crossChainPresence) {
        console.log(`  - ${sibling.chain} (${sibling.chainId}): ${sibling.globalId}`);
      }
    }

    if (data.recentReviews?.length) {
      console.log();
      console.log(chalk.bold("Recent Reviews"));
      for (const review of data.recentReviews.slice(0, 3)) {
        const reviewScore = review.normalized_score;
        const reviewColor = reviewScore >= 80 ? chalk.green : reviewScore >= 50 ? chalk.yellow : chalk.red;
        console.log(`  ${reviewColor(reviewScore + "/100")} - ${review.tag1 || "general"} ${review.payment_verified ? chalk.green("✓ verified") : ""}`);
        if (review.feedback_note) console.log(`    "${review.feedback_note}"`);
      }
    }

    console.log();
    console.log(chalk.bold("Links"));
    console.log("  Explorer:      ", data.links?.onChainExplorer);
    console.log("  Submit Review: ", data.links?.submitReview);

  } catch (err) {
    spinner.fail("Failed to fetch profile");
    printError(String(err));
  }
}
