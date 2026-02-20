"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cropper, { type Area } from "react-easy-crop";
import { useSession } from "next-auth/react";
import type { BadgeVisibility, FavoritesResponse } from "@gamebox/shared/types/api";
import type { FavoriteGame, GameSummary } from "@gamebox/shared/types/game";
import type { RankBadge } from "@gamebox/shared/types/rank";
import { GameSearchModal } from "@/components/games/GameSearchModal";
import { PermanentBadges } from "@/components/users/PermanentBadges";
import { RankBadgeIcons } from "@/components/users/RankBadgeIcons";
import { ProfilePageSkeleton } from "@/components/states/ProfilePageSkeleton";
import { useDebouncedValue } from "@/lib/utils/debounce";
import { buildSuspendedPath, getSuspendedUntilFromApiError } from "@/lib/utils/suspension";

type AvatarCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ProfileResponse = {
  id: string;
  name: string;
  rankBadges: RankBadge[];
  avatarUrl: string;
  avatarPublicId: string | null;
  avatarCrop: AvatarCrop | null;
  bio: string | null;
  isPrivate: boolean;
  badgeVisibility: BadgeVisibility;
  counts: {
    totalReviews: number;
    finishedCount: number;
    playingCount: number;
    wishlistCount: number;
    droppedCount: number;
    totalLikesReceived: number;
    followersCount: number;
    followingCount: number;
  };
  favorites: FavoriteGame[];
};

const DEFAULT_BADGE_VISIBILITY: BadgeVisibility = {
  first_of_many: true,
  reviews_master: true,
  review_critic: true,
  followers_star: true,
  full_explorer: true
};

type UploadAvatarResponse = {
  publicId: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const { status } = useSession();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [badgeVisibility, setBadgeVisibility] = useState<BadgeVisibility>(
    DEFAULT_BADGE_VISIBILITY
  );
  const [editingName, setEditingName] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [favoritesModalOpen, setFavoritesModalOpen] = useState(false);
  const [favoriteDraft, setFavoriteDraft] = useState<FavoriteGame[]>([]);
  const [favoriteSearch, setFavoriteSearch] = useState("");
  const [favoriteResults, setFavoriteResults] = useState<GameSummary[]>([]);
  const [favoriteSearchLoading, setFavoriteSearchLoading] = useState(false);
  const [favoriteSaving, setFavoriteSaving] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const debouncedFavoriteSearch = useDebouncedValue(favoriteSearch, 300);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function loadProfile() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/bff/profile");
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string; suspendedUntil?: string | null }
          | null;
        if (data?.error === "account_suspended") {
          router.replace(buildSuspendedPath(getSuspendedUntilFromApiError(data)));
          return;
        }
        throw new Error(data?.error ?? "Falha ao carregar perfil");
      }

      const data = (await response.json()) as ProfileResponse;
      setProfile(data);
      setName(data.name);
      setBio(data.bio ?? "");
      setIsPrivate(data.isPrivate);
      setBadgeVisibility(data.badgeVisibility ?? DEFAULT_BADGE_VISIBILITY);
      setFavoriteDraft(data.favorites ?? []);
      setAvatarError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      void loadProfile();
      return;
    }

    if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  async function saveProfile() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/bff/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, bio, isPrivate, badgeVisibility })
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string; suspendedUntil?: string | null }
          | null;
        if (data?.error === "account_suspended") {
          router.replace(buildSuspendedPath(getSuspendedUntilFromApiError(data)));
          return;
        }
        throw new Error(data?.error ?? "Falha ao atualizar perfil");
      }

      const data = (await response.json()) as ProfileResponse;
      setProfile(data);
      setName(data.name);
      setBio(data.bio ?? "");
      setIsPrivate(data.isPrivate);
      setBadgeVisibility(data.badgeVisibility ?? DEFAULT_BADGE_VISIBILITY);
      setFavoriteDraft(data.favorites ?? []);
      setEditingName(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  function resetNameEdit() {
    if (profile) {
      setName(profile.name);
    }
    setEditingName(false);
  }

  function closeCropModal() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setIsCropModalOpen(false);
  }

  function handleAvatarFileSelection(file: File) {
    setAvatarError(null);
    setError(null);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setIsCropModalOpen(true);
  }

  async function saveAvatarCrop() {
    if (!selectedFile) {
      setAvatarError("Selecione uma imagem antes de salvar.");
      return;
    }

    if (!croppedAreaPixels) {
      setAvatarError("Não foi possível identificar a área do recorte.");
      return;
    }

    setAvatarUploading(true);
    setAvatarError(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("avatar", selectedFile);

      const uploadResponse = await fetch("/api/bff/profile/avatar", {
        method: "POST",
        body: formData
      });

      if (!uploadResponse.ok) {
        const uploadData = (await uploadResponse.json().catch(() => null)) as
          | { error?: string; suspendedUntil?: string | null }
          | null;
        if (uploadData?.error === "account_suspended") {
          router.replace(buildSuspendedPath(getSuspendedUntilFromApiError(uploadData)));
          return;
        }
        throw new Error(uploadData?.error ?? "Falha ao enviar avatar original");
      }

      const uploadData = (await uploadResponse.json()) as UploadAvatarResponse;
      if (!uploadData.publicId) {
        throw new Error("Falha ao receber publicId do avatar.");
      }

      const cropPayload: AvatarCrop = {
        x: Math.round(croppedAreaPixels.x),
        y: Math.round(croppedAreaPixels.y),
        width: Math.round(croppedAreaPixels.width),
        height: Math.round(croppedAreaPixels.height)
      };

      const applyResponse = await fetch("/api/bff/profile/avatar", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          publicId: uploadData.publicId,
          crop: cropPayload
        })
      });

      if (!applyResponse.ok) {
        const applyData = (await applyResponse.json().catch(() => null)) as
          | { error?: string; suspendedUntil?: string | null }
          | null;
        if (applyData?.error === "account_suspended") {
          router.replace(buildSuspendedPath(getSuspendedUntilFromApiError(applyData)));
          return;
        }
        throw new Error(applyData?.error ?? "Falha ao aplicar recorte do avatar");
      }

      const profileData = (await applyResponse.json()) as ProfileResponse;
      setProfile(profileData);
      setName(profileData.name);
      setBio(profileData.bio ?? "");
      setIsPrivate(profileData.isPrivate);
      setBadgeVisibility(profileData.badgeVisibility ?? DEFAULT_BADGE_VISIBILITY);
      setFavoriteDraft(profileData.favorites ?? []);
      closeCropModal();
    } catch (uploadError) {
      setAvatarError(uploadError instanceof Error ? uploadError.message : "Erro inesperado ao atualizar avatar");
    } finally {
      setAvatarUploading(false);
    }
  }

  function normalizeFavoritePositions(items: FavoriteGame[]): FavoriteGame[] {
    return items.map((item, index) => ({
      ...item,
      position: index + 1
    }));
  }

  function openFavoritesModal() {
    if (!profile) {
      return;
    }

    setFavoriteDraft(normalizeFavoritePositions(profile.favorites ?? []));
    setFavoriteSearch("");
    setFavoriteResults([]);
    setFavoriteError(null);
    setFavoritesModalOpen(true);
  }

  function closeFavoritesModal() {
    setFavoritesModalOpen(false);
    setFavoriteSearch("");
    setFavoriteResults([]);
    setFavoriteError(null);
  }

  function addFavoriteGame(game: GameSummary) {
    let reachedLimit = false;

    setFavoriteDraft((previous) => {
      if (previous.some((item) => item.rawgId === game.rawgId)) {
        return previous;
      }

      if (previous.length >= 4) {
        reachedLimit = true;
        return previous;
      }

      return normalizeFavoritePositions([
        ...previous,
        {
          position: previous.length + 1,
          rawgId: game.rawgId,
          title: game.title,
          coverUrl: game.coverUrl ?? null,
          released: game.released ?? null
        }
      ]);
    });

    if (reachedLimit) {
      setFavoriteError("Você pode ter no máximo 4 favoritos.");
      return;
    }

    setFavoriteError(null);
  }

  function removeFavoriteGame(rawgId: number) {
    setFavoriteDraft((previous) =>
      normalizeFavoritePositions(previous.filter((item) => item.rawgId !== rawgId))
    );
    setFavoriteError(null);
  }

  function moveFavoriteGame(rawgId: number, direction: -1 | 1) {
    setFavoriteDraft((previous) => {
      const currentIndex = previous.findIndex((item) => item.rawgId === rawgId);
      if (currentIndex < 0) {
        return previous;
      }

      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= previous.length) {
        return previous;
      }

      const next = [...previous];
      [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
      return normalizeFavoritePositions(next);
    });
  }

  async function saveFavoriteGames() {
    setFavoriteSaving(true);
    setFavoriteError(null);

    try {
      const response = await fetch("/api/bff/profile/favorites", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          rawgIds: favoriteDraft.map((item) => item.rawgId)
        })
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string; suspendedUntil?: string | null }
          | null;
        if (data?.error === "account_suspended") {
          router.replace(buildSuspendedPath(getSuspendedUntilFromApiError(data)));
          return;
        }
        throw new Error(data?.error ?? "Falha ao salvar favoritos.");
      }

      const data = (await response.json()) as FavoritesResponse;
      const nextFavorites = data.items ?? [];

      setFavoriteDraft(nextFavorites);
      setProfile((previous) =>
        previous
          ? {
              ...previous,
              favorites: nextFavorites
            }
          : previous
      );
      closeFavoritesModal();
    } catch (saveError) {
      setFavoriteError(saveError instanceof Error ? saveError.message : "Erro inesperado");
    } finally {
      setFavoriteSaving(false);
    }
  }

  useEffect(() => {
    if (!favoritesModalOpen) {
      return;
    }

    const query = debouncedFavoriteSearch.trim();
    if (query.length < 2) {
      setFavoriteResults([]);
      setFavoriteSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    setFavoriteSearchLoading(true);

    async function runSearch() {
      try {
        const response = await fetch(`/api/bff/rawg/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("Falha ao buscar jogos.");
        }

        const data = (await response.json()) as GameSummary[];
        const selectedIds = new Set(favoriteDraft.map((item) => item.rawgId));
        setFavoriteResults(data.filter((item) => !selectedIds.has(item.rawgId)).slice(0, 8));
      } catch (searchError) {
        if (searchError instanceof DOMException && searchError.name === "AbortError") {
          return;
        }

        setFavoriteResults([]);
        setFavoriteError(searchError instanceof Error ? searchError.message : "Falha ao buscar jogos.");
      } finally {
        setFavoriteSearchLoading(false);
      }
    }

    void runSearch();

    return () => {
      controller.abort();
    };
  }, [debouncedFavoriteSearch, favoriteDraft, favoritesModalOpen]);

  if (status === "loading") {
    return <ProfilePageSkeleton />;
  }

  if (status === "unauthenticated") {
    return (
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-700">Você precisa logar para começar a resenhar.</p>
        <Link
          href="/login"
          className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          Ir para login
        </Link>
      </section>
    );
  }

  if (loading && !profile) {
    return <ProfilePageSkeleton />;
  }

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Perfil</h1>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && profile ? (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr] lg:items-start">
          <aside className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:space-y-2 lg:p-4">
            <div className="space-y-2">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="h-20 w-20 rounded-full object-cover lg:h-16 lg:w-16"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600 lg:h-16 lg:w-16">
                  {profile.name.slice(0, 1).toUpperCase()}
                </div>
              )}

              <label
                htmlFor="profile-avatar"
                className={`inline-flex cursor-pointer items-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 ${
                  avatarUploading ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                Alterar foto
              </label>
              <input
                id="profile-avatar"
                name="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={avatarUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = "";
                  if (file) {
                    handleAvatarFileSelection(file);
                  }
                }}
              />
              <p className="text-xs text-slate-500">JPG, PNG ou WEBP. Máximo de 2MB.</p>
              {avatarError ? <p className="text-xs text-red-600">{avatarError}</p> : null}
            </div>

            {editingName ? (
              <div className="space-y-2">
                <label htmlFor="profile-name" className="block space-y-1 text-sm text-slate-700">
                  <span>Nome de usuário</span>
                  <input
                    id="profile-name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={50}
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={resetNameEdit}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void saveProfile();
                    }}
                    disabled={saving || name.trim().length < 2}
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {saving ? "Salvando..." : "Salvar nome"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-start gap-2">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-900">{profile.name}</h2>
                  <RankBadgeIcons badges={profile.rankBadges ?? []} size="md" variant="labels" />
                </div>
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5">
                    <path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-8.79 8.79a1 1 0 0 1-.435.253l-3 1a1 1 0 0 1-1.264-1.264l1-3a1 1 0 0 1 .253-.435l8.79-8.79ZM12.172 5l-7.9 7.9-.5 1.5 1.5-.5 7.9-7.9L12.172 5Z" />
                  </svg>
                  Alterar nome
                </button>
              </div>
            )}

            <div className="space-y-3">
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 lg:p-2.5">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Estatisticas gerais
                  </p>
                  <p className="text-[10px] text-slate-500 lg:text-[9px]">Resumo principal do seu perfil</p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 lg:mt-1.5 lg:gap-1.5">
                  <div className="flex min-h-[66px] flex-col items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-2 text-center lg:min-h-[54px] lg:py-1.5">
                    <p className="text-base font-semibold text-slate-900 lg:text-sm">{profile.counts.totalReviews}</p>
                    <p className="mt-0.5 text-[11px] text-slate-600 lg:text-[10px]">Total reviews</p>
                  </div>
                  <div className="flex min-h-[66px] flex-col items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-2 text-center lg:min-h-[54px] lg:py-1.5">
                    <p className="text-base font-semibold text-slate-900 lg:text-sm">{profile.counts.totalLikesReceived}</p>
                    <p className="mt-0.5 text-[11px] text-slate-600 lg:text-[10px]">Total de curtidas</p>
                  </div>
                  <div className="flex min-h-[66px] flex-col items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-2 text-center lg:min-h-[54px] lg:py-1.5">
                    <p className="text-base font-semibold text-slate-900 lg:text-sm">{profile.counts.followersCount}</p>
                    <p className="mt-0.5 text-[11px] text-slate-600 lg:text-[10px]">Seguidores</p>
                  </div>
                  <div className="flex min-h-[66px] flex-col items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-2 text-center lg:min-h-[54px] lg:py-1.5">
                    <p className="text-base font-semibold text-slate-900 lg:text-sm">{profile.counts.followingCount}</p>
                    <p className="mt-0.5 text-[11px] text-slate-600 lg:text-[10px]">Seguindo</p>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 lg:p-2.5">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Status do catálogo
                  </p>
                  <p className="text-[10px] text-slate-500 lg:text-[9px]">Distribuição das suas avaliações</p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 lg:mt-1.5 lg:gap-1.5">
                  <div className="flex min-h-[62px] flex-col items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-2 text-center lg:min-h-[50px] lg:py-1.5">
                    <p className="text-base font-semibold text-slate-900 lg:text-sm">{profile.counts.finishedCount}</p>
                    <p className="mt-0.5 text-[11px] text-slate-600 lg:text-[10px]">Finalizados</p>
                  </div>
                  <div className="flex min-h-[62px] flex-col items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-2 text-center lg:min-h-[50px] lg:py-1.5">
                    <p className="text-base font-semibold text-slate-900 lg:text-sm">{profile.counts.playingCount}</p>
                    <p className="mt-0.5 text-[11px] text-slate-600 lg:text-[10px]">Jogando</p>
                  </div>
                  <div className="flex min-h-[62px] flex-col items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-2 text-center lg:min-h-[50px] lg:py-1.5">
                    <p className="text-base font-semibold text-slate-900 lg:text-sm">{profile.counts.wishlistCount}</p>
                    <p className="mt-0.5 text-[11px] text-slate-600 lg:text-[10px]">Wishlist</p>
                  </div>
                  <div className="flex min-h-[62px] flex-col items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-2 text-center lg:min-h-[50px] lg:py-1.5">
                    <p className="text-base font-semibold text-slate-900 lg:text-sm">{profile.counts.droppedCount}</p>
                    <p className="mt-0.5 text-[11px] text-slate-600 lg:text-[10px]">Dropados</p>
                  </div>
                </div>
              </section>
            </div>

            <div className="flex justify-center">
              <Link
                href={`/users/${encodeURIComponent(profile.id)}`}
                className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Ver perfil completo
              </Link>
            </div>
          </aside>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:h-fit">
            <label htmlFor="profile-bio" className="block space-y-1 text-sm text-slate-700">
              <span>Bio</span>
              <textarea
                id="profile-bio"
                name="bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                maxLength={200}
                rows={6}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>

            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Conta privada</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      isPrivate
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                    }`}
                  >
                    {isPrivate ? "Ativa" : "Desativada"}
                  </span>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isPrivate}
                  aria-label="Alternar conta privada"
                  disabled={saving}
                  onClick={() => setIsPrivate((previous) => !previous)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60 ${
                    isPrivate
                      ? "bg-slate-900 dark:bg-slate-200"
                      : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      isPrivate
                        ? "translate-x-5 dark:bg-slate-900"
                        : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                {isPrivate
                  ? "Somente você pode ver seu perfil completo. Suas resenhas ainda aparecem normalmente."
                  : "Outros usuários podem abrir seu perfil completo ao clicar no seu nome/foto e ver suas resenhas. 👀"}
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-900">Jogos favoritos</p>
                <button
                  type="button"
                  onClick={openFavoritesModal}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100"
                >
                  Editar favoritos
                </button>
              </div>

              {profile.favorites.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {profile.favorites.map((favorite) => (
                    <Link
                      key={`profile-favorite-${favorite.rawgId}`}
                      href={`/games/${favorite.rawgId}`}
                      className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-2 hover:bg-slate-50"
                    >
                      {favorite.coverUrl ? (
                        <img
                          src={favorite.coverUrl}
                          alt={favorite.title}
                          className="h-10 w-8 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-8 rounded bg-slate-200" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {favorite.title}
                        </p>
                        <p className="text-[11px] text-slate-500">#{favorite.position}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600">
                  Você ainda não adicionou favoritos. Escolha até 4 jogos.
                </p>
              )}
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  void saveProfile();
                }}
                disabled={saving || name.trim().length < 2}
                className="inline-flex items-center rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 sm:px-4 sm:py-2 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white dark:ring-1 dark:ring-slate-300/70 dark:shadow-sm"
              >
                {saving ? "Salvando..." : "Salvar perfil"}
              </button>
            </div>

            <div className="border-t border-slate-200 pt-3 text-center">
              <p className="text-sm font-medium text-slate-900">Badges</p>
              <p className="mt-1 text-xs text-slate-600">Conquistas permanentes do seu perfil.</p>
              <PermanentBadges
                className="mt-2"
                mode="owner"
                ownerStorageKey={profile.id}
                helperTextAlign="center"
                visibility={badgeVisibility}
                onVisibilityChange={setBadgeVisibility}
                totalReviews={profile.counts.totalReviews}
                totalLikesReceived={profile.counts.totalLikesReceived}
                followersCount={profile.counts.followersCount}
                finishedCount={profile.counts.finishedCount}
                playingCount={profile.counts.playingCount}
                wishlistCount={profile.counts.wishlistCount}
                droppedCount={profile.counts.droppedCount}
              />
            </div>
          </div>
        </div>
      ) : null}

      <GameSearchModal
        open={favoritesModalOpen}
        title="Editar jogos favoritos"
        onClose={() => {
          if (!favoriteSaving) {
            closeFavoritesModal();
          }
        }}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            Escolha at&eacute; 4 jogos favoritos. Voc&ecirc; pode adicionar sem precisar avaliar.
          </p>

          <label htmlFor="favorite-search" className="block space-y-1 text-sm text-slate-700">
            <span>Buscar jogo</span>
            <input
              id="favorite-search"
              name="favorite-search"
              type="text"
              value={favoriteSearch}
              onChange={(event) => {
                setFavoriteSearch(event.target.value);
                setFavoriteError(null);
              }}
              placeholder="Digite o nome do jogo"
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>

          {favoriteSearchLoading ? (
            <p className="text-xs text-slate-600">Buscando jogos...</p>
          ) : null}

          {favoriteSearch.trim().length >= 2 && !favoriteSearchLoading ? (
            favoriteResults.length > 0 ? (
              <div className="max-h-44 space-y-2 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2">
                {favoriteResults.map((game) => {
                  const isDisabled = favoriteDraft.length >= 4;

                  return (
                    <div
                      key={`favorite-result-${game.rawgId}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {game.coverUrl ? (
                          <img
                            src={game.coverUrl}
                            alt={game.title}
                            className="h-10 w-8 rounded object-cover"
                          />
                        ) : (
                          <div className="h-10 w-8 rounded bg-slate-200" />
                        )}
                        <p className="truncate text-sm text-slate-900">{game.title}</p>
                      </div>

                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => addFavoriteGame(game)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Adicionar
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Nenhum jogo encontrado para este termo.</p>
            )
          ) : null}

          <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-900">Selecionados</p>
              <span className="text-xs text-slate-500">{favoriteDraft.length}/4</span>
            </div>

            {favoriteDraft.length > 0 ? (
              <div className="space-y-2">
                {favoriteDraft.map((favorite, index) => (
                  <div
                    key={`favorite-selected-${favorite.rawgId}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {favorite.coverUrl ? (
                        <img
                          src={favorite.coverUrl}
                          alt={favorite.title}
                          className="h-10 w-8 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-8 rounded bg-slate-200" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {favorite.title}
                        </p>
                        <p className="text-[11px] text-slate-500">Posição #{index + 1}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveFavoriteGame(favorite.rawgId, -1)}
                        className="rounded border border-slate-300 px-1.5 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={index === favoriteDraft.length - 1}
                        onClick={() => moveFavoriteGame(favorite.rawgId, 1)}
                        className="rounded border border-slate-300 px-1.5 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFavoriteGame(favorite.rawgId)}
                        className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Nenhum favorito selecionado.</p>
            )}
          </div>

          {favoriteError ? <p className="text-sm text-red-600">{favoriteError}</p> : null}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeFavoritesModal}
              disabled={favoriteSaving}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                void saveFavoriteGames();
              }}
              disabled={favoriteSaving}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {favoriteSaving ? "Salvando..." : "Salvar favoritos"}
            </button>
          </div>
        </div>
      </GameSearchModal>

      {isCropModalOpen && previewUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Ajustar foto de perfil</h2>
              <p className="text-sm text-slate-600">
                Arraste para posicionar e use o zoom para ajustar o recorte 1:1.
              </p>
            </div>

            <div className="relative h-72 w-full overflow-hidden rounded-lg bg-slate-900 sm:h-96">
              <Cropper
                image={previewUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_area, areaPixels) => {
                  setCroppedAreaPixels(areaPixels);
                }}
              />
            </div>

            <label htmlFor="avatar-zoom" className="block space-y-2 text-sm text-slate-700">
              <span>Zoom</span>
              <input
                id="avatar-zoom"
                name="avatar-zoom"
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full"
              />
            </label>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeCropModal}
                disabled={avatarUploading}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  void saveAvatarCrop();
                }}
                disabled={avatarUploading}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {avatarUploading ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}


