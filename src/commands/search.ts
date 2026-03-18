import ora from "ora";
import { apiGetWithPayment } from "../utils/api.js";
import { printJson, printNDJSON, printError, printHeader, printAgent, printInfo, isTTY } from "../utils/output.js";
import { EXIT_CODES } from "../utils/exitCodes.js";

interface SearchOptions {
  chain?: string;
  minScore?: string;
  x402Only?: boolean;
  limit?: string;
  offset?: string;
  buyer?: string;
  human?: boolean;
  stream?: boolean;
}

interface SearchAgent {
  globalId: string;
  name?: string;
  description?: string;
  chain?: string;
  capabilities?: string[];
  reputation?: { score: number; reviewCount?: number };
  pricing?: { per_task?: number };
  x402Support?: boolean;
}

interface SearchResponse {
  results?: SearchAgent[];
  meta?: {
    total?: number;
    buyerReputation?: {
      buyerTier: string;
      discountPercent: number;
    };
  };
}

interface ErrorResponse {
  error?: string;
}

export async function search(query: string, options: SearchOptions): Promise<void> {
  // TTY detection: human output for terminals, JSON for pipes
  const useHumanOutput = options.human || (isTTY() && options.human !== false);
  
  // Only show spinner for human output
  const spinner = useHumanOutput ? ora("Searching agents...").start() : null;

  try {
    const params: Record<string, string> = {
      q: query,
      limit: options.limit || "20",
      offset: options.offset || "0",
    };

    if (options.chain) params.chain = options.chain;
    if (options.minScore) params.minScore = options.minScore;
    if (options.x402Only) params.x402Only = "true";
    if (options.buyer) params.buyerAddress = options.buyer;

    const response = await apiGetWithPayment("/api/search", params);

    if (!response.ok) {
      const error = await response.json() as ErrorResponse;
      spinner?.fail("Search failed");
      
      // Determine exit code based on error
      let exitCode: number = EXIT_CODES.GENERAL_ERROR;
      if (response.status === 402) exitCode = EXIT_CODES.PAYMENT_REQUIRED;
      if (response.status === 401 || response.status === 403) exitCode = EXIT_CODES.AUTH_REQUIRED;
      if (response.status === 429) exitCode = EXIT_CODES.RATE_LIMITED;
      
      console.error(JSON.stringify({ error: error.error || `HTTP ${response.status}`, exitCode }));
      process.exit(exitCode);
    }

    const data = await response.json() as SearchResponse;
    spinner?.succeed(`Found ${data.results?.length || 0} agents`);

    // NDJSON streaming for large result sets
    if (options.stream && data.results) {
      printNDJSON(data.results);
      process.exit(EXIT_CODES.SUCCESS);
    }

    // JSON output (default for non-TTY)
    if (!useHumanOutput) {
      printJson(data);
      process.exit(EXIT_CODES.SUCCESS);
    }

    printHeader(`Search Results for "${query}"`);
    printInfo(`Total: ${data.meta?.total || 0} | Returned: ${data.results?.length || 0}`);

    if (data.meta?.buyerReputation) {
      const br = data.meta.buyerReputation;
      printInfo(`Buyer tier: ${br.buyerTier} | Discount: ${br.discountPercent}%`);
    }

    if (!data.results?.length) {
      printInfo("No agents found matching your query.");
      return;
    }

    for (const agent of data.results) {
      printAgent({
        globalId: agent.globalId,
        name: agent.name,
        description: agent.description,
        chain: agent.chain,
        capabilities: agent.capabilities,
        reputation: agent.reputation,
        pricing: agent.pricing,
        x402Support: agent.x402Support,
      });
    }

    console.log();
    printInfo("Use 'agent-arena profile <globalId>' to see full agent details");

  } catch (err) {
    spinner?.fail("Search failed");
    const message = err instanceof Error ? err.message : String(err);
    
    // Determine exit code
    let exitCode: number = EXIT_CODES.GENERAL_ERROR;
    if (message.includes("private key")) exitCode = EXIT_CODES.AUTH_REQUIRED;
    if (message.includes("network") || message.includes("fetch")) exitCode = EXIT_CODES.NETWORK_ERROR;
    
    console.error(JSON.stringify({ error: message, exitCode }));
    process.exit(exitCode);
  }
}
