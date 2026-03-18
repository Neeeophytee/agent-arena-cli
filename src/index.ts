#!/usr/bin/env node

import { Command } from "commander";
import { search } from "./commands/search.js";
import { register } from "./commands/register.js";
import { profile } from "./commands/profile.js";
import { catalog } from "./commands/catalog.js";
import { compare } from "./commands/compare.js";
import { review } from "./commands/review.js";
import { buyer } from "./commands/buyer.js";
import { config } from "./commands/config.js";
import { schema } from "./commands/schema.js";
import { isTTY } from "./utils/output.js";

const program = new Command();

program
  .name("agent-arena")
  .description("CLI for Agent Arena - Search, register, and hire ERC-8004 AI agents across 16 blockchains")
  .version("1.0.0");

// Schema introspection command (for LLM agents)
program
  .command("schema [command]")
  .description("Get JSON schema of command inputs/outputs (for LLM agents)")
  .action(schema);

// Search command
program
  .command("search <query>")
  .description("Search for AI agents by capability, name, or description")
  .option("-c, --chain <chain>", "Filter by chain (base, ethereum, polygon, etc.)")
  .option("-s, --min-score <score>", "Minimum reputation score (0-100)", "0")
  .option("-x, --x402-only", "Only show agents that accept x402 payments")
  .option("-l, --limit <limit>", "Max results to return", "20")
  .option("-o, --offset <offset>", "Pagination offset", "0")
  .option("-b, --buyer <address>", "Your wallet address for discount pricing")
  .option("-H, --human", "Human-readable output (default: JSON)")
  .option("--stream", "Stream results as NDJSON (one JSON object per line)")
  .action(search);

// Register command
program
  .command("register")
  .description("Register a new AI agent on-chain (costs $0.05 USDC)")
  .requiredOption("-n, --name <name>", "Agent display name")
  .requiredOption("-d, --description <description>", "Agent description")
  .option("-c, --capabilities <caps>", "Comma-separated capabilities (e.g., coding,python,api)")
  .option("-e, --endpoint <url>", "Your x402 API endpoint")
  .option("-w, --wallet <address>", "Wallet to receive payments")
  .option("-p, --price <price>", "Price per task in USDC")
  .option("--chain <chain>", "Chain to register on", "base")
  .option("-H, --human", "Human-readable output (default: JSON)")
  .action(register);

// Profile command
program
  .command("profile <globalId>")
  .description("Get full agent profile by globalId or chainId/agentId")
  .option("-H, --human", "Human-readable output (default: JSON)")
  .action(profile);

// Catalog command
program
  .command("catalog")
  .description("Browse the service catalog")
  .option("-c, --category <category>", "Filter by category (weather-data, llm-inference, etc.)")
  .option("-q, --query <query>", "Search query")
  .option("-t, --tag <tag>", "Filter by tag")
  .option("-l, --limit <limit>", "Max results", "20")
  .option("-H, --human", "Human-readable output (default: JSON)")
  .action(catalog);

// Compare command
program
  .command("compare <category>")
  .description("Compare vendors in a category")
  .option("-q, --query <query>", "Additional search query")
  .option("-s, --sort <sort>", "Sort by: reputation, price, latency", "reputation")
  .option("-m, --min-score <score>", "Minimum reputation score", "0")
  .option("-p, --max-price <price>", "Maximum price per call")
  .option("-l, --limit <limit>", "Max results", "10")
  .option("-H, --human", "Human-readable output (default: JSON)")
  .action(compare);

// Review command
program
  .command("review <agentId>")
  .description("Submit a review for an agent (requires proof of payment)")
  .requiredOption("-s, --score <score>", "Score 0-100")
  .requiredOption("-t, --tx-hash <hash>", "Payment transaction hash")
  .requiredOption("-f, --from <address>", "Your wallet address")
  .requiredOption("--to <address>", "Agent wallet address")
  .option("-c, --chain-id <chainId>", "Chain ID of payment", "8453")
  .option("--tag1 <tag>", "Primary tag (e.g., successRate, quality)")
  .option("--tag2 <tag>", "Secondary tag")
  .option("--note <note>", "Feedback note")
  .option("-H, --human", "Human-readable output (default: JSON)")
  .action(review);

// Buyer command
program
  .command("buyer <address>")
  .description("Get buyer reputation and discount eligibility")
  .option("-H, --human", "Human-readable output (default: JSON)")
  .action(buyer);

// Config command
program
  .command("config")
  .description("Configure CLI settings")
  .option("--set-key <key>", "Set your private key for x402 payments")
  .option("--set-api <url>", "Set API base URL")
  .option("--show", "Show current configuration")
  .action(config);

program.parse();
