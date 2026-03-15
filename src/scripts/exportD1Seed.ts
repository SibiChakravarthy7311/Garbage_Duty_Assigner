import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../config.js";

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

async function main(): Promise<void> {
  const config = loadConfig();
  const stateFile = config.stateFile;
  const outputFile = path.resolve(process.cwd(), "d1-seed.sql");
  const state = await fs.readFile(stateFile, "utf8");
  const updatedAt = new Date().toISOString();

  const sql =
    "INSERT INTO app_state (id, value, updated_at) VALUES " +
    `('primary', '${escapeSqlString(state)}', '${updatedAt}') ` +
    "ON CONFLICT(id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;\n";

  await fs.writeFile(outputFile, sql, "utf8");
  console.log(`Wrote ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
