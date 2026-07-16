"use client";

/**
 * "Every source → one pipeline" visual for the Use Cases section.
 * Replaces the old third-party-logos GIF with an on-theme, monochrome,
 * always-moving SVG: lead sources on the left, animated packets flowing along
 * dashed paths into the BigLead node. Subtle motion only — no glow.
 */

const SOURCES = [
  "Facebook Ads",
  "Google Ads",
  "Instagram",
  "Website Forms",
  "WhatsApp",
  "CSV Import",
];

// Chip rows (y of each chip top) and the path end offsets into the node.
const ROWS = [22, 70, 118, 166, 214, 262];
const END_Y = [138, 147, 156, 165, 174, 183];

const STAGE_COLORS = ["#3b82f6", "#fbbf24", "#06b6d4", "#10b981"];

export function SourcesFlow({ isDark }: { isDark: boolean }) {
  const chipFill = isDark ? "#0a0a0a" : "#ffffff";
  const chipBorder = isDark ? "#27272a" : "#e5e7eb";
  const chipText = isDark ? "#d4d4d8" : "#374151";
  const bullet = isDark ? "#52525b" : "#9ca3af";
  const path = isDark ? "#3f3f46" : "#d1d5db";
  const packet = isDark ? "#a1a1aa" : "#6b7280";
  const nodeFill = isDark ? "#0a0a0a" : "#ffffff";
  const nodeBorder = isDark ? "#3f3f46" : "#d1d5db";
  const nodeTitle = isDark ? "#fafafa" : "#111827";
  const nodeSub = isDark ? "#71717a" : "#9ca3af";

  return (
    <div className="w-full max-w-lg">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes sf-dash { to { stroke-dashoffset: -16; } }
        .sf-path { animation: sf-dash 1.6s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .sf-path { animation: none !important; }
          .sf-packet { display: none !important; }
        }
      `,
        }}
      />
      <svg
        viewBox="0 0 460 320"
        className="w-full h-auto"
        role="img"
        aria-label="Leads from every source flow into one BigLead pipeline"
      >
        {/* connector paths */}
        {ROWS.map((y, i) => {
          const cy = y + 15;
          const d = `M 138 ${cy} C 220 ${cy}, 235 ${END_Y[i]}, 306 ${END_Y[i]}`;
          return (
            <g key={i}>
              <path
                d={d}
                fill="none"
                stroke={path}
                strokeWidth="1.4"
                strokeDasharray="4 5"
                strokeLinecap="round"
                className="sf-path"
              />
              {/* travelling packet */}
              <circle r="3" fill={packet} className="sf-packet" opacity="0.9">
                <animateMotion
                  dur={`${2.6 + i * 0.35}s`}
                  begin={`${i * 0.45}s`}
                  repeatCount="indefinite"
                  path={d}
                />
              </circle>
            </g>
          );
        })}

        {/* source chips */}
        {SOURCES.map((label, i) => (
          <g key={label}>
            <rect
              x="8"
              y={ROWS[i]}
              width="130"
              height="30"
              rx="15"
              fill={chipFill}
              stroke={chipBorder}
              strokeWidth="1"
            />
            <circle cx="26" cy={ROWS[i] + 15} r="3" fill={bullet} />
            <text
              x="38"
              y={ROWS[i] + 19}
              fontSize="11"
              fontWeight="600"
              fill={chipText}
              fontFamily="inherit"
            >
              {label}
            </text>
          </g>
        ))}

        {/* BigLead node */}
        <g>
          <rect
            x="306"
            y="112"
            width="146"
            height="96"
            rx="18"
            fill={nodeFill}
            stroke={nodeBorder}
            strokeWidth="1.4"
          />
          <text
            x="379"
            y="150"
            textAnchor="middle"
            fontSize="17"
            fontWeight="800"
            fill={nodeTitle}
            fontFamily="inherit"
            letterSpacing="-0.4"
          >
            BigLead
          </text>
          <text
            x="379"
            y="168"
            textAnchor="middle"
            fontSize="9"
            fontWeight="500"
            fill={nodeSub}
            fontFamily="inherit"
            letterSpacing="0.6"
          >
            ONE PIPELINE
          </text>
          {/* mini stage progress bar — echoes the hero pipeline */}
          {STAGE_COLORS.map((c, i) => (
            <rect
              key={c}
              x={326 + i * 27.5}
              y="182"
              width="24"
              height="4"
              rx="2"
              fill={c}
              opacity="0.9"
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
