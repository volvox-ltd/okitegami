export default function IconPostcard({ className = "w-10 h-10" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#fff" stroke="#5d4037" strokeWidth="2"/>
      <path d="M16 8H19V12H16V8Z" fill="#cc4636"/>
      <line x1="4" y1="8" x2="12" y2="8" stroke="#e5e7eb" strokeWidth="2"/>
      <line x1="4" y1="12" x2="12" y2="12" stroke="#e5e7eb" strokeWidth="2"/>
      <line x1="4" y1="16" x2="18" y2="16" stroke="#e5e7eb" strokeWidth="2"/>
    </svg>
  );
}