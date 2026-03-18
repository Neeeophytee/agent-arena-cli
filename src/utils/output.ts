import chalk from "chalk";

// TTY detection - auto JSON when piped
export function isTTY(): boolean {
  return process.stdout.isTTY === true;
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

// NDJSON for streaming large results
export function printNDJSON(items: unknown[]): void {
  for (const item of items) {
    console.log(JSON.stringify(item));
  }
}

// Human messages go to stderr, data to stdout
export function printError(message: string): void {
  console.error(chalk.red("✖ Error:"), message);
}

export function printStatus(message: string): void {
  // Status messages to stderr so they don't pollute JSON output
  process.stderr.write(chalk.gray(message) + "\n");
}

export function printSuccess(message: string): void {
  console.log(chalk.green("✔"), message);
}

export function printInfo(message: string): void {
  console.log(chalk.blue("ℹ"), message);
}

export function printWarning(message: string): void {
  console.log(chalk.yellow("⚠"), message);
}

export function printHeader(title: string): void {
  console.log();
  console.log(chalk.bold.cyan(title));
  console.log(chalk.gray("─".repeat(50)));
}

export function printAgent(agent: {
  globalId: string;
  name?: string;
  description?: string;
  chain?: string;
  capabilities?: string[];
  reputation?: { score: number; reviewCount?: number };
  pricing?: { per_task?: number };
  x402Support?: boolean;
}): void {
  console.log();
  console.log(chalk.bold(agent.name || "Unknown Agent"));
  console.log(chalk.gray(`  ID: ${agent.globalId}`));
  if (agent.chain) console.log(chalk.gray(`  Chain: ${agent.chain}`));
  if (agent.description) {
    const desc = agent.description.length > 100 
      ? agent.description.slice(0, 100) + "..." 
      : agent.description;
    console.log(chalk.white(`  ${desc}`));
  }
  if (agent.capabilities?.length) {
    console.log(chalk.cyan(`  Capabilities: ${agent.capabilities.slice(0, 5).join(", ")}`));
  }
  if (agent.reputation) {
    const score = agent.reputation.score;
    const scoreColor = score >= 80 ? chalk.green : score >= 50 ? chalk.yellow : chalk.red;
    console.log(`  Reputation: ${scoreColor(score + "/100")} (${agent.reputation.reviewCount || 0} reviews)`);
  }
  if (agent.pricing?.per_task) {
    console.log(chalk.green(`  Price: $${agent.pricing.per_task} USDC/task`));
  }
  if (agent.x402Support) {
    console.log(chalk.magenta(`  ⚡ x402 payments supported`));
  }
}

export function printTable(headers: string[], rows: string[][]): void {
  const colWidths = headers.map((h, i) => 
    Math.max(h.length, ...rows.map(r => (r[i] || "").length))
  );
  
  const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join(" │ ");
  const separator = colWidths.map(w => "─".repeat(w)).join("─┼─");
  
  console.log(chalk.bold(headerRow));
  console.log(chalk.gray(separator));
  
  rows.forEach(row => {
    const rowStr = row.map((cell, i) => (cell || "").padEnd(colWidths[i])).join(" │ ");
    console.log(rowStr);
  });
}
