/**
 * Meaningful exit codes for LLM agents to branch on failure modes
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGS: 2,
  AUTH_REQUIRED: 3,      // Private key not set
  PAYMENT_REQUIRED: 4,   // x402 payment failed
  NOT_FOUND: 5,          // Resource not found
  RATE_LIMITED: 6,       // Too many requests
  NETWORK_ERROR: 7,      // Connection failed
  VALIDATION_ERROR: 8,   // Invalid input data
  INSUFFICIENT_FUNDS: 9, // Not enough USDC
} as const;

export type ExitCode = typeof EXIT_CODES[keyof typeof EXIT_CODES];

export function exitWithCode(code: ExitCode, error?: Error | string): never {
  if (error) {
    const message = error instanceof Error ? error.message : error;
    // Error output to stderr
    process.stderr.write(JSON.stringify({ error: message, exitCode: code }) + "\n");
  }
  process.exit(code);
}
