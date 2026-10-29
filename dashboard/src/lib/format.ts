export function formatValue(value: number | null, unit: string): string {
  return value === null ? '—' : `${value.toFixed(1)} ${unit}`;
}

// "2–8 °C", "above 2 °C", "below 8 °C", or null when there is no limit on either side.
export function formatRange(min: number | null, max: number | null, unit: string): string | null {
  if (min !== null && max !== null) return `${min}–${max} ${unit}`;
  if (min !== null) return `above ${min} ${unit}`;
  if (max !== null) return `below ${max} ${unit}`;
  return null;
}

export function timeAgo(iso: string, now: Date): string {
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds} s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString();
}
