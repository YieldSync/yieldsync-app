export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-1.9H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3l-.9.7-2.5 1.9C4.9 19.7 8.2 22 12 22c2.7 0 4.9-.9 6.5-2.4l-3.1-2.4c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1z"
      />
      <path
        fill="#4A90E2"
        d="M3.2 7.1C2.4 8.6 2 10.2 2 12s.4 3.4 1.2 4.9l3.4-2.6C6.2 13.5 6 12.8 6 12c0-.8.2-1.5.5-2.2L3.2 7.1z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.8c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.9 14.7 2 12 2 8.2 2 4.9 4.3 3.2 7.1l3.3 2.7C7.2 7.5 9.4 5.8 12 5.8z"
      />
    </svg>
  );
}

export function SolanaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id="ys-solana" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9945FF" />
          <stop offset="50%" stopColor="#14F195" />
          <stop offset="100%" stopColor="#00D18C" />
        </linearGradient>
      </defs>
      <path
        fill="url(#ys-solana)"
        d="M5.4 16.5c.15-.15.36-.24.58-.24h14.3c.37 0 .55.44.3.72l-2.38 2.62c-.15.15-.36.24-.58.24H3.32c-.37 0-.55-.44-.3-.72l2.38-2.62zm0-11.4c.15-.15.36-.24.58-.24h14.3c.37 0 .55.44.3.72l-2.38 2.62c-.15.15-.36.24-.58.24H3.32c-.37 0-.55-.44-.3-.72L5.4 5.1zm16.28 5.46c-.15-.15-.36-.24-.58-.24H6.8c-.22 0-.43.09-.58.24l-2.38 2.62c-.25.28-.07.72.3.72h14.3c.22 0 .43-.09.58-.24l2.38-2.62c.25-.28.07-.72-.3-.72z"
      />
    </svg>
  );
}
