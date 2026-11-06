/**
 * Checks the rule for which status slots a lead shows: two at a time, up to six.
 *
 *   npx tsx scripts/check-lead-statuses.mts
 */
import {
  STATUS_FIELDS,
  allStatusesUsed,
  openStatusSlots,
  savedStatuses,
  statusDraft,
  statusSavedMessage,
} from "../app/(app)/leads/status-options";

let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) fail++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}` +
      (ok ? "" : `\n      got      ${JSON.stringify(actual)}\n      expected ${JSON.stringify(expected)}`)
  );
}

const open = (lead: Record<string, string | null>) => openStatusSlots(lead);

check("new lead shows 1 and 2", open({}), [1, 2]);
check("only status 1 filled: still 1 and 2", open({ status_1: "New" }), [1, 2]);
check("only status 2 filled: still 1 and 2", open({ status_2: "New" }), [1, 2]);
check("a remark alone does not open the next pair", open({ status_1: "New", status_2_remark: "busy" }), [1, 2]);
check("1 and 2 filled: 3 and 4 open", open({ status_1: "New", status_2: "Contacted" }), [1, 2, 3, 4]);
check("1, 2, 3 filled: still up to 4", open({ status_1: "a", status_2: "b", status_3: "c" }), [1, 2, 3, 4]);
check("1 to 4 filled: 5 and 6 open",
  open({ status_1: "a", status_2: "b", status_3: "c", status_4: "d" }), [1, 2, 3, 4, 5, 6]);

const full = { status_1: "a", status_2: "b", status_3: "c", status_4: "d", status_5: "e", status_6: "f" };
check("all six filled: never a seventh", open(full), [1, 2, 3, 4, 5, 6]);
check("all six filled counts as used", allStatusesUsed(full), true);
check("five filled is not used up", allStatusesUsed({ ...full, status_6: null }), false);
check("empty string counts as empty", open({ status_1: "a", status_2: "" }), [1, 2]);

check("clearing 1 keeps saved 3 and 4 on screen",
  open({ status_1: "", status_2: "b", status_3: "c", status_4: "d" }), [1, 2, 3, 4]);
check("clearing 2 keeps a saved status 5 on screen",
  open({ status_1: "a", status_2: "", status_5: "e" }), [1, 2, 3, 4, 5, 6]);
check("a saved remark in a later slot stays on screen", open({ status_3_remark: "note" }), [1, 2, 3, 4]);

check("twelve fields", STATUS_FIELDS.length, 12);
const draft = statusDraft({ status_1: "New", status_1_remark: null });
check("draft turns null into blank", [draft.status_1, draft.status_1_remark, draft.status_6], ["New", "", ""]);
const saved = savedStatuses({ ...draft, status_1_remark: "  called  ", status_2: "" });
check("saved values are trimmed, blanks become null",
  [saved.status_1_remark, saved.status_2], ["called", null]);

check("no new slots: plain message", statusSavedMessage({ status_1: "a" }, { status_1: "b" }), "Status updated");
check("3 and 4 open: says so",
  statusSavedMessage({ status_1: "a" }, { status_1: "a", status_2: "b" }), "Status updated. Status 3 and 4 are now open.");
check("all six used: points at the log",
  statusSavedMessage({ ...full, status_6: null }, full), "All 6 statuses used. Add further updates in the activity log.");

console.log(fail === 0 ? "\nAll checks passed." : `\n${fail} FAILED`);
process.exit(fail === 0 ? 0 : 1);
