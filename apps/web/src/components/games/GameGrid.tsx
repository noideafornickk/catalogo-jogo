import type { GameSummary } from "@gamebox/shared/types/game";
import { GameCard } from "./GameCard";

type GameGridProps = {
  games: GameSummary[];
  actionLabel?: string;
  onAction?: (game: GameSummary) => void;
};

export function GameGrid({ games, actionLabel, onAction }: GameGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {games.map((game) => (
        <GameCard
          key={game.rawgId}
          game={game}
          actionLabel={actionLabel}
          onAction={onAction}
        />
      ))}
    </div>
  );
}
