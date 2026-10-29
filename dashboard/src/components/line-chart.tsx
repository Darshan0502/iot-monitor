// A small line chart drawn as SVG, so the dashboard needs no chart library for two lines.

export interface ChartPoint {
  time: number;
  value: number;
}

interface Props {
  label: string;
  unit: string;
  // Oldest first.
  points: ChartPoint[];
  limits: (number | null)[];
  tone: Tone;
  // Times are shown only in the browser, because the server's time zone may differ from the viewer's.
  showTimes: boolean;
}

type Tone = 'orange' | 'sky';

// Written out in full, so Tailwind finds the class names in the source.
const TONES: Record<Tone, { line: string; dot: string }> = {
  orange: { line: 'stroke-orange-500', dot: 'bg-orange-500' },
  sky: { line: 'stroke-sky-500', dot: 'bg-sky-500' },
};

const WIDTH = 600;
const HEIGHT = 180;
const PAD = 6;

export function LineChart({ label, unit, points, limits, tone, showTimes }: Props) {
  const lines = limits.filter((limit): limit is number => limit !== null);
  const last = points.at(-1);

  return (
    <figure className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <figcaption className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-zinc-500 tabular-nums">{last ? `${last.value.toFixed(1)} ${unit}` : ''}</span>
      </figcaption>
      {points.length === 0 ? (
        <p className="mt-3 flex h-44 items-center justify-center text-sm text-zinc-500">No readings yet</p>
      ) : (
        <Plot points={points} lines={lines} unit={unit} tone={tone} showTimes={showTimes} label={label} />
      )}
    </figure>
  );
}

function Plot({ points, lines, unit, tone, showTimes, label }: Omit<Props, 'limits'> & { lines: number[] }) {
  // The value axis always fits the readings and the limits, with a little room above and below.
  let low = Math.min(...points.map((point) => point.value), ...lines);
  let high = Math.max(...points.map((point) => point.value), ...lines);
  if (high - low < 1) {
    low -= 0.5;
    high += 0.5;
  }
  const room = (high - low) * 0.1;
  low -= room;
  high += room;

  const first = points[0].time;
  const lastTime = points[points.length - 1].time;
  const x = (time: number) => (lastTime === first ? WIDTH / 2 : PAD + ((time - first) / (lastTime - first)) * (WIDTH - 2 * PAD));
  const y = (value: number) => PAD + (1 - (value - low) / (high - low)) * (HEIGHT - 2 * PAD);
  const path = points.map((point, i) => `${i === 0 ? 'M' : 'L'}${x(point.time).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ');
  const end = points[points.length - 1];

  return (
    <>
      <div className="relative mt-3 h-44">
        {/* Stretched to the box; the strokes keep their width because of vector-effect. */}
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="size-full" role="img" aria-label={`${label}, ${points.length} readings`}>
          {lines.map((limit) => (
            <line key={limit} x1={0} x2={WIDTH} y1={y(limit)} y2={y(limit)} className="stroke-red-400" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={path} fill="none" className={TONES[tone].line} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {/* The newest point and the axis labels are HTML, so the stretched SVG cannot squash them. */}
        <span
          aria-hidden
          className={`absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${TONES[tone].dot}`}
          style={{ left: `${(x(end.time) / WIDTH) * 100}%`, top: `${(y(end.value) / HEIGHT) * 100}%` }}
        />
        <span className="absolute top-0 left-0 text-[10px] text-zinc-400 tabular-nums">
          {high.toFixed(1)} {unit}
        </span>
        <span className="absolute bottom-0 left-0 text-[10px] text-zinc-400 tabular-nums">
          {low.toFixed(1)} {unit}
        </span>
      </div>
      <div className="mt-1 flex justify-between text-xs text-zinc-500 tabular-nums">
        <span>{showTimes ? new Date(first).toLocaleTimeString() : ''}</span>
        <span>{showTimes ? new Date(lastTime).toLocaleTimeString() : ''}</span>
      </div>
      {lines.length > 0 && <p className="mt-1 text-xs text-zinc-400">Dashed: alert limits</p>}
    </>
  );
}
