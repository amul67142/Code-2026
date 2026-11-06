/**
 * Checks the "new lead assigned" email: each lead gets its own subject so mail
 * apps do not fold them into one thread, and lead details cannot inject HTML.
 *
 *   npx tsx scripts/check-agent-lead-email.mts
 */
import { getNewLeadEmailHtml, newLeadSubject } from "../lib/email/templates";

let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) fail++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}` +
      (ok ? "" : `\n      got      ${JSON.stringify(actual)}\n      expected ${JSON.stringify(expected)}`)
  );
}

const a = "a1b2c3d4-0000-0000-0000-000000000000";
const b = "ffee0011-0000-0000-0000-000000000000";

check("subject names the lead and a reference", newLeadSubject("Riya Sharma", a), "New lead: Riya Sharma #A1B2C3");
check("two leads with the same name differ", newLeadSubject("Rahul", a) === newLeadSubject("Rahul", b), false);
check("line breaks cannot reach the subject", newLeadSubject("Riya\r\nBcc: x@y.z", a), "New lead: Riya Bcc: x@y.z #A1B2C3");
check("a very long name is cut, the reference stays",
  newLeadSubject("x".repeat(200), a).endsWith("#A1B2C3") && newLeadSubject("x".repeat(200), a).length < 90, true);

const html = getNewLeadEmailHtml(
  "Aman",
  '<img src=x onerror="alert(1)">',
  '"><script>bad()</script>',
  "<b>FB</b>",
  "https://www.biglead.site/leads/1"
);
check("no raw tags from the lead", /<img src=x|<script>bad|<b>FB/.test(html), false);
check("the name still reads", html.includes("&lt;img src=x"), true);
check("plain details are unchanged", getNewLeadEmailHtml("Aman", "Riya", "+919000000001", "WEBSITE FORM", "u").includes("+919000000001"), true);
check("the link is kept", html.includes('href="https://www.biglead.site/leads/1"'), true);

console.log(fail === 0 ? "\nAll checks passed." : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
