export function Botanical({
  className = "",
  variant = "pink",
}: {
  className?: string;
  variant?: "pink" | "sage";
}) {
  const pink = variant === "pink";
  return (
    <svg
      className={className}
      viewBox="0 0 400 560"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M190 530C180 390 255 330 205 145M194 450C115 380 90 300 102 245M212 354C300 300 319 210 306 155"
        stroke="#8a9b7a"
        strokeWidth="3"
      />
      {[
        [181, 447, -45],
        [206, 391, 40],
        [132, 360, -60],
        [213, 295, -40],
        [268, 273, 45],
        [225, 225, 25],
        [110, 291, -28],
        [301, 212, 55],
      ].map(([x, y, a], i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx="15"
          ry="39"
          transform={`rotate(${a} ${x} ${y})`}
          fill={i % 2 ? "#a4b292" : "#8a9b7a"}
          opacity=".7"
        />
      ))}
      {[
        [204, 126, 1],
        [94, 232, 0.65],
        [304, 144, 0.8],
      ].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <ellipse
              key={a}
              cx="0"
              cy="-25"
              rx="25"
              ry="39"
              transform={`rotate(${a})`}
              fill={pink ? "#edbacb" : "#ded8c4"}
              opacity=".9"
            />
          ))}
          {[30, 120, 210, 300].map((a) => (
            <ellipse
              key={a}
              cx="0"
              cy="-14"
              rx="16"
              ry="25"
              transform={`rotate(${a})`}
              fill={pink ? "#f5d5de" : "#f1e9d4"}
            />
          ))}
          <circle r="10" fill="#b79758" />
          <circle r="5" fill="#e6c783" />
        </g>
      ))}
      <path
        d="M65 195Q70 177 77 172M286 104Q280 84 267 79"
        stroke="#a0ad8d"
        strokeWidth="2"
      />
      <circle cx="77" cy="169" r="6" fill="#e4b4c3" />
      <circle cx="264" cy="78" r="6" fill="#e4b4c3" />
    </svg>
  );
}
export function Sprig() {
  return (
    <svg
      width="88"
      height="40"
      viewBox="0 0 88 40"
      fill="none"
      aria-hidden="true"
    >
      <path d="M3 35Q40 16 84 8" stroke="#8a9b7a" />
      <path
        d="M22 27Q9 6 33 20M44 18Q35 0 55 13M60 15Q64 35 44 22M77 10Q65 0 83 5"
        fill="#8a9b7a"
        opacity=".8"
      />
    </svg>
  );
}
