export function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const v = (n / 1000).toFixed(1);
    return v.endsWith('.0') ? `${v.slice(0, -2)}k` : `${v}k`;
  }
  const v = (n / 1_000_000).toFixed(1);
  return v.endsWith('.0') ? `${v.slice(0, -2)}M` : `${v}M`;
}

export function timeAgo(unixSec: number, now: number = Date.now()): string {
  const diff = Math.max(0, Math.floor(now / 1000 - unixSec));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604_800) return `${Math.floor(diff / 86_400)}d ago`;
  if (diff < 2_592_000) return `${Math.floor(diff / 604_800)}w ago`;
  if (diff < 31_536_000) return `${Math.floor(diff / 2_592_000)}mo ago`;
  return `${Math.floor(diff / 31_536_000)}y ago`;
}

export function accuracyPct(correct: number, total: number): string {
  if (total === 0) return '—';
  return `${Math.round((correct / total) * 100)}%`;
}
