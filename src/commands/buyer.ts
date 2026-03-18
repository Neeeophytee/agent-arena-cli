import ora from "ora";
import { apiGet } from "../utils/api.js";
import { printJson, printError, printHeader } from "../utils/output.js";
import chalk from "chalk";

interface BuyerOptions {
  human?: boolean;
}

export async function buyer(address: string, options: BuyerOptions): Promise<void> {
  const spinner = ora("Fetching buyer reputation...").start();

  try {
    const response = await apiGet(`/api/buyer/${address}`);

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      spinner.fail("Failed to fetch buyer reputation");
      printError(error.error || `HTTP ${response.status}`);
      return;
    }

    const data = await response.json() as {
      buyerId: string;
      buyerAddress: string;
      metrics: {
        paymentCount: number;
        totalVolumeUsdc: number;
        reviewsGiven: number;
        avgReviewScore: number | null;
        disputeCount: number;
        disputeRate: number;
        accountAgeDays: number;
      };
      reputation: {
        score: number;
        tier: string;
        reviewFairnessScore: number | null;
        discountEligibility: number;
      };
    };
    spinner.succeed("Buyer reputation loaded");

    // JSON is default, --human for human-readable
    if (!options.human) {
      printJson(data);
      return;
    }

    printHeader("Buyer Reputation");

    console.log();
    console.log(chalk.bold("Identity"));
    console.log("  Buyer ID: ", data.buyerId);
    console.log("  Address:  ", data.buyerAddress);

    console.log();
    console.log(chalk.bold("Metrics"));
    console.log("  Payments Made:    ", data.metrics.paymentCount);
    console.log("  Total Volume:     ", `$${data.metrics.totalVolumeUsdc} USDC`);
    console.log("  Reviews Given:    ", data.metrics.reviewsGiven);
    console.log("  Avg Review Score: ", data.metrics.avgReviewScore ?? "N/A");
    console.log("  Dispute Count:    ", data.metrics.disputeCount);
    console.log("  Dispute Rate:     ", `${(data.metrics.disputeRate * 100).toFixed(1)}%`);
    console.log("  Account Age:      ", `${data.metrics.accountAgeDays} days`);

    console.log();
    console.log(chalk.bold("Reputation"));
    const tier = data.reputation.tier;
    const tierColor = tier === "premium" ? chalk.magenta : tier === "trusted" ? chalk.green : tier === "verified" ? chalk.blue : chalk.gray;
    console.log("  Score:            ", data.reputation.score);
    console.log("  Tier:             ", tierColor(tier.toUpperCase()));
    console.log("  Fairness Score:   ", data.reputation.reviewFairnessScore ?? "N/A");
    console.log("  Discount:         ", chalk.green(`${data.reputation.discountEligibility}%`));

  } catch (err) {
    spinner.fail("Failed to fetch buyer reputation");
    printError(String(err));
  }
}
