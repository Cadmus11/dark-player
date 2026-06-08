export function hexToLuminance(hex: string): number {
  const clean = parseHex(hex, '#1a1a2e');
  const r = parseInt(clean.slice(1, 3), 16) / 255;
  const g = parseInt(clean.slice(3, 5), 16) / 255;
  const b = parseInt(clean.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function bestTextColor(bg: string): string {
  const bgLum = hexToLuminance(bg);
  const whiteLum = hexToLuminance('#ffffff');
  return contrastRatio(whiteLum, bgLum) >= 4.5 ? '#ffffff' : '#000000';
}

export function adjustBrightness(hex: string, amount: number): string {
  const clean = parseHex(hex, '#1a1a2e');
  const r = Math.min(255, Math.max(0, parseInt(clean.slice(1, 3), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(clean.slice(3, 5), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(clean.slice(5, 7), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function parseHex(color: string | undefined | null, fallback: string = '#1a1a2e'): string {
  if (!color || color === '#000000') return fallback;
  if (color.startsWith('#')) return color;
  return `#${color}`;
}
