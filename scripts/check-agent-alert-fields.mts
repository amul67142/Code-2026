/**
 * Checks for lib/automation/agent-alert-fields.ts.
 *
 *   npx tsx scripts/check-agent-alert-fields.mts
 *
 * The mapping decides how many body parameters an alert sends. Meta rejects
 * the whole message (#132000) when that count differs from the template's, so
 * every alert would fail silently on a wrong fit — hence these.
 */
import {
  defaultAlertMapping,
  fitAlertMapping,
  isAlertField,
  templateVariableCount,
  STANDARD_ALERT_TEMPLATE,
} from "../lib/automation/agent-alert-fields";

let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) fail++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}` +
      (ok ? "" : `\n      got      ${JSON.stringify(actual)}\n      expected ${JSON.stringify(expected)}`)
  );
}

// ── Defaults: name and number first ───────────────────────────────
check("default for 2 vars is name then number", defaultAlertMapping(2), ["lead_name", "lead_phone"]);
check("default for 3 adds project", defaultAlertMapping(3), ["lead_name", "lead_phone", "project"]);
check("default for 0 is empty", defaultAlertMapping(0), []);
check("negative count does not throw", defaultAlertMapping(-1), []);

// ── Counting a template's variables ───────────────────────────────
check("standard template has 3 variables", templateVariableCount(STANDARD_ALERT_TEMPLATE.body), 3);
check("repeated {{1}} counts once", templateVariableCount("Hi {{1}}, yes {{1}}, call {{2}}"), 2);
check("spaces inside braces still count", templateVariableCount("Hi {{ 1 }} and {{2 }}"), 2);
check("no variables", templateVariableCount("Plain text only"), 0);
check("null body", templateVariableCount(null), 0);

// ── Fitting a saved mapping to a template ─────────────────────────
check("exact fit is kept", fitAlertMapping(["project", "lead_phone"], 2), ["project", "lead_phone"]);
check("too long is trimmed", fitAlertMapping(["lead_name", "lead_phone", "budget"], 2), ["lead_name", "lead_phone"]);
check("too short is padded with unused defaults",
  fitAlertMapping(["lead_phone"], 3), ["lead_phone", "lead_name", "project"]);
check("empty saved mapping becomes the default", fitAlertMapping([], 2), ["lead_name", "lead_phone"]);
check("unknown keys are dropped, then padded",
  fitAlertMapping(["bogus", "lead_phone"], 2), ["lead_phone", "lead_name"]);
check("non-array saved value is treated as empty", fitAlertMapping("lead_name", 2), ["lead_name", "lead_phone"]);
check("null saved value", fitAlertMapping(null, 1), ["lead_name"]);
check("zero-variable template sends nothing", fitAlertMapping(["lead_name"], 0), []);
check("output length always equals the template's count",
  [0, 1, 2, 3, 5, 12].every((n) => fitAlertMapping(["lead_phone", "x"], n).length === n), true);

// ── Field keys ────────────────────────────────────────────────────
check("known key", isAlertField("lead_phone"), true);
check("unknown key", isAlertField("phone"), false);
check("non-string", isAlertField(3), false);
check("standard mapping uses only known keys", STANDARD_ALERT_TEMPLATE.mapping.every(isAlertField), true);
check("standard mapping matches its own body",
  STANDARD_ALERT_TEMPLATE.mapping.length, templateVariableCount(STANDARD_ALERT_TEMPLATE.body));
check("standard samples match its own body",
  STANDARD_ALERT_TEMPLATE.samples.length, templateVariableCount(STANDARD_ALERT_TEMPLATE.body));

console.log(fail === 0 ? "\nAll checks passed." : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
