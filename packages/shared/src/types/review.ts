import { Status } from "../constants/enums";

export type ReviewPayload = {
  rawgId: number;
  rating: number;
  recommend: boolean;
  status: Status;
  body?: string;
};

export type ReviewItem = {
  id: string;
  rating: number;
  recommend: boolean;
  status: Status;
  body: string | null;
  likesCount: number;
  likedByMe: boolean;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
  game: {
    rawgId: number;
    title: string;
    coverUrl: string | null;
    released: string | null;
    descriptionPreview: string | null;
    reviewCount: number;
  };
  user: {
    id: string;
    name: string;
    avatarUrl: string;
    isPrivate: boolean;
  };
};
