// Utility helpers for readme-badges (ESM)

export function encode(str) {
  return encodeURIComponent(str ?? '');
}

/**
 * buildShieldUrl()
 * Build a shields.io badge URL with consistent defaults (for-the-badge, white logo).
 */
export function buildShieldUrl({
  label,
  color,
  logo,
  logoColor = 'fff',
  style = 'for-the-badge',
  labelColor,
  link, // not used here; linking is done by wrapping markdown
} = {}) {
  const safeLabel = encode(label);
  const safeColor = encode(color);
  const params = new URLSearchParams();
  if (logo) params.set('logo', logo);
  if (logoColor) params.set('logoColor', logoColor);
  if (style) params.set('style', style);
  if (labelColor) params.set('labelColor', labelColor);
  return `https://img.shields.io/badge/${safeLabel}-${safeColor}.svg?${params.toString()}`;
}

/**
 * toMarkdownBadge()
 * Wrap shields URL in markdown link: [![Label](url)](link)
 */
export function toMarkdownBadge({ label, color, logo, link = '#', logoColor, style, labelColor }) {
  const url = buildShieldUrl({ label, color, logo, logoColor, style, labelColor });
  return `[![${label}](${url})](${link})`;
}

/**
 * capitalize()
 */
export function capitalize(word) {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1);
}
