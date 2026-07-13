export function parsePositiveIntegerLimit(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = String(value);

  if (!/^[1-9]\d*$/.test(normalized)) {
    return null;
  }

  return Number(normalized);
}
