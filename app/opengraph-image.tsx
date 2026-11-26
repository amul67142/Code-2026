import { ImageResponse } from "next/og";

/** The card shown when a biglead.site link is shared (LinkedIn, WhatsApp, Product Hunt, X). */
export const alt = "BigLead CRM — the real estate CRM that answers every lead on WhatsApp";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LOGO =
  "https://res.cloudinary.com/dy2zpgv6q/image/upload/v1779118448/Gemini_Generated_Image_2kpsnp2kpsnp2kps_1_-Photoroom_ddqkxb.png";

export default function OpengraphImage() {
  const chip = (label: string) => (
    <div
      style={{
        display: "flex",
        padding: "10px 20px",
        borderRadius: 999,
        border: "2px solid #e4e4e7",
        background: "#fafafa",
        fontSize: 26,
        color: "#3f3f46",
      }}
    >
      {label}
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} alt="" height={84} style={{ objectFit: "contain" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 26, color: "#16a34a", fontWeight: 600 }}>
            <div style={{ width: 16, height: 16, borderRadius: 999, background: "#25D366" }} />
            WhatsApp built in
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, fontWeight: 800, color: "#09090b", lineHeight: 1.08, letterSpacing: -2 }}>
            The real estate CRM that answers every lead on WhatsApp
          </div>
          <div style={{ fontSize: 30, color: "#52525b", lineHeight: 1.35 }}>
            Leads from Meta ads, Google, 99acres and your website — assigned instantly, replied to in seconds.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 14 }}>
            {chip("Facebook & Instagram leads")}
            {chip("Auto-assign")}
            {chip("Live Chat")}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#09090b" }}>biglead.site</div>
        </div>
      </div>
    ),
    size
  );
}
