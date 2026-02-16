"use client";

import { useState } from "react";
import { rating10ToStars, starsToRating10 } from "@/lib/utils/rating";
import { StarRating } from "./StarRating";

type RatingInputProps = {
  value: number;
  onChange: (value: number) => void;
};

export function RatingInput({ value, onChange }: RatingInputProps) {
  const [hoverStars, setHoverStars] = useState<number | null>(null);

  const selectedStars = rating10ToStars(value);
  const activeStars = hoverStars ?? selectedStars;

  function setStars(stars: number) {
    onChange(starsToRating10(stars));
  }

  return (
    <label className="block text-sm text-slate-700 dark:text-slate-200">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Nota (1 a 10)</span>

        <div
          className="inline-flex items-center gap-4 rounded-xl border border-slate-300 bg-white px-3 py-2.5 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900"
          onMouseLeave={() => setHoverStars(null)}
        >
          <div className="group relative inline-block cursor-pointer">
            <StarRating
              value={activeStars}
              size="md"
              className="transition-transform duration-150 ease-out group-hover:scale-[1.03]"
            />

            <div className="absolute inset-0 grid grid-cols-10">
              {Array.from({ length: 10 }, (_, index) => {
                const stars = (index + 1) / 2;

                return (
                  <button
                    key={stars}
                    type="button"
                    aria-label={`${stars} estrelas`}
                    className="h-full w-full focus:outline-none"
                    onMouseEnter={() => setHoverStars(stars)}
                    onFocus={() => setHoverStars(stars)}
                    onClick={() => setStars(stars)}
                  />
                );
              })}
            </div>
          </div>

          <span className="text-sm font-semibold text-slate-700 dark:text-slate-100">
            {value}/10
          </span>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Clique nas estrelas (meio ou inteiro).
      </p>
    </label>
  );
}
