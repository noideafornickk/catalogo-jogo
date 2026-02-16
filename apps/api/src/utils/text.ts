export function toDescriptionPreview(
  value: string | null | undefined,
  maxLength: number = 180
): string | null {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}
