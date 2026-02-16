"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { useSession } from "next-auth/react";
import { ProfilePageSkeleton } from "@/components/states/ProfilePageSkeleton";

type AvatarCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ProfileResponse = {
  id: string;
  name: string;
  avatarUrl: string;
  avatarPublicId: string | null;
  avatarCrop: AvatarCrop | null;
  bio: string | null;
  isPrivate: boolean;
  counts: {
    totalReviews: number;
    finishedCount: number;
    playingCount: number;
    wishlistCount: number;
    droppedCount: number;
    totalLikesReceived: number;
  };
};

type UploadAvatarResponse = {
  publicId: string;
};

export default function ProfilePage() {
  const { status } = useSession();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
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
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Falha ao carregar perfil");
      }

      const data = (await response.json()) as ProfileResponse;
      setProfile(data);
      setName(data.name);
      setBio(data.bio ?? "");
      setIsPrivate(data.isPrivate);
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
        body: JSON.stringify({ name, bio, isPrivate })
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Falha ao atualizar perfil");
      }

      const data = (await response.json()) as ProfileResponse;
      setProfile(data);
      setName(data.name);
      setBio(data.bio ?? "");
      setIsPrivate(data.isPrivate);
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
        const uploadData = (await uploadResponse.json().catch(() => null)) as { error?: string } | null;
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
        const applyData = (await applyResponse.json().catch(() => null)) as { error?: string } | null;
        throw new Error(applyData?.error ?? "Falha ao aplicar recorte do avatar");
      }

      const profileData = (await applyResponse.json()) as ProfileResponse;
      setProfile(profileData);
      setName(profileData.name);
      setBio(profileData.bio ?? "");
      setIsPrivate(profileData.isPrivate);
      closeCropModal();
    } catch (uploadError) {
      setAvatarError(uploadError instanceof Error ? uploadError.message : "Erro inesperado ao atualizar avatar");
    } finally {
      setAvatarUploading(false);
    }
  }

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
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-2">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
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
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">{profile.name}</h2>
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

            <div className="space-y-1 text-sm text-slate-700">
              <p>Total reviews: {profile.counts.totalReviews}</p>
              <p>Finalizados: {profile.counts.finishedCount}</p>
              <p>Jogando: {profile.counts.playingCount}</p>
              <p>Wishlist: {profile.counts.wishlistCount}</p>
              <p>Dropados: {profile.counts.droppedCount}</p>
              <p>Total de curtidas: {profile.counts.totalLikesReceived}</p>
            </div>

            <Link
              href={`/users/${encodeURIComponent(profile.id)}`}
              className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Ver perfil completo
            </Link>
          </aside>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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

            <button
              type="button"
              onClick={() => {
                void saveProfile();
              }}
              disabled={saving || name.trim().length < 2}
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
            >
              {saving ? "Salvando..." : "Salvar perfil"}
            </button>
          </div>
        </div>
      ) : null}

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

