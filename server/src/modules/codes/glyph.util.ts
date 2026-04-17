import { createHash } from 'crypto';

/**
 * Deterministically generate a compact SVG "Glyph Block" for printing.
 * Uses SHA-256 of payload+signature to derive a color palette and an 8x8 block pattern.
 * The glyph is intentionally small, vector (SVG) and deterministic so it can be regenerated
 * from the original payload/signature pair when needed.
 */
export function generateGlyphSvg(payload: string, signature: string, opts?: { size?: number; grid?: number }) {
  const grid = opts?.grid ?? 8; // 8x8 blocks
  const cell = opts?.size ?? 18; // pixels per cell
  const padding = 8;
  const width = grid * cell + padding * 2;
  const height = grid * cell + padding * 2;

  const h = createHash('sha256').update(payload + '|' + signature).digest();

  // derive base color from first three bytes
  const r = h[0];
  const g = h[1];
  const b = h[2];
  const baseColor = `rgb(${r},${g},${b})`;

  // derive accent color from next three bytes (shifted)
  const ar = h[3];
  const ag = h[4];
  const ab = h[5];
  const accent = `rgb(${ar},${ag},${ab})`;

  // build boolean map from hash bytes
  const bits: boolean[] = [];
  for (let i = 6; i < h.length && bits.length < grid * grid; i++) {
    for (let bit = 0; bit < 8 && bits.length < grid * grid; bit++) {
      bits.push(((h[i] >> bit) & 1) === 1);
    }
  }

  // fallback fill pattern if bits insufficient (shouldn't happen)
  while (bits.length < grid * grid) bits.push(false);

  // assemble SVG blocks
  let rects = '';
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const idx = y * grid + x;
      const filled = bits[idx];
      if (!filled) continue; // leave transparent
      // choose color by mixing base and accent using some hash byte
      const mix = h[(idx % (h.length - 1)) + 1] / 255;
      const cr = Math.round(r * (1 - mix) + ar * mix);
      const cg = Math.round(g * (1 - mix) + ag * mix);
      const cb = Math.round(b * (1 - mix) + ab * mix);
      const color = `rgb(${cr},${cg},${cb})`;
      const rx = padding + x * cell;
      const ry = padding + y * cell;
      rects += `<rect x="${rx}" y="${ry}" width="${cell - 2}" height="${cell - 2}" fill="${color}" rx="${Math.max(1, Math.floor(cell * 0.15))}"/>`;
    }
  }

  // subtle background pattern using baseColor with low opacity
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Glyph block">
    <rect width="100%" height="100%" fill="rgba(255,255,255,1)"/>
    <defs>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.08"/>
      </filter>
    </defs>
    <g filter="url(#shadow)">
      <rect x="${padding}" y="${padding}" width="${grid * cell}" height="${grid * cell}" fill="${baseColor}" opacity="0.06" rx="6"/>
      ${rects}
    </g>
    <g transform="translate(${width - padding - 28}, ${height - padding - 14})">
      <text x="0" y="0" font-size="10" font-family="Arial,Helvetica,sans-serif" fill="${accent}" text-anchor="end" dominant-baseline="central">${escapeXml(payload.slice(0,6))}</text>
    </g>
  </svg>`;

  return svg;
}

function escapeXml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c] as string));
}

export default generateGlyphSvg;
