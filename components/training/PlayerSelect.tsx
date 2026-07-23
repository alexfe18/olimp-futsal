"use client";

import { useMemo, useState } from "react";
import type { PlayerRecord } from "./types";

type PlayerSelectProps = {
  players: PlayerRecord[];
  selectedPlayerId: string;
  disabled?: boolean;
  onPlayerSelect: (player: PlayerRecord) => void;
};

export default function PlayerSelect({
  players,
  selectedPlayerId,
  disabled = false,
  onPlayerSelect,
}: PlayerSelectProps) {
  const [search, setSearch] = useState("");

  const [isOpen, setIsOpen] = useState(false);

  const selectedPlayer =
    players.find((player) => player.id === selectedPlayerId) ?? null;

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("uk");

    if (!normalizedSearch) {
      return players;
    }

    return players.filter((player) => {
      const searchableValue = [
        player.fullName,
        player.displayName ?? "",
        player.shirtNumber?.toString() ?? "",
        player.position ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("uk");

      return searchableValue.includes(normalizedSearch);
    });
  }, [players, search]);

  function handlePlayerSelect(player: PlayerRecord) {
    onPlayerSelect(player);
    setSearch("");
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <label
        htmlFor="player-search"
        className="text-sm font-black uppercase tracking-[0.18em] text-slate-600"
      >
        Оберіть себе
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className={`mt-3 flex min-h-16 w-full items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
          selectedPlayer
            ? "border-sky-300 bg-sky-50 hover:border-sky-400 hover:bg-sky-100"
            : "border-slate-200 bg-slate-50 text-slate-500 hover:border-sky-400 hover:bg-white"
        }`}
      >
        {selectedPlayer ? (
          <span className="min-w-0">
            <strong className="block truncate text-base text-slate-950">
              {selectedPlayer.fullName}
            </strong>

            <span className="mt-1 block text-sm text-slate-500">
              {selectedPlayer.shirtNumber !== null
                ? `№${selectedPlayer.shirtNumber}`
                : "Без номера"}

              {selectedPlayer.position ? ` · ${selectedPlayer.position}` : ""}
            </span>
          </span>
        ) : (
          <span>Знайдіть себе у списку</span>
        )}

        <span
          aria-hidden="true"
          className={`shrink-0 text-lg transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              >
                ⌕
              </span>

              <input
                id="player-search"
                type="search"
                value={search}
                autoFocus
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ім’я, номер або позиція..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {filteredPlayers.length > 0 ? (
              <ul className="space-y-1">
                {filteredPlayers.map((player) => {
                  const isSelected = player.id === selectedPlayerId;

                  return (
                    <li key={player.id}>
                      <button
                        type="button"
                        onClick={() => handlePlayerSelect(player)}
                        className={`flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left transition ${
                          isSelected
                            ? "bg-sky-100 text-sky-950"
                            : "hover:bg-slate-100"
                        }`}
                      >
                        <span className="min-w-0">
                          <strong className="block truncate text-sm">
                            {player.fullName}
                          </strong>

                          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 font-black text-sky-700">
                              {player.shirtNumber !== null
                                ? `№${player.shirtNumber}`
                                : "Без номера"}
                            </span>

                            {player.position && <span>{player.position}</span>}
                          </span>
                        </span>

                        {isSelected && (
                          <span className="shrink-0 text-sm font-black text-sky-700">
                            ✓
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                Гравця не знайдено.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
