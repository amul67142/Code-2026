/**
 * Checks the owner portal guard in proxy.ts: a cookie must be signed with
 * OWNER_SECRET, not merely exist.
 *
 *   npx tsx scripts/check-owner-session.mts
 */
import { NextRequest } from "next/server";

process.env.OWNER_SECRET = "check-only-secret";
const { ownerSessionToken, isOwnerToken } = await import("../lib/owner/session");
const { proxy } = await import("../proxy");

let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) fail++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}` +
      (ok ? "" : `\n      got      ${JSON.stringify(actual)}\n      expected ${JSON.stringify(expected)}`)
  );
}

/** Where the proxy sends this request: a redirect path, or "through". */
async function route(host: string, path: string, cookie?: string) {
  const headers = new Headers({ host });
  if (cookie !== undefined) headers.set("cookie", `owner_session=${cookie}`);
  const res = await proxy(new NextRequest(`https://${host}${path}`, { headers }));
  const to = res.headers.get("location");
  return to ? new URL(to).pathname : "through";
}

const good = (await ownerSessionToken())!;
const LOGIN = "/owner-admin/login";

for (const host of ["www.biglead.site", "owner.biglead.site"]) {
  check(`${host}: no cookie goes to login`, await route(host, "/owner-admin/companies"), LOGIN);
  check(`${host}: made-up cookie goes to login`, await route(host, "/owner-admin/companies", "x"), LOGIN);
  check(`${host}: the old fixed value goes to login`, await route(host, "/owner-admin/companies", "authenticated"), LOGIN);
  check(`${host}: right length, wrong value goes to login`, await route(host, "/owner-admin/companies", "0".repeat(good.length)), LOGIN);
  check(`${host}: signed cookie gets in`, await route(host, "/owner-admin/companies", good), "through");
  check(`${host}: login page stays open without a session`, await route(host, LOGIN), "through");
  check(`${host}: signed cookie skips the login page`, await route(host, LOGIN, good), "/owner-admin");
}

check("token is not the password", good.includes("check-only-secret"), false);
check("empty value is rejected", await isOwnerToken(""), false);
check("undefined is rejected", await isOwnerToken(undefined), false);

process.env.OWNER_SECRET = "a-different-secret";
check("changing OWNER_SECRET ends old sessions", await isOwnerToken(good), false);
delete process.env.OWNER_SECRET;
check("no OWNER_SECRET: nobody gets in", await isOwnerToken(good), false);

console.log(fail === 0 ? "\nAll checks passed." : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
