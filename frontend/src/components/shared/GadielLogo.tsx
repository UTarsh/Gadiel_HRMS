/**
 * GadielLogo — SVG approximation of the Gadiel Technologies brand mark.
 * Dark navy background, white G-bracket shape, teal curved right arc.
 */
export function GadielLogo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Dark navy rounded square background */}
      <rect width="40" height="40" rx="8" fill="#1A2E70" />

      {/* G shape in white */}
      {/* Left vertical bar */}
      <rect x="7" y="7" width="5" height="26" rx="2" fill="white" />
      {/* Top horizontal bar */}
      <rect x="7" y="7" width="18" height="5" rx="2" fill="white" />
      {/* Bottom horizontal bar */}
      <rect x="7" y="28" width="18" height="5" rx="2" fill="white" />
      {/* Middle shelf (from left, extends right into G's opening) */}
      <rect x="7" y="18" width="13" height="4" rx="2" fill="white" />

      {/* Teal arc — bold right curve of the G */}
      <path
        d="M24 12 Q38 20 24 28"
        stroke="#00C8E8"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
