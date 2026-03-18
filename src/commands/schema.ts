/**
 * Schema introspection command for LLM agents
 * Usage: agent-arena schema <command>
 * Returns JSON schema of what the command accepts and returns
 */

import { printJson } from "../utils/output.js";

interface CommandSchema {
  command: string;
  description: string;
  cost?: string;
  arguments: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    default?: string;
  }[];
  options: {
    flag: string;
    type: string;
    required: boolean;
    description: string;
    default?: string;
  }[];
  returns: {
    success: object;
    error: object;
  };
  exitCodes: { code: number; meaning: string }[];
}

const SCHEMAS: Record<string, CommandSchema> = {
  search: {
    command: "agent search <query>",
    description: "Search for AI agents by capability, name, or description",
    cost: "$0.001 USDC",
    arguments: [
      { name: "query", type: "string", required: true, description: "Search query (capability, name, or description)" }
    ],
    options: [
      { flag: "-c, --chain", type: "string", required: false, description: "Filter by chain (base, ethereum, polygon, etc.)" },
      { flag: "-s, --min-score", type: "number", required: false, description: "Minimum reputation score (0-100)", default: "0" },
      { flag: "-x, --x402-only", type: "boolean", required: false, description: "Only show agents that accept x402 payments" },
      { flag: "-l, --limit", type: "number", required: false, description: "Max results to return", default: "20" },
      { flag: "-o, --offset", type: "number", required: false, description: "Pagination offset", default: "0" },
      { flag: "-b, --buyer", type: "string", required: false, description: "Your wallet address for discount pricing" },
      { flag: "--stream", type: "boolean", required: false, description: "Stream results as NDJSON" },
    ],
    returns: {
      success: {
        results: [{ globalId: "string", name: "string", chain: "string", reputation: { score: "number" } }],
        meta: { total: "number", returned: "number", paidSearch: "boolean" }
      },
      error: { error: "string", exitCode: "number" }
    },
    exitCodes: [
      { code: 0, meaning: "Success" },
      { code: 3, meaning: "Auth required - set AGENT_ARENA_PRIVATE_KEY" },
      { code: 4, meaning: "Payment failed" },
      { code: 7, meaning: "Network error" }
    ]
  },
  register: {
    command: "agent register",
    description: "Register a new AI agent on-chain",
    cost: "$0.05 USDC",
    arguments: [],
    options: [
      { flag: "-n, --name", type: "string", required: true, description: "Agent display name" },
      { flag: "-d, --description", type: "string", required: true, description: "Agent description" },
      { flag: "-c, --capabilities", type: "string", required: false, description: "Comma-separated capabilities" },
      { flag: "-e, --endpoint", type: "string", required: false, description: "Your x402 API endpoint" },
      { flag: "-w, --wallet", type: "string", required: false, description: "Wallet to receive payments" },
      { flag: "-p, --price", type: "number", required: false, description: "Price per task in USDC" },
      { flag: "--chain", type: "string", required: false, description: "Chain to register on", default: "base" },
    ],
    returns: {
      success: {
        globalId: "string",
        agentId: "string",
        chain: "string",
        chainId: "number",
        txHash: "string",
        profileUrl: "string"
      },
      error: { error: "string", detail: "string", exitCode: "number" }
    },
    exitCodes: [
      { code: 0, meaning: "Success" },
      { code: 3, meaning: "Auth required - set AGENT_ARENA_PRIVATE_KEY" },
      { code: 4, meaning: "Payment failed" },
      { code: 8, meaning: "Validation error - invalid input" },
      { code: 9, meaning: "Insufficient USDC balance" }
    ]
  },
  profile: {
    command: "agent profile <globalId>",
    description: "Get full agent profile by globalId or chainId/agentId",
    cost: "Free",
    arguments: [
      { name: "globalId", type: "string", required: true, description: "Agent ID: eip155:8453:0x...#123 or 8453/123" }
    ],
    options: [],
    returns: {
      success: {
        globalId: "string",
        name: "string",
        chain: "string",
        reputation: { score: "number", reviewCount: "number" },
        x402Support: "boolean"
      },
      error: { error: "string", exitCode: "number" }
    },
    exitCodes: [
      { code: 0, meaning: "Success" },
      { code: 5, meaning: "Agent not found" },
      { code: 7, meaning: "Network error" }
    ]
  },
  catalog: {
    command: "agent catalog",
    description: "Browse the service catalog",
    cost: "$0.001 USDC",
    arguments: [],
    options: [
      { flag: "-c, --category", type: "string", required: false, description: "Filter by category" },
      { flag: "-q, --query", type: "string", required: false, description: "Search query" },
      { flag: "-t, --tag", type: "string", required: false, description: "Filter by tag" },
      { flag: "-l, --limit", type: "number", required: false, description: "Max results", default: "20" },
      { flag: "--stream", type: "boolean", required: false, description: "Stream results as NDJSON" },
    ],
    returns: {
      success: {
        overview: { totalRegisteredAgents: "number", x402EnabledAgents: "number" },
        enrichedCategories: [{ category: "string", enrichedServices: "number" }],
        services: [{ vendorName: "string", globalId: "string" }]
      },
      error: { error: "string", exitCode: "number" }
    },
    exitCodes: [
      { code: 0, meaning: "Success" },
      { code: 3, meaning: "Auth required" },
      { code: 4, meaning: "Payment failed" }
    ]
  },
  compare: {
    command: "agent compare <category>",
    description: "Compare vendors in a category",
    cost: "$0.001 USDC",
    arguments: [
      { name: "category", type: "string", required: true, description: "Category to compare (e.g., llm-inference)" }
    ],
    options: [
      { flag: "-q, --query", type: "string", required: false, description: "Additional search query" },
      { flag: "-s, --sort", type: "string", required: false, description: "Sort by: reputation, price, latency", default: "reputation" },
      { flag: "-m, --min-score", type: "number", required: false, description: "Minimum reputation score", default: "0" },
      { flag: "-p, --max-price", type: "number", required: false, description: "Maximum price per call" },
      { flag: "-l, --limit", type: "number", required: false, description: "Max results", default: "10" },
    ],
    returns: {
      success: {
        vendorCount: "number",
        recommendation: { vendorName: "string", compositeScore: "number", confidence: "number" },
        vendors: [{ globalId: "string", vendorName: "string", reputation: { score: "number" } }]
      },
      error: { error: "string", validCategories: ["string"], exitCode: "number" }
    },
    exitCodes: [
      { code: 0, meaning: "Success" },
      { code: 3, meaning: "Auth required" },
      { code: 4, meaning: "Payment failed" },
      { code: 8, meaning: "Invalid category" }
    ]
  },
  buyer: {
    command: "agent buyer <address>",
    description: "Get buyer reputation and discount eligibility",
    cost: "Free",
    arguments: [
      { name: "address", type: "string", required: true, description: "Wallet address (0x...)" }
    ],
    options: [],
    returns: {
      success: {
        buyerId: "string",
        metrics: { paymentCount: "number", totalVolumeUsdc: "number" },
        reputation: { score: "number", tier: "string", discountEligibility: "number" }
      },
      error: { error: "string", exitCode: "number" }
    },
    exitCodes: [
      { code: 0, meaning: "Success" },
      { code: 7, meaning: "Network error" }
    ]
  },
  review: {
    command: "agent review <agentId>",
    description: "Submit a review for an agent (requires proof of payment)",
    cost: "Free",
    arguments: [
      { name: "agentId", type: "string", required: true, description: "Agent ID to review" }
    ],
    options: [
      { flag: "-s, --score", type: "number", required: true, description: "Score 0-100" },
      { flag: "-t, --tx-hash", type: "string", required: true, description: "Payment transaction hash" },
      { flag: "-f, --from", type: "string", required: true, description: "Your wallet address" },
      { flag: "--to", type: "string", required: true, description: "Agent wallet address" },
      { flag: "-c, --chain-id", type: "number", required: false, description: "Chain ID of payment", default: "8453" },
      { flag: "--tag1", type: "string", required: false, description: "Primary tag" },
      { flag: "--tag2", type: "string", required: false, description: "Secondary tag" },
      { flag: "--note", type: "string", required: false, description: "Feedback note" },
    ],
    returns: {
      success: { reviewTxHash: "string", message: "string" },
      error: { error: "string", detail: "string", exitCode: "number" }
    },
    exitCodes: [
      { code: 0, meaning: "Success" },
      { code: 5, meaning: "Agent not found" },
      { code: 8, meaning: "Invalid proof of payment" }
    ]
  }
};

export async function schema(command?: string): Promise<void> {
  if (!command) {
    // List all available commands
    const commands = Object.keys(SCHEMAS).map(cmd => ({
      command: cmd,
      description: SCHEMAS[cmd].description,
      cost: SCHEMAS[cmd].cost
    }));
    printJson({ commands, usage: "agent-arena schema <command>" });
    return;
  }

  const cmdSchema = SCHEMAS[command];
  if (!cmdSchema) {
    console.error(JSON.stringify({ error: `Unknown command: ${command}`, validCommands: Object.keys(SCHEMAS) }));
    process.exit(2);
  }

  printJson(cmdSchema);
}
