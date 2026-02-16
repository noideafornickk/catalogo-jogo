"use client";

import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import type { GameSummary } from "@gamebox/shared/types/game";
import { GameSearchModal } from "@/components/games/GameSearchModal";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { EmptyState } from "@/components/states/EmptyState";

function SearchPageContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const query = (searchParams.get("q") ?? "").trim();

  useEffect(() => {
    async function runSearch() {
      if (query.length < 2) {
        setGames([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/bff/rawg/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
          throw new Error("Falha na busca de jogos");
        }

        const data = (await response.json()) as GameSummary[];
        setGames(data);
      } catch (searchError) {
        setError(searchError instanceof Error ? searchError.message : "Erro inesperado");
      } finally {
        setLoading(false);
      }
    }

    void runSearch();
  }, [query]);

  function handleOpenReview(game: GameSummary) {
    if (status === "loading") {
      return;
    }

    if (status !== "authenticated") {
      router.push("/login");
      return;
    }

    setSelectedGame(game);
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Buscar jogo</h1>
        <p className="text-sm text-slate-600">
          Use a barra de busca no topo para autocomplete, capas e avaliação.
        </p>
      </header>

      {loading ? <p className="text-sm text-slate-600">Buscando...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && query.length >= 2 && games.length === 0 ? (
        <EmptyState title="Nenhum jogo encontrado" />
      ) : null}

      {!loading && query.length < 2 ? (
        <EmptyState title="Digite pelo menos 2 letras na busca do topo." />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <article key={game.rawgId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="relative mb-3 aspect-[4/3] w-full overflow-hidden rounded-md bg-slate-100">
              <Image
                src={game.coverUrl ?? "/placeholder-game.svg"}
                alt={game.title}
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-cover"
              />
            </div>
            <p className="text-base font-semibold text-slate-900">{game.title}</p>
            <p className="mt-1 text-preview-clamp-two text-fade-last-line text-sm leading-6 text-slate-600">
              {game.descriptionPreview ?? "Descrição oficial indisponível no momento."}
            </p>

            <button
              type="button"
              onClick={() => handleOpenReview(game)}
              className="mt-3 w-full rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 sm:w-auto"
            >
              Avaliar
            </button>
          </article>
        ))}
      </div>

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
    </section>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-600">Carregando busca...</p>}>
      <SearchPageContent />
    </Suspense>
  );
}
