import ora from "ora";
import { apiPost } from "../utils/api.js";
import { printJson, printError, printHeader, printSuccess, printInfo } from "../utils/output.js";

interface ReviewOptions {
  score: string;
  txHash: string;
  from: string;
  to: string;
  chainId?: string;
  tag1?: string;
  tag2?: string;
  note?: string;
  human?: boolean;
}

export async function review(agentId: string, options: ReviewOptions): Promise<void> {
  const spinner = ora("Submitting review...").start();

  try {
    const score = parseInt(options.score);
    if (isNaN(score) || score < 0 || score > 100) {
      spinner.fail("Invalid score");
      printError("Score must be between 0 and 100");
      return;
    }

    const body = {
      agentId,
      score,
      proofOfPayment: {
        txHash: options.txHash,
        fromAddress: options.from,
        toAddress: options.to,
        chainId: parseInt(options.chainId || "8453"),
      },
      tag1: options.tag1,
      tag2: options.tag2,
      feedbackNote: options.note,
    };

    const response = await apiPost("/api/review", body);

    if (!response.ok) {
      const error = await response.json() as { error?: string; detail?: string; hint?: string };
      spinner.fail("Review submission failed");
      printError(error.error || `HTTP ${response.status}`);
      if (error.detail) printError(error.detail);
      if (error.hint) printInfo(error.hint);
      return;
    }

    const data = await response.json() as { reviewTxHash?: string; message?: string };
    spinner.succeed("Review submitted!");

    // JSON is default, --human for human-readable
    if (!options.human) {
      printJson(data);
      return;
    }

    printHeader("Review Submitted");
    printSuccess(data.message || "Review recorded on-chain");
    console.log();
    console.log("  Agent:   ", agentId);
    console.log("  Score:   ", score + "/100");
    console.log("  TX Hash: ", data.reviewTxHash);

  } catch (err) {
    spinner.fail("Review submission failed");
    printError(String(err));
  }
}
