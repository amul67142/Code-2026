/**
 * Checks how a template's review status is read from Meta: the webhook event
 * mapping, and the single-template lookup used before an alert is skipped.
 *
 *   npx tsx scripts/check-template-status.mts
 */
import { getMetaTemplateStatus } from "../lib/integrations/whatsapp";

// template-status.ts pulls in the Supabase client; only the pure mapping is
// needed here, so it is imported lazily with dummy env set.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://localhost";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "x";
const { statusFromEvent } = await import("../lib/integrations/template-status");

let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) fail++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}` +
      (ok ? "" : `\n      got      ${JSON.stringify(actual)}\n      expected ${JSON.stringify(expected)}`)
  );
}

check("approved", statusFromEvent("APPROVED"), "APPROVED");
check("reinstated counts as approved", statusFromEvent("REINSTATED"), "APPROVED");
check("rejected", statusFromEvent("rejected"), "REJECTED");
check("unknown event is ignored", statusFromEvent("SOMETHING_NEW"), null);
check("missing event is ignored", statusFromEvent(undefined), null);

// Meta's name filter matches by prefix and returns every language.
let lastUrl = "";
globalThis.fetch = (async (url: string) => {
  lastUrl = url;
  return new Response(
    JSON.stringify({
      data: [
        { name: "agent_new_lead_alert_v2", language: "en_US", status: "REJECTED" },
        { name: "agent_new_lead_alert", language: "hi", status: "PENDING" },
        { name: "agent_new_lead_alert", language: "en_US", status: "APPROVED" },
      ],
    }),
    { status: 200 }
  );
}) as typeof fetch;

check("exact name and language", await getMetaTemplateStatus("w", "t", "agent_new_lead_alert", "en_US"), "APPROVED");
check("other language", await getMetaTemplateStatus("w", "t", "agent_new_lead_alert", "hi"), "PENDING");
check("not on Meta", await getMetaTemplateStatus("w", "t", "agent_new_lead_alert", "en_GB"), null);
check("asks for one name only", lastUrl.includes("name=agent_new_lead_alert&"), true);

globalThis.fetch = (async () =>
  new Response(JSON.stringify({ error: { message: "Invalid token" } }), { status: 400 })) as typeof fetch;
let threw = "";
try {
  await getMetaTemplateStatus("w", "t", "x", "en_US");
} catch (e) {
  threw = (e as Error).message;
}
check("Meta error is raised for the caller to handle", threw, "Invalid token");

console.log(fail === 0 ? "\nAll checks passed." : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
