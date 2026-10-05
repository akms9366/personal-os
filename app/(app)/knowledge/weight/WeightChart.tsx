"use client";

import { useState, type PointerEvent } from "react";

export interface WeightPoint {
  date: string;
  label: string;
  weightKg: number;
}

// viewBox はスマホ幅に近い寸法にして、文字が縮小されすぎないようにする。
const WIDTH = 360;
const HEIGHT = 170;
const PAD = { top: 10, right: 8, bottom: 22, left: 34 };

function niceTicks(min: number, max: number): number[] {
  const span = Math.max(max - min, 1);
  const step = span <= 3 ? 0.5 : span <= 8 ? 1 : span <= 20 ? 2 : 5;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= max + step / 2; value += step) {
    ticks.push(Math.round(value * 10) / 10);
  }
  return ticks;
}

/// 体重の推移（単一系列の折れ線）。系列が1つなので凡例は置かず、見出しで系列を示す。
/// ホバー/タップで縦線と値を表示する。数値の一覧は下の記録リストが兼ねる。
export function WeightChart({ points }: { points: WeightPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <p className="text-sm text-fog">
        2件以上記録するとグラフが表示されます。
      </p>
    );
  }

  const times = points.map((p) => new Date(`${p.date}T00:00:00Z`).getTime());
  const minT = times[0];
  const maxT = times[times.length - 1];
  const weights = points.map((p) => p.weightKg);
  const ticks = niceTicks(Math.min(...weights), Math.max(...weights));
  const minY = ticks[0];
  const maxY = ticks[ticks.length - 1];

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (t: number) =>
    PAD.left +
    (maxT === minT ? plotW / 2 : ((t - minT) / (maxT - minT)) * plotW);
  const y = (v: number) =>
    PAD.top +
    (maxY === minY ? plotH / 2 : (1 - (v - minY) / (maxY - minY)) * plotH);

  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${x(times[i]).toFixed(1)},${y(p.weightKg).toFixed(1)}`,
    )
    .join(" ");

  function handleMove(event: PointerEvent<SVGRectElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = PAD.left + ((event.clientX - rect.left) / rect.width) * plotW;
    let nearest = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(x(times[i]) - px) < Math.abs(x(times[nearest]) - px)) {
        nearest = i;
      }
    }
    setHover(nearest);
  }

  const active = hover !== null ? points[hover] : null;
  const showDots = points.length <= 40;

  return (
    <div className="relative text-ink">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="体重の推移"
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              className="stroke-dove/70"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-fog font-mono text-[10px]"
            >
              {tick}
            </text>
          </g>
        ))}
        <text
          x={PAD.left}
          y={HEIGHT - 6}
          className="fill-fog font-mono text-[10px]"
        >
          {points[0].label}
        </text>
        <text
          x={WIDTH - PAD.right}
          y={HEIGHT - 6}
          textAnchor="end"
          className="fill-fog font-mono text-[10px]"
        >
          {points[points.length - 1].label}
        </text>

        <path
          d={`${path} L${x(maxT).toFixed(1)},${HEIGHT - PAD.bottom} L${x(minT).toFixed(1)},${HEIGHT - PAD.bottom} Z`}
          fill="currentColor"
          opacity={0.05}
        />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {showDots
          ? points.map((p, i) => (
              <circle
                key={p.date}
                cx={x(times[i])}
                cy={y(p.weightKg)}
                r={2}
                fill="currentColor"
              />
            ))
          : null}

        {active && hover !== null ? (
          <g>
            <line
              x1={x(times[hover])}
              x2={x(times[hover])}
              y1={PAD.top}
              y2={HEIGHT - PAD.bottom}
              className="stroke-pewter"
              strokeWidth={1}
            />
            <circle
              cx={x(times[hover])}
              cy={y(active.weightKg)}
              r={5}
              fill="currentColor"
              className="stroke-paper"
              strokeWidth={2}
            />
          </g>
        ) : null}

        <rect
          x={PAD.left}
          y={PAD.top}
          width={plotW}
          height={plotH}
          fill="transparent"
          onPointerMove={handleMove}
          onPointerDown={handleMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {active && hover !== null ? (
        <div
          className={`pointer-events-none absolute top-0 rounded-lg bg-paper px-2.5 py-1.5 text-xs whitespace-nowrap shadow-float ${
            hover > points.length / 2 ? "-translate-x-full" : ""
          }`}
          style={{ left: `${(x(times[hover]) / WIDTH) * 100}%` }}
        >
          <span className="font-mono text-fog">{active.label}</span>{" "}
          <span className="font-medium tabular-nums">
            {active.weightKg.toFixed(1)} kg
          </span>
        </div>
      ) : null}
    </div>
  );
}
