type GunSafeLogoProps = {
  size?: number;
  className?: string;
};

export default function GunSafeLogo({ size = 36, className }: GunSafeLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-4 -4 44 44"
      aria-label="GunSafe logo"
      className={className}
    >
      <g transform="translate(18 22) scale(2) translate(-18 -18)">
        <path
          d="M18 7 24.5 9.4V16c0 4.6-6.5 9-6.5 9s-6.5-4.4-6.5-9V9.4L18 7z"
          fill="#1e3a5f"
          stroke="#3b82f6"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle
          cx="18"
          cy="15.5"
          r="5"
          fill="#2563eb"
          stroke="#60a5fa"
          strokeWidth="1.2"
        />
        <path
          d="M18 12.2 19 14.8h2.7l-2.2 1.6.8 2.7-2.3-1.7-2.3 1.7.8-2.7-2.2-1.6H17L18 12.2z"
          fill="#fbbf24"
          stroke="#f59e0b"
          strokeWidth="0.4"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}