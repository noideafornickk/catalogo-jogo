export type GameSummary = {
  rawgId: number;
  title: string;
  coverUrl: string | null;
  released: string | null;
  descriptionPreview?: string | null;
  hasReviews?: boolean;
  avgRating?: number | null;
  reviewCount?: number;
};

export type RawgGameDetails = {
  id: number;
  slug: string;
  name: string;
  coverUrl: string | null;
  descriptionHtml: string;
  descriptionText: string;
  released: string | null;
  metacritic: number | null;
  rating: number | null;
};
