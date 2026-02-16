function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function rating10ToStars(rating: number): number {
  const safeRating = clamp(rating, 1, 10);
  return safeRating / 2;
}

export function starsToRating10(stars: number): number {
  const safeStars = clamp(stars, 0.5, 5);
  return Math.round(safeStars * 2);
}

export function formatStars(stars: number): string {
  return Number.isInteger(stars) ? stars.toFixed(0) : stars.toFixed(1);
}
