export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function toIsoDate(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}
