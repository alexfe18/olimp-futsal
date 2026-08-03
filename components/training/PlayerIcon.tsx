export default function PlayerIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" aria-hidden="true">
      <circle cx="15" cy="7" r="4" fill="currentColor" />

      <path
        d="M12 12.5L17 11L21 15.5L25 14"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M16.5 12L14 19L9 24"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M14 19L20 22L22 27"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="26" cy="24" r="4" stroke="currentColor" strokeWidth="2" />

      <path d="M24 22.5L26 21L28 22.5L27.3 25L24.7 25Z" fill="currentColor" />
    </svg>
  );
}
