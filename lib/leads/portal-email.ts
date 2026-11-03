/**
 * Portal relay email addresses.
 *
 * 99acres, MagicBricks and the rest never hand over the buyer's real email.
 * They mint a masked relay instead — `9541547393@99acres.com` — which is the
 * lead's own phone number at the portal's domain. Mail sent there bounces or
 * lands in a portal inbox nobody reads, and the address is dead weight in a
 * CRM: it tells a rep nothing and it is not a way to reach the lead.
 *
 * So we spot those on the way in and replace them with a readable placeholder
 * built from the lead's name and number, keeping the original on the row.
 *
 * ── The placeholder domain is gmail.com, and what that costs ────────────
 * Chosen deliberately: these leads go on to Trident's CRM, which wants an
 * address that looks like an address, and this deployment does not use Meta's
 * Conversions API. The cost is that a synthesized address is indistinguishable
 * from a real one by sight, so NOTHING may infer "placeholder" from the domain
 * — `rajupatel7393@gmail.com` could equally be a genuine lead's own address,
 * and a domain test would wrongly condemn every real Gmail address we hold.
 *
 * The `leads.email_is_synthetic` column is therefore the single source of
 * truth, and the only thing stopping BigLead mailing an address that may
 * belong to an unrelated person. Code that decides whether to send to, hash,
 * or export an address reads that flag. Nothing downstream of us can: the
 * client's own CRM and a rep's mail client will treat these as real, which is
 * why the UI labels them and the CRM payload carries email_is_placeholder.
 *
 * Switching to an undeliverable domain (`no-email.invalid`, reserved by
 * RFC 2606) makes the whole class of mistake impossible — change
 * SYNTHETIC_DOMAIN below if that trade ever looks better.
 */

/** Domain appended to every synthesized address. See the note above. */
export const SYNTHETIC_DOMAIN = "gmail.com";

/** Property portals that hand out a masked relay instead of a real address. */
const PORTAL_RELAY_DOMAINS = [
  "99acres.com",
  "magicbricks.com",
  "housing.com",
  "proptiger.com",
  "squareyards.com",
  "commonfloor.com",
  "nobroker.in",
  "makaan.com",
];

function digitsOf(value: string | null | undefined): string {
  return (value || "").replace(/\D/g, "");
}

/** Deterministic 4-char tag, so the same input always yields the same address. */
function shortHash(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).padStart(4, "0").slice(-4);
}

/**
 * Is this a portal relay rather than the lead's own address?
 *
 * Two tests. A known portal domain, including subdomains of one. Or — for a
 * portal we have not met yet — a local part that IS the lead's own phone
 * number, which is the trick every one of them uses. The second test is kept
 * tied to the lead's number on purpose: plenty of real addresses are all
 * digits (QQ Mail hands out `1234567@qq.com`), so an all-digit local part by
 * itself proves nothing.
 */
export function isPortalRelayEmail(
  email: string | null | undefined,
  phone?: string | null
): boolean {
  const address = (email || "").trim().toLowerCase();
  const at = address.lastIndexOf("@");
  if (at < 1) return false;

  const domain = address.slice(at + 1);
  if (PORTAL_RELAY_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) {
    return true;
  }

  const local = digitsOf(address.slice(0, at));
  const leadPhone = digitsOf(phone);
  return local.length >= 10 && leadPhone.length >= 10 && leadPhone.endsWith(local.slice(-10));
}

/**
 * Build the replacement: the lead's name, then the last four digits of their
 * number, e.g. "Raju Patel" + 9541547393 → `rajupatel9541@no-email.invalid`.
 *
 * Deterministic, never random — the same lead arriving twice must produce the
 * same address or duplicate detection stops catching it.
 */
export function synthesizeLeadEmail(
  name: string | null | undefined,
  phone: string | null | undefined,
  seed?: string
): string {
  // Letters only: portals routinely stuff the number into the name field
  // ("raju 9541547393"), and we add our own digits below.
  const slug = (name || "").toLowerCase().replace(/[^a-z]/g, "").slice(0, 24) || "lead";
  const tail = digitsOf(phone).slice(-4) || shortHash(seed || slug);
  return `${slug}${tail}@${SYNTHETIC_DOMAIN}`;
}

/**
 * Deliberately NOT provided: a predicate that decides syntheticity from the
 * address itself. With SYNTHETIC_DOMAIN set to a real mail domain that is not
 * decidable — read `leads.email_is_synthetic` instead.
 */

export interface ResolvedLeadEmail {
  /** What to store on the lead. */
  email: string | null;
  /** Was it synthesized? Persist as `leads.email_is_synthetic`. */
  synthetic: boolean;
  /** The portal relay we replaced. Persist as `leads.email_original`. */
  original: string | null;
}

/**
 * Normalize an inbound email into what belongs on the lead row.
 * A real address passes through lowercased; a portal relay is swapped out.
 */
export function resolveLeadEmail(input: {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}): ResolvedLeadEmail {
  const address = input.email?.trim().toLowerCase() || null;
  if (!address) return { email: null, synthetic: false, original: null };

  if (!isPortalRelayEmail(address, input.phone)) {
    return { email: address, synthetic: false, original: null };
  }

  return {
    email: synthesizeLeadEmail(input.name, input.phone, address),
    synthetic: true,
    original: address,
  };
}
