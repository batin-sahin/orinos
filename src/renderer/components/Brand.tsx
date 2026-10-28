export function Mark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={`mark ${className}`.trim()}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3 3h19M3 3v26h26V9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <rect x="11" y="11" width="10" height="10" fill="currentColor" />
    </svg>
  );
}
