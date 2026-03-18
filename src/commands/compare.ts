import ora from "ora";
import { apiGetWithPayment } from "../utils/api.js";
import { printJson, printError, printHeader, printInfo } from "../utils/output.js";
import chalk from "chalk";

interface CompareOptions {
  query?: string;
  sort?: string;
  minScore?: string;
  maxPrice?: string;
  limit?: string;
  human?: boolean;
}

interface Vendor {
  globalId: string;
  vendorName: string;
  profileType: string;
  compositeScore: number;
  reputation: { score: number; verifiedReviews: number };
  service: { pricePerCall?: number };
  performance: { avgLatencyMs?: number };
  access: { x402Enabled?: boolean };
}

interface CompareResponse {
  vendorCount?: number;
  recommendation?: {
    vendorName: string;
    compositeScore: number;
    confidence: number;
    reasons: string[];
  };
  vendors?: Vendor[];
}

interface ErrorResponse {
  error?: string;
  validCategories?: string[];
}

export async function compare(category: string, options: CompareOptions): Promise<void> {
  const spinner = ora(`Comparing vendors in ${category}...`).start();

  try {
    const params: Record<string, string> = {
      category,
      sortBy: options.sort || "reputation",
      limit: options.limit || "10",
    };
    if (options.query) params.q = options.query;
    if (options.minScore) params.minScore = options.minScore;
    if (options.maxPrice) params.maxPrice = options.maxPrice;

    const response = await apiGetWithPayment("/api/agent/compare", params);

    if (!response.ok) {
      const error = await response.json() as ErrorResponse;
      spinner.fail("Comparison failed");
      printError(error.error || `HTTP ${response.status}`);
      if (error.validCategories) {
        printInfo("Valid categories: " + error.validCategories.join(", "));
      }
      return;
    }

    const data = await response.json() as CompareResponse;
    spinner.succeed(`Found ${data.vendorCount || 0} vendors`);

    // JSON is default, --human for human-readable
    if (!options.human) {
      printJson(data);
      return;
    }

    printHeader(`Vendor Comparison: ${category}`);

    if (data.recommendation) {
      console.log();
      console.log(chalk.bold.green("★ Recommended:"), data.recommendation.vendorName);
      console.log("  Score:", data.recommendation.compositeScore);
      console.log("  Confidence:", Math.round(data.recommendation.confidence * 100) + "%");
      console.log("  Reasons:");
      for (const reason of data.recommendation.reasons.slice(0, 3)) {
        console.log("    •", reason);
      }
    }

    if (!data.vendors?.length) {
      printInfo("No vendors found.");
      return;
    }

    console.log();
    console.log(chalk.bold("All Vendors (sorted by " + (options.sort || "reputation") + ")"));

    for (let i = 0; i < data.vendors.length; i++) {
      const v = data.vendors[i];
      console.log();
      console.log(`${i + 1}. ${chalk.bold(v.vendorName)}`, chalk.gray(`[${v.profileType}]`));
      console.log("   ID:         ", v.globalId);
      console.log("   Score:      ", v.compositeScore);
      console.log("   Reputation: ", `${v.reputation.score}/100 (${v.reputation.verifiedReviews} verified)`);
      if (v.service.pricePerCall) {
        console.log("   Price:      ", chalk.green(`$${v.service.pricePerCall}/call`));
      }
      if (v.performance.avgLatencyMs) {
        console.log("   Latency:    ", `${v.performance.avgLatencyMs}ms`);
      }
      if (v.access.x402Enabled) {
        console.log("   x402:       ", chalk.magenta("✓"));
      }
    }

  } catch (err) {
    spinner.fail("Comparison failed");
    printError(String(err));
  }
}
