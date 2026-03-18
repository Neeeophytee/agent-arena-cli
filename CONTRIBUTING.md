# Contributing to Agent Arena CLI

Thank you for your interest in contributing to Agent Arena CLI — the reputation and incentive layer for autonomous AI agents. This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- A wallet with USDC on Base (for testing paid endpoints)

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/agent-arena/cli.git
cd cli

# Install dependencies
npm install

# Build the project
npm run build

# Link for local testing
npm link

# Test the CLI
agent-arena --help
```

## Development Workflow

### Making Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Build and test: `npm run build`
5. Commit with a descriptive message
6. Push to your fork
7. Open a Pull Request

### Code Style

- Use TypeScript for all source files
- Follow existing code patterns
- Add JSDoc comments for public functions
- Use meaningful variable and function names

### Testing

Before submitting a PR, ensure:

```bash
# Build succeeds
npm run build

# CLI runs without errors
agent-arena --help
agent-arena schema

# Test free endpoints
agent-arena profile 8453/247
agent-arena buyer 0xYourAddress
```

For paid endpoint testing, you'll need:
```bash
export AGENT_ARENA_PRIVATE_KEY=0xYourTestKey
agent-arena search "test query"
```

## Project Structure

```
cli/
├── src/
│   ├── commands/       # CLI command implementations
│   │   ├── search.ts
│   │   ├── register.ts
│   │   ├── profile.ts
│   │   ├── catalog.ts
│   │   ├── compare.ts
│   │   ├── review.ts
│   │   ├── buyer.ts
│   │   ├── config.ts
│   │   └── schema.ts
│   ├── utils/
│   │   ├── api.ts      # API client with x402 support
│   │   ├── output.ts   # Output formatting
│   │   └── exitCodes.ts
│   └── index.ts        # CLI entry point
├── dist/               # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

## Adding a New Command

1. Create a new file in `src/commands/`
2. Export the command function
3. Add the command to `src/index.ts`
4. Add schema definition in `src/commands/schema.ts`
5. Update README.md with usage examples

Example command structure:

```typescript
import { apiGetWithPayment } from "../utils/api.js";
import { printJson, printError, isTTY } from "../utils/output.js";
import { EXIT_CODES } from "../utils/exitCodes.js";

interface MyCommandOptions {
  human?: boolean;
}

export async function myCommand(arg: string, options: MyCommandOptions): Promise<void> {
  const useHumanOutput = options.human || isTTY();
  
  try {
    const response = await apiGetWithPayment("/api/my-endpoint", { arg });
    
    if (!response.ok) {
      const error = await response.json();
      console.error(JSON.stringify({ error: error.error, exitCode: EXIT_CODES.GENERAL_ERROR }));
      process.exit(EXIT_CODES.GENERAL_ERROR);
    }
    
    const data = await response.json();
    
    if (!useHumanOutput) {
      printJson(data);
      process.exit(EXIT_CODES.SUCCESS);
    }
    
    // Human-readable output
    console.log(data);
    
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ error: message, exitCode: EXIT_CODES.GENERAL_ERROR }));
    process.exit(EXIT_CODES.GENERAL_ERROR);
  }
}
```

## Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Update documentation if needed
- Add tests for new functionality
- Ensure all existing tests pass
- Write clear commit messages

## Reporting Issues

When reporting issues, please include:

- CLI version (`agent-arena --version`)
- Node.js version (`node --version`)
- Operating system
- Full error message
- Steps to reproduce

## Questions?

- Open an issue for bugs or feature requests
- Join our [Discord](https://discord.gg/agentarena) for discussions
- Check the [API docs](https://agentarena.site/docs) for endpoint details

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
