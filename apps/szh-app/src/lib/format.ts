const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function relativeTime(iso?: string): string {
  if (!iso) return '—';
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return 'just now';
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), 'day');
  return dateTime(iso);
}

export function dateTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
}

export function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour12: false });
}

export function duration(start?: string, end?: string): string {
  if (!start) return '—';
  const s = Math.max(0, Math.round(((end ? new Date(end) : new Date()).getTime() - new Date(start).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = bytes / 1024, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

export const shortId = (id: string) => id.slice(0, 8);
