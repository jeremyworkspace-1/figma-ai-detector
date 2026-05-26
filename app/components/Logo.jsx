export default function Logo({ size = 32 }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Hexagon */}
      <polygon
        points="16,2 28,9 28,23 16,30 4,23 4,9"
        fill="#2563eb"
      />
      {/* Magnifier circle */}
      <circle cx="13.5" cy="13.5" r="5.5" stroke="white" strokeWidth="2.5" />
      {/* Magnifier handle */}
      <line
        x1="17.5" y1="17.5"
        x2="23"   y2="23"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
