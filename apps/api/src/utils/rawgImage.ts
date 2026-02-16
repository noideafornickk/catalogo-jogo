export function normalizeRawgImageUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    parsed.pathname = parsed.pathname
      .replace(/\/media\/crop\/\d+\/\d+\//, "/media/")
      .replace(/\/media\/resize\/\d+\/-?\//, "/media/");

    return parsed.toString();
  } catch {
    return null;
  }
}
