type Props = {
  className?: string;
  withWordmark?: boolean;
};

export function Logo({ className = "", withWordmark = true }: Props) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="h-7 w-7 shrink-0"
      >
        <path
          d="M16 3 L27.26 9.5 L27.26 22.5 L16 29 L4.74 22.5 L4.74 9.5 Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M22.5 12.25 L22.5 19.75 L16 23.5 L9.5 19.75 L9.5 12.25 L16 8.5"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      {withWordmark && (
        <span className="text-title text-[17px] font-semibold">HiveMind</span>
      )}
    </span>
  );
}
