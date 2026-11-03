/**
 * The database URL for one-off scripts, read from .env.local (SUPABASE_DB_URL).
 * Never hard-code it: this repository is public.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function fromEnvFile() {
  try {
    for (const line of readFileSync(join(root, ".env.local"), "utf-8").split("\n")) {
      const m = line.match(/^\s*SUPABASE_DB_URL\s*=\s*(.*)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, "");
    }
  } catch {}
  return undefined;
}

export const DATABASE_URL = process.env.SUPABASE_DB_URL || fromEnvFile();
if (!DATABASE_URL) {
  console.error("SUPABASE_DB_URL is not set. Add it to .env.local.");
  process.exit(1);
}
