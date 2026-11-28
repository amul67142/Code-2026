/**
 * Checks the status → stage rule against the two real pipelines.
 *
 *   npx tsx scripts/check-auto-stage.mts
 */
import { autoStageFor, latestStatus, type StageRow } from "../lib/leads/auto-stage";

let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `\n      got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`}`);
}

const mk = (names: string[], won: string[] = []): StageRow[] =>
  names.map((name, i) => ({ id: `s${i}`, name, stage_order: i, is_won: won.includes(name), is_terminal: false }));

const mvd = mk(["New Lead", "Contacted", "Site Visit Scheduled", "Site Visit Done", "Negotiation", "Booking", "Closed Won", "Closed Lost"]);
const st = mk(["New", "Contacted", "Qualified", "disqualified", "Booked a Visit / Appt.", "Site vist sc", "lead won"], ["lead won"]);
const name = (s: StageRow | null) => (s ? s.name : null);

// ── MVD ──
check("MVD: Contacted from New → Contacted", name(autoStageFor("Contacted", "s0", mvd)), "Contacted");
check("MVD: Follow Up → Contacted", name(autoStageFor("Follow Up", "s0", mvd)), "Contacted");
check("MVD: Interested → Contacted", name(autoStageFor("Interested", "s0", mvd)), "Contacted");
check("MVD: Site Visit Scheduled → same stage", name(autoStageFor("Site Visit Scheduled", "s0", mvd)), "Site Visit Scheduled");
check("MVD: Site Visit Done → same stage", name(autoStageFor("Site Visit Done", "s1", mvd)), "Site Visit Done");
check("MVD: Negotiation → Negotiation", name(autoStageFor("Negotiation", "s0", mvd)), "Negotiation");
check("MVD: Not Interested moves nothing", name(autoStageFor("Not Interested", "s0", mvd)), null);
check("MVD: Lost moves nothing", name(autoStageFor("Lost", "s0", mvd)), null);
check("MVD: Booking Done moves nothing", name(autoStageFor("Booking Done", "s0", mvd)), null);
check("MVD: New moves nothing", name(autoStageFor("New", "s0", mvd)), null);
check("MVD: forward only (in Negotiation, Contacted → stay)", name(autoStageFor("Contacted", "s4", mvd)), null);
check("MVD: same stage → no move", name(autoStageFor("Follow Up", "s1", mvd)), null);
check("MVD: closed lead is left alone", name(autoStageFor("Negotiation", "s7", mvd)), null);
check("MVD: no stage set → treated as start", name(autoStageFor("Contacted", null, mvd)), "Contacted");
check("MVD: case/spacing tolerant", name(autoStageFor("  follow up ", "s0", mvd)), "Contacted");

// ── SpaceTrans (custom names) ──
check("ST: Contacted → Contacted", name(autoStageFor("Contacted", "s0", st)), "Contacted");
check("ST: Site Visit Scheduled → Booked a Visit", name(autoStageFor("Site Visit Scheduled", "s0", st)), "Booked a Visit / Appt.");
check("ST: Site Visit Done (no such stage) → falls back, but forward only", name(autoStageFor("Site Visit Done", "s0", st)), "Contacted");
check("ST: Negotiation (no such stage) from Qualified → stays", name(autoStageFor("Negotiation", "s2", st)), null);
check("ST: won stage never a target", name(autoStageFor("Site Visit Done", "s5", st)), null);
check("ST: lead won left alone", name(autoStageFor("Contacted", "s6", st)), null);

// ── Latest status ──
check("latest = highest filled slot", latestStatus({ status_1: "Contacted", status_2: "Follow Up", status_3: "" }), "Follow Up");
check("latest skips blanks", latestStatus({ status_1: "Interested", status_2: null, status_3: "  " }), "Interested");
check("no statuses", latestStatus({}), null);

console.log(fail ? `\n${fail} FAILED` : "\nall passed");
process.exit(fail ? 1 : 0);
