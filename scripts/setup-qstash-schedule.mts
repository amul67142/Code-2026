/**
 * Create (or update) the QStash schedule that runs billing housekeeping hourly.
 *
 *   npx tsx scripts/setup-qstash-schedule.mts --url https://your-live-domain
 *
 * Needs QSTASH_TOKEN in .env.local — the same Upstash account Prasaar uses is
 * fine. The live app must also have QSTASH_CURRENT_SIGNING_KEY and
 * QSTASH_NEXT_SIGNING_KEY set in Vercel, or it will reject the calls.
 *
 * --url is required on purpose: .env.local's app URL points at a local ngrok
 * tunnel, and a schedule aimed there would fail silently every hour.
 * Safe to re-run: the fixed scheduleId updates the one schedule in place.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Client } from "@upstash/qstash";

const __dirname = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(__dirname, "..", ".env.local"), "utf-8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const SCHEDULE_ID = "biglead-billing-hourly";
const CRON = "0 * * * *"; // on the hour, every hour

const urlArg = process.argv[process.argv.indexOf("--url") + 1];
if (!process.argv.includes("--url") || !urlArg || !/^https:\/\//.test(urlArg)) {
  console.error("Pass the live site: --url https://your-domain (https only)");
  process.exit(1);
}
const token = process.env.QSTASH_TOKEN;
if (!token) {
  console.error("QSTASH_TOKEN is not in .env.local. Copy it from the Upstash console (QStash → Request builder).");
  process.exit(1);
}

const destination = `${urlArg.replace(/\/$/, "")}/api/cron/billing`;
const client = new Client({ token, baseUrl: process.env.QSTASH_URL });

const res = await client.schedules.create({
  scheduleId: SCHEDULE_ID,
  destination,
  cron: CRON,
  method: "POST",
  retries: 2,
});

console.log(`Schedule ${res.scheduleId}: POST ${destination} at "${CRON}" (UTC).`);
console.log("Check it under QStash → Schedules in the Upstash console; the first run is at the top of the next hour.");
process.exit(0);
