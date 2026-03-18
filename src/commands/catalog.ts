import ora from "ora";
import { apiGetWithPayment } from "../utils/api.js";
import { printJson, printError, printHeader, printInfo, printTable } from "../utils/output.js";
import chalk from "chalk";

interface CatalogOptions {
  category?: string;
  query?: string;
  tag?: string;
  limit?: string;
  human?: boolean;
}

interface CatalogService {
  vendorName: string;
  profileType: string;
  globalId: string;
  service: { name: string; pricePerCall?: number };
  access: { x402Enabled?: boolean };
}

interface CatalogResponse {
  overview?: {
    totalRegisteredAgents?: number;
    x402EnabledAgents?: number;
    enrichedVendorServices?: number;
  };
  enrichedCategories?: { category: string; enrichedServices: number }[];
  meta?: { returned?: number };
  services?: CatalogService[];
}

interface ErrorResponse {
  error?: string;
}

export async function catalog(options: CatalogOptions): Promise<void> {
  const spinner = ora("Fetching catalog...").start();

  try {
    const params: Record<string, string> = {};
    if (options.category) params.category = options.category;
    if (options.query) params.q = options.query;
    if (options.tag) params.tag = options.tag;
    if (options.limit) params.limit = options.limit;

    const response = await apiGetWithPayment("/api/agent/catalog", params);

    if (!response.ok) {
      const error = await response.json() as ErrorResponse;
      spinner.fail("Failed to fetch catalog");
      printError(error.error || `HTTP ${response.status}`);
      return;
    }

    const data = await response.json() as CatalogResponse;
    spinner.succeed("Catalog loaded");

    // JSON is default, --human for human-readable
    if (!options.human) {
      printJson(data);
      return;
    }

    if (!options.category && !options.query && !options.tag) {
      printHeader("Service Catalog Overview");
      console.log();
      console.log(chalk.bold("Registry Stats"));
      console.log("  Total Registered Agents:  ", data.overview?.totalRegisteredAgents || 0);
      console.log("  x402 Enabled Agents:      ", data.overview?.x402EnabledAgents || 0);
      console.log("  Enriched Vendor Services: ", data.overview?.enrichedVendorServices || 0);

      if (data.enrichedCategories?.length) {
        console.log();
        console.log(chalk.bold("Categories with Enriched Profiles"));
        printTable(
          ["Category", "Services"],
          data.enrichedCategories.map((c: { category: string; enrichedServices: number }) => [
            c.category,
            String(c.enrichedServices),
          ])
        );
      }

      console.log();
      printInfo("Usage: agent-arena catalog --category weather-data");
      return;
    }

    printHeader("Catalog Results");
    printInfo(`Found ${data.meta?.returned || 0} services`);

    if (!data.services?.length) {
      printInfo("No services found.");
      return;
    }

    for (const svc of data.services) {
      console.log();
      console.log(chalk.bold(svc.vendorName), chalk.gray(`(${svc.profileType})`));
      console.log("  ID:      ", svc.globalId);
      console.log("  Service: ", svc.service.name);
      if (svc.service.pricePerCall) {
        console.log("  Price:   ", chalk.green(`$${svc.service.pricePerCall}/call`));
      }
      if (svc.access.x402Enabled) {
        console.log("  x402:    ", chalk.magenta("✓ Enabled"));
      }
    }

  } catch (err) {
    spinner.fail("Failed to fetch catalog");
    printError(String(err));
  }
}
