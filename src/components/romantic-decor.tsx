import type { CSSProperties } from "react";

export function Blossom({ shade = 0 }: { shade?: number }) {
  const colors = ["#f7b2cb", "#e785aa", "#ffdfc9", "#c9b6e3"];
  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse
          key={angle}
          cx="40"
          cy="23"
          rx="13"
          ry="20"
          transform={`rotate(${angle} 40 40)`}
          fill={colors[shade % 4]}
        />
      ))}
      <circle cx="40" cy="40" r="10" fill="#fff0bc" />
      <circle cx="37" cy="37" r="3" fill="#fffdf2" />
    </svg>
  );
}

export function FlowerGarden({ className = "" }: { className?: string }) {
  return (
    <div className={`flower-garden ${className}`} aria-hidden="true">
      {Array.from({ length: 44 }, (_, i) => {
        const top =
          i < 12
            ? 1 + (i % 3) * 5
            : i < 30
              ? 15 + ((i - 12) % 9) * 8
              : 88 + (i % 3) * 5;
        const left =
          i < 12
            ? 3 + i * 8.3
            : i < 30
              ? (i % 2 ? 93 : 2) + (i % 3) * 1.8
              : 1 + (i - 30) * 7.5;
        return (
          <span
            className="garden-blossom"
            key={i}
            style={
              {
                top: `${top}%`,
                left: `${left}%`,
                width: `${18 + (i % 4) * 9}px`,
                "--bloom-delay": `${-(i % 7) * 1.1}s`,
                "--bloom-turn": `${i * 37}deg`,
              } as CSSProperties
            }
          >
            <Blossom shade={i} />
          </span>
        );
      })}
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={`heart-${i}`}
          className="garden-heart"
          style={{
            left: `${4 + i * 8}%`,
            top: `${i % 2 ? 82 : 12}%`,
            animationDelay: `${-i * 0.6}s`,
          }}
        >
          ♡
        </span>
      ))}
    </div>
  );
}

export function TeddyBear({
  pose = "heart",
  className = "",
}: {
  pose?: "heart" | "bouquet";
  className?: string;
}) {
  return (
    <svg
      className={`teddy-bear ${className}`}
      viewBox="0 0 240 260"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="121" cy="244" rx="85" ry="10" fill="#672d42" opacity=".09" />
      <g stroke="#916443" strokeWidth="3" strokeLinejoin="round">
        <circle cx="61" cy="55" r="29" fill="#dca778" />
        <circle cx="179" cy="55" r="29" fill="#dca778" />
        <circle cx="61" cy="55" r="17" fill="#f1c8b4" stroke="none" />
        <circle cx="179" cy="55" r="17" fill="#f1c8b4" stroke="none" />
        <ellipse cx="120" cy="176" rx="65" ry="64" fill="#e4b384" />
        <ellipse
          cx="120"
          cy="178"
          rx="42"
          ry="47"
          fill="#ffe0b9"
          stroke="none"
        />
        <ellipse
          cx="72"
          cy="226"
          rx="30"
          ry="24"
          transform="rotate(-12 72 226)"
          fill="#dca778"
        />
        <ellipse
          cx="169"
          cy="226"
          rx="30"
          ry="24"
          transform="rotate(12 169 226)"
          fill="#dca778"
        />
        <ellipse
          cx="72"
          cy="228"
          rx="17"
          ry="13"
          fill="#f8d7b0"
          stroke="none"
        />
        <ellipse
          cx="169"
          cy="228"
          rx="17"
          ry="13"
          fill="#f8d7b0"
          stroke="none"
        />
        <path
          d="M47 87C47 45 80 31 120 31C160 31 193 45 193 87C193 127 160 148 120 148C80 148 47 127 47 87Z"
          fill="#eac093"
        />
      </g>
      <path
        d="M84 47Q99 39 111 41"
        stroke="#ffe8ca"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <ellipse cx="78" cy="108" rx="17" ry="10" fill="#eb9c9e" opacity=".75" />
      <ellipse cx="163" cy="108" rx="17" ry="10" fill="#eb9c9e" opacity=".75" />
      <ellipse cx="89" cy="85" rx="7" ry="9" fill="#493128" />
      <ellipse cx="151" cy="85" rx="7" ry="9" fill="#493128" />
      <circle cx="91" cy="82" r="2.3" fill="#fff9f2" />
      <circle cx="153" cy="82" r="2.3" fill="#fff9f2" />
      <ellipse cx="120" cy="108" rx="26" ry="21" fill="#ffdfb8" />
      <path
        d="M111 101Q120 94 129 101Q130 105 120 111Q110 105 111 101Z"
        fill="#78503b"
      />
      <path
        d="M120 110V114M109 114Q114 124 120 115Q126 124 131 114"
        stroke="#78503b"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M114 36L109 32M120 35V29M126 36L131 32"
        stroke="#916443"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {pose === "heart" ? (
        <g>
          <path
            d="M120 211C100 197 77 182 77 163C77 143 102 136 120 155C138 136 163 143 163 163C163 182 140 197 120 211Z"
            fill="#d45c86"
            stroke="#b13f67"
            strokeWidth="3"
          />
          <path
            d="M89 159Q92 148 104 151"
            stroke="#ffb4cc"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M111 174Q120 162 129 174Q129 181 120 187Q111 181 111 174Z"
            fill="#ffe5ef"
          />
        </g>
      ) : (
        <g>
          <path
            d="M81 165L120 221L161 165"
            fill="#fff1db"
            stroke="#d8a46f"
            strokeWidth="2"
          />
          <path
            d="M118 204L101 157M124 204L146 153M120 204V148"
            stroke="#819575"
            strokeWidth="4"
          />
          <path
            d="M113 185Q84 160 95 151Q120 153 113 185M128 189Q149 159 155 171Q153 186 128 189"
            fill="#a5b793"
          />
          {[
            [94, 151, 0.5],
            [145, 147, 0.55],
            [120, 132, 0.58],
          ].map(([x, y, s], i) => (
            <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse
                  key={a}
                  cx="0"
                  cy="-16"
                  rx="12"
                  ry="18"
                  transform={`rotate(${a})`}
                  fill={i % 2 ? "#e785aa" : "#f7b2cb"}
                />
              ))}
              <circle r="8" fill="#ffebb3" />
            </g>
          ))}
          <path
            d="M120 202Q98 187 99 205Q102 216 120 207Q138 216 141 205Q142 187 120 202Z"
            fill="#bf5377"
          />
          <path
            d="M116 207L109 223M124 207L132 223"
            stroke="#bf5377"
            strokeWidth="5"
          />
        </g>
      )}
      <ellipse
        cx="68"
        cy="173"
        rx="20"
        ry="29"
        transform="rotate(-32 68 173)"
        fill="#eac093"
        stroke="#916443"
        strokeWidth="3"
      />
      <ellipse
        cx="172"
        cy="173"
        rx="20"
        ry="29"
        transform="rotate(32 172 173)"
        fill="#eac093"
        stroke="#916443"
        strokeWidth="3"
      />
      <path
        d="M47 168L52 165M53 175L57 172M187 168L192 172"
        stroke="#fbe1be"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M201 65C191 58 190 53 194 50C198 47 201 50 203 52C207 46 214 49 213 54C212 59 207 64 201 65Z"
        fill="#e785aa"
      />
      <path
        d="M30 118L33 110L36 118L44 121L36 124L33 132L30 124L22 121Z"
        fill="#dcb574"
      />
    </svg>
  );
}
