"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { GameSummary } from "@gamebox/shared/types/game";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/nav/NotificationBell";
import { useDebouncedValue } from "@/lib/utils/debounce";
import { GameSearchModal } from "@/components/games/GameSearchModal";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { ConfirmActionDialog } from "@/components/ui/ConfirmActionDialog";

const navLinks = [
  { href: "/me", label: "Meu Catálogo" },
  { href: "/profile", label: "Perfil" }
];

export function Navbar() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const [searchResults, setSearchResults] = useState<GameSummary[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameSummary | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [logoutSubmitting, setLogoutSubmitting] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchTerm.trim();
    setShowSearchDropdown(false);
    router.push(query.length > 0 ? `/search?q=${encodeURIComponent(query)}` : "/search");
  }

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    async function runAutocomplete() {
      const query = debouncedSearchTerm.trim();
      if (query.length < 2) {
        setSearchResults([]);
        setSearchError(null);
        setSearchLoading(false);
        return;
      }

      setSearchLoading(true);
      setSearchError(null);

      try {
        const response = await fetch(`/api/bff/rawg/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
          throw new Error("Falha ao buscar jogos");
        }

        const data = (await response.json()) as GameSummary[];
        setSearchResults(data);
      } catch (error) {
        setSearchError(error instanceof Error ? error.message : "Falha ao buscar jogos");
      } finally {
        setSearchLoading(false);
      }
    }

    void runAutocomplete();
  }, [debouncedSearchTerm]);

  function handleOpenReview(game: GameSummary) {
    if (status === "loading") {
      return;
    }

    if (!session?.user) {
      setShowSearchDropdown(false);
      router.push("/login");
      return;
    }

    setSelectedGame(game);
    setShowSearchDropdown(false);
  }

  function handleRequestLogout() {
    setLogoutError(null);
    setShowLogoutDialog(true);
  }

  async function handleConfirmLogout() {
    setLogoutSubmitting(true);
    setLogoutError(null);

    try {
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Não foi possível desconectar a conta.");
      setLogoutSubmitting(false);
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-6xl px-4 py-3 sm:py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <Link href="/" className="block space-y-0.5">
            <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 sm:text-3xl">
              Gamebox
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 sm:text-base">
              Seu catálogo de jogos com review e ranking.
            </p>
          </Link>

          <div className="w-full md:ml-auto md:w-auto md:max-w-3xl md:flex-1">
            <nav className="flex w-full flex-nowrap items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-300 sm:text-sm md:justify-end md:gap-2 lg:gap-3">
              <NotificationBell />

              <Link
                href="/"
                className="shrink-0 whitespace-nowrap hover:text-slate-900 dark:hover:text-slate-100"
              >
                Home
              </Link>

              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="shrink-0 whitespace-nowrap hover:text-slate-900 dark:hover:text-slate-100"
                >
                  {link.label}
                </Link>
              ))}

              <ThemeToggle />

              {session?.user ? (
                <button
                  type="button"
                  onClick={handleRequestLogout}
                  className="shrink-0 whitespace-nowrap rounded-md border border-slate-300 px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:px-3"
                >
                  <span className="sm:hidden">Sair</span>
                  <span className="hidden sm:inline">Logout</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  className="shrink-0 whitespace-nowrap rounded-md border border-slate-300 px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:px-3"
                >
                  <span className="sm:hidden">Entrar</span>
                  <span className="hidden sm:inline">Login</span>
                </Link>
              )}
            </nav>

            <form onSubmit={handleSearchSubmit} className="mt-3 md:flex md:justify-end">
              <div ref={searchContainerRef} className="relative w-full md:max-w-lg">
                <svg
                  aria-hidden
                  viewBox="0 0 20 20"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400"
                >
                  <path
                    fill="currentColor"
                    d="M8.5 2a6.5 6.5 0 1 0 4.15 11.5l3.92 3.92a1 1 0 0 0 1.42-1.42l-3.92-3.92A6.5 6.5 0 0 0 8.5 2Zm-4.5 6.5a4.5 4.5 0 1 1 9 0a4.5 4.5 0 0 1-9 0Z"
                  />
                </svg>
                <input
                  id="navbar-game-search"
                  name="q"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onFocus={() => setShowSearchDropdown(true)}
                  placeholder="Buscar jogo"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none ring-0 transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-500"
                />

                {showSearchDropdown && searchTerm.trim().length >= 2 ? (
                  <div className="absolute z-40 mt-2 w-full max-w-full rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    {searchLoading ? (
                      <p className="px-2 py-2 text-xs text-slate-500">Buscando...</p>
                    ) : null}

                    {searchError ? <p className="px-2 py-2 text-xs text-red-600">{searchError}</p> : null}

                    {!searchLoading && !searchError && searchResults.length === 0 ? (
                      <p className="px-2 py-2 text-xs text-slate-500">Nenhum jogo encontrado.</p>
                    ) : null}

                    <div className="max-h-[60vh] space-y-2 overflow-auto">
                      {searchResults.map((game) => (
                        <article
                          key={game.rawgId}
                          className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                            <Link
                              href={`/games/${game.rawgId}`}
                              onClick={() => setShowSearchDropdown(false)}
                              className="relative h-28 w-full overflow-hidden rounded-md border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 sm:h-16 sm:w-24 sm:shrink-0"
                            >
                              <Image
                                src={game.coverUrl ?? "/placeholder-game.svg"}
                                alt={`Capa de ${game.title}`}
                                fill
                                sizes="96px"
                                className="object-cover"
                              />
                            </Link>

                            <div className="min-w-0 flex-1 space-y-1">
                              <Link
                                href={`/games/${game.rawgId}`}
                                onClick={() => setShowSearchDropdown(false)}
                                className="block truncate text-sm font-semibold text-slate-900 hover:underline dark:text-slate-100"
                              >
                                {game.title}
                              </Link>
                              <p className="text-preview-clamp-two text-fade-last-line text-xs leading-5 text-slate-600 dark:text-slate-300">
                                {game.descriptionPreview ?? "Descrição oficial indisponível no momento."}
                              </p>
                            </div>
                          </div>

                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleOpenReview(game)}
                              className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 sm:w-auto"
                            >
                              Avaliar
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      </div>

      <ConfirmActionDialog
        open={showLogoutDialog}
        title="Desconectar conta"
        description="Você realmente deseja desconectar desta conta?"
        confirmLabel="Desconectar"
        confirmVariant="danger"
        busy={logoutSubmitting}
        error={logoutError}
        onCancel={() => {
          if (!logoutSubmitting) {
            setShowLogoutDialog(false);
          }
        }}
        onConfirm={() => {
          void handleConfirmLogout();
        }}
      />

      <GameSearchModal
        open={Boolean(selectedGame)}
        title={selectedGame ? `Avaliar ${selectedGame.title}` : "Avaliar jogo"}
        onClose={() => setSelectedGame(null)}
      >
        {selectedGame ? (
          <ReviewForm
            rawgId={selectedGame.rawgId}
            onSuccess={() => {
              setSelectedGame(null);
            }}
            onCancel={() => setSelectedGame(null)}
          />
        ) : null}
      </GameSearchModal>
    </header>
  );
}
