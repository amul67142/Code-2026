import {
  resolveLeadEmail,
  isPortalRelayEmail,
  synthesizeLeadEmail,
  SYNTHETIC_DOMAIN,
} from "../lib/leads/portal-email";

let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}\n      got      ${JSON.stringify(actual)}` + (ok ? "" : `\n      expected ${JSON.stringify(expected)}`));
}

// ── The actual 99acres case ──────────────────────────────────────
check("99acres relay detected",
  isPortalRelayEmail("9541547393@99acres.com"), true);

check("99acres relay rewritten",
  resolveLeadEmail({ name: "Raju Patel", phone: "+91 95415 47393", email: "9541547393@99acres.com" }),
  { email: `rajupatel7393@${SYNTHETIC_DOMAIN}`, synthetic: true, original: "9541547393@99acres.com" });

check("number stuffed in the name field is stripped",
  resolveLeadEmail({ name: "raju 9541547393", phone: "9541547393", email: "9541547393@99acres.com" }).email,
  `raju7393@${SYNTHETIC_DOMAIN}`);

check("deterministic — same lead twice, same address",
  synthesizeLeadEmail("Raju Patel", "9541547393") === synthesizeLeadEmail("Raju Patel", "9541547393"), true);

check("uppercase / spaced relay still caught",
  isPortalRelayEmail("  9541547393@99Acres.com  "), true);

check("portal subdomain caught",
  isPortalRelayEmail("abc@leads.magicbricks.com"), true);

// ── Unknown portal using the same trick ──────────────────────────
check("unknown domain, local part IS the lead's number",
  isPortalRelayEmail("9541547393@somebroker.in", "+919541547393"), true);

check("unknown domain, digits unrelated to the lead → left alone",
  isPortalRelayEmail("1234567890@somebroker.in", "+919541547393"), false);

// ── Real addresses must survive untouched ────────────────────────
check("ordinary gmail untouched",
  resolveLeadEmail({ name: "Raju Patel", phone: "9541547393", email: "Raju.Patel@Gmail.com" }),
  { email: "raju.patel@gmail.com", synthetic: false, original: null });

check("all-digit QQ Mail address is real, not a relay",
  isPortalRelayEmail("1234567@qq.com", "9541547393"), false);

check("no email in, no email out",
  resolveLeadEmail({ name: "Raju", phone: "9541547393", email: null }),
  { email: null, synthetic: false, original: null });

check("blank email string",
  resolveLeadEmail({ name: "Raju", phone: "954", email: "   " }),
  { email: null, synthetic: false, original: null });

// ── Edge cases ───────────────────────────────────────────────────
check("no name → 'lead' slug",
  resolveLeadEmail({ name: "", phone: "9541547393", email: "x@99acres.com" }).email,
  `lead7393@${SYNTHETIC_DOMAIN}`);

check("no phone → deterministic hash tail, still synthetic",
  (() => { const r = resolveLeadEmail({ name: "Raju Patel", phone: null, email: "x@99acres.com" });
           return [r.synthetic, r.email === resolveLeadEmail({ name: "Raju Patel", phone: null, email: "x@99acres.com" }).email]; })(),
  [true, true]);

check("very long name truncated to 24 letters",
  synthesizeLeadEmail("Abcdefghij Klmnopqrst Uvwxyz Extra", "1234").split("@")[0],
  "abcdefghijklmnopqrstuvwx1234");

check("malformed address with no @ is not a relay",
  isPortalRelayEmail("notanemail", "9541547393"), false);

check("synthesized address lands on the configured domain",
  resolveLeadEmail({ name: "Raju Patel", phone: "9541547393", email: "x@99acres.com" }).email?.endsWith(`@${SYNTHETIC_DOMAIN}`), true);

// With SYNTHETIC_DOMAIN on a real mail domain, a real address on that same
// domain must still pass through untouched and unflagged. This is the check
// that fails loudest if anything ever infers "placeholder" from the domain.
check("a real address on the placeholder domain is left alone and unflagged",
  resolveLeadEmail({ name: "Raju Patel", phone: "9541547393", email: `rajupatel7393@${SYNTHETIC_DOMAIN}` }),
  { email: `rajupatel7393@${SYNTHETIC_DOMAIN}`, synthetic: false, original: null });

console.log(fail === 0 ? "\nAll checks passed." : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
