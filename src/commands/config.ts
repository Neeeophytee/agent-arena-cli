import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { printJson, printError, printSuccess, printHeader, printInfo, printWarning } from "../utils/output.js";

const CONFIG_DIR = join(homedir(), ".agent-arena");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

interface ConfigOptions {
  setKey?: string;
  setApi?: string;
  show?: boolean;
}

interface ConfigData {
  apiUrl: string;
  privateKey?: string;
}

function loadConfig(): ConfigData {
  if (existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    } catch {
      return { apiUrl: "https://agentarena.site" };
    }
  }
  return { apiUrl: "https://agentarena.site" };
}

function saveConfig(config: ConfigData): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export async function config(options: ConfigOptions): Promise<void> {
  const currentConfig = loadConfig();

  if (options.setKey) {
    if (!options.setKey.startsWith("0x") || options.setKey.length !== 66) {
      printError("Invalid private key format. Expected 0x followed by 64 hex characters.");
      return;
    }
    currentConfig.privateKey = options.setKey;
    saveConfig(currentConfig);
    printSuccess("Private key saved to ~/.agent-arena/config.json");
    printWarning("Keep this file secure! It contains your private key.");
    return;
  }

  if (options.setApi) {
    try {
      new URL(options.setApi);
      currentConfig.apiUrl = options.setApi;
      saveConfig(currentConfig);
      printSuccess(`API URL set to ${options.setApi}`);
    } catch {
      printError("Invalid URL format");
    }
    return;
  }

  if (options.show) {
    printHeader("Current Configuration");
    console.log();
    console.log("  Config file:", CONFIG_PATH);
    console.log("  API URL:    ", currentConfig.apiUrl);
    console.log("  Private key:", currentConfig.privateKey ? "****" + currentConfig.privateKey.slice(-8) : "Not set");
    console.log();
    printInfo("Environment variables (override config file):");
    console.log("  AGENT_ARENA_API_URL:     ", process.env.AGENT_ARENA_API_URL || "Not set");
    console.log("  AGENT_ARENA_PRIVATE_KEY: ", process.env.AGENT_ARENA_PRIVATE_KEY ? "****" : "Not set");
    return;
  }

  printHeader("Configuration Help");
  console.log();
  console.log("Set your private key for x402 payments:");
  console.log("  agent-arena config --set-key 0xYOUR_PRIVATE_KEY");
  console.log();
  console.log("Set custom API URL:");
  console.log("  agent-arena config --set-api https://your-api.com");
  console.log();
  console.log("Show current configuration:");
  console.log("  agent-arena config --show");
  console.log();
  printInfo("You can also use environment variables:");
  console.log("  export AGENT_ARENA_API_URL=https://agentarena.site");
  console.log("  export AGENT_ARENA_PRIVATE_KEY=0x...");
}
