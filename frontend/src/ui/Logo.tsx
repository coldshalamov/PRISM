/* PRISM mark: a single beam of data enters a prism and leaves as three separated rays:
   what is preserved (violet), what stays exposed (orange) and what is lost (grey). */
export function Logo({ size = 28, title = 'PRISM' }: { size?: number; title?: string }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={title}>
      <path className="logo-beam" d="M1.5 17.5 H11.2" stroke="#eef0f4" strokeWidth="2.2" strokeLinecap="round" />
      <path className="logo-prism" d="M10.6 6.2 L22.8 26.2 H3.9 Z" fill="#171a20" stroke="#eef0f4" strokeWidth="1.7" strokeLinejoin="round" transform="translate(2.4 -0.8) scale(0.92)" />
      <path className="logo-ray ray-1" d="M20.5 15.2 L30.5 8.6" stroke="#9b8bff" strokeWidth="2.2" strokeLinecap="round" />
      <path className="logo-ray ray-2" d="M21.4 17.9 L30.5 17.9" stroke="#ff8a4c" strokeWidth="2.2" strokeLinecap="round" />
      <path className="logo-ray ray-3" d="M20.5 20.6 L30.5 27.2" stroke="#7b8492" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
