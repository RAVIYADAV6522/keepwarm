// "Ember", KeepWarm's little flame. Happy and bouncing while things load; sleepy and cold when they can't.
export function Mascot({ mood = "happy", size = 112 }: { mood?: "happy" | "sleepy"; size?: number }) {
  const sleepy = mood === "sleepy";
  return (
    <svg width={size} height={size * 1.25} viewBox="12 6 40 50" aria-hidden="true" className={sleepy ? "mascot mascot-sleepy" : "mascot"}>
      <defs>
        <linearGradient id={`ember-${mood}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sleepy ? "#aab3c5" : "#e9c98b"} />
          <stop offset="1" stopColor={sleepy ? "#6d768b" : "#b08a45"} />
        </linearGradient>
      </defs>
      <ellipse className="mascot-shadow" cx="32" cy="53.5" rx="8" ry="1.5" fill="currentColor" opacity="0.18" />
      <g className="mascot-body">
        <path d="M32 14c-6 9-12 14-12 23a12 12 0 0 0 24 0c0-5-2-8-5-12-1 4-3 6-5 7 1-6 0-12-2-18Z" fill={`url(#ember-${mood})`} />
        <ellipse cx="26.6" cy="31" rx="1.3" ry="2.8" fill="#fff" opacity="0.35" transform="rotate(18 26.6 31)" />
        {sleepy ? (
          <>
            <path d="M26.8 38.2q1.6 1.3 3.2 0M34 38.2q1.6 1.3 3.2 0" stroke="#141a2b" strokeWidth="0.9" fill="none" strokeLinecap="round" />
            <circle cx="32" cy="42.4" r="0.95" fill="#141a2b" />
            <g className="mascot-z" fill="currentColor" fontFamily="Georgia, serif" fontWeight="700">
              <text x="40" y="22" fontSize="5">z</text>
              <text x="44" y="17" fontSize="3.6">z</text>
            </g>
          </>
        ) : (
          <>
            <g className="mascot-eyes" fill="#141a2b">
              <ellipse cx="28.4" cy="38" rx="1.35" ry="1.7" />
              <ellipse cx="35.6" cy="38" rx="1.35" ry="1.7" />
              <circle cx="28.9" cy="37.4" r="0.45" fill="#fff" />
              <circle cx="36.1" cy="37.4" r="0.45" fill="#fff" />
            </g>
            <path d="M30.3 41.2q1.7 1.6 3.4 0" stroke="#141a2b" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          </>
        )}
        <ellipse cx="25.8" cy="41.3" rx="1.6" ry="0.95" fill="#f28b82" opacity={sleepy ? 0.35 : 0.6} />
        <ellipse cx="38.2" cy="41.3" rx="1.6" ry="0.95" fill="#f28b82" opacity={sleepy ? 0.35 : 0.6} />
      </g>
    </svg>
  );
}
