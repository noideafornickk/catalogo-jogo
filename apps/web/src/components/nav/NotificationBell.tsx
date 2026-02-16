"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import type { NotificationsResponse } from "@gamebox/shared/types/api";

const EMPTY_NOTIFICATIONS: NotificationsResponse = {
  unreadCount: 0,
  items: []
};

export function NotificationBell() {
  const { status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<NotificationsResponse>(EMPTY_NOTIFICATIONS);
  const containerRef = useRef<HTMLDivElement | null>(null);

  async function loadNotifications() {
    if (status !== "authenticated") {
      setData(EMPTY_NOTIFICATIONS);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/bff/notifications?limit=12");
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as NotificationsResponse;
      setData(payload);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status !== "authenticated") {
      setMenuOpen(false);
      setData(EMPTY_NOTIFICATIONS);
      return;
    }

    void loadNotifications();

    const interval = setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [status]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [menuOpen]);

  async function markAllAsRead() {
    if (data.unreadCount === 0) {
      return;
    }

    await fetch("/api/bff/notifications/read-all", {
      method: "PATCH"
    });

    setData((previous) => ({
      unreadCount: 0,
      items: previous.items.map((item) => ({
        ...item,
        readAt: item.readAt ?? new Date().toISOString()
      }))
    }));
  }

  async function markOneAsRead(notificationId: string) {
    await fetch(`/api/bff/notifications/${notificationId}/read`, {
      method: "PATCH"
    });

    setData((previous) => {
      let unreadCount = previous.unreadCount;

      const nextItems = previous.items.map((item) => {
        if (item.id !== notificationId || item.readAt) {
          return item;
        }

        unreadCount = Math.max(0, unreadCount - 1);
        return {
          ...item,
          readAt: new Date().toISOString()
        };
      });

      return {
        unreadCount,
        items: nextItems
      };
    });
  }

  if (status !== "authenticated") {
    return null;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((previous) => !previous)}
        className="relative rounded-md border border-slate-300 px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-label="Notificacoes"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
          <path d="M10 2a4 4 0 0 0-4 4v1.08c0 .75-.21 1.48-.62 2.1L4.2 11.05A1.5 1.5 0 0 0 5.45 13.5h9.1a1.5 1.5 0 0 0 1.25-2.45l-1.18-1.87A3.98 3.98 0 0 1 14 7.08V6a4 4 0 0 0-4-4Zm2.12 12.5a2.13 2.13 0 0 1-4.24 0h4.24Z" />
        </svg>

        {data.unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        ) : null}
      </button>

      {menuOpen ? (
        <div className="absolute left-0 z-30 mt-2 w-[min(20rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:left-auto sm:right-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notificacoes</p>
            <button
              type="button"
              onClick={() => {
                void markAllAsRead();
              }}
              className="text-xs text-slate-600 hover:underline dark:text-slate-300"
            >
              Marcar tudo como lido
            </button>
          </div>

          {loading ? <p className="text-xs text-slate-500">Carregando...</p> : null}

          {!loading && data.items.length === 0 ? (
            <p className="text-xs text-slate-500">Sem notificacoes por enquanto.</p>
          ) : null}

          <div className="max-h-72 space-y-2 overflow-auto">
            {data.items.map((item) => (
              <Link
                key={item.id}
                href={`/games/${item.review.game.rawgId}`}
                onClick={() => {
                  if (!item.readAt) {
                    void markOneAsRead(item.id);
                  }
                  setMenuOpen(false);
                }}
                className={`block rounded-lg border px-3 py-2 text-sm ${
                  item.readAt
                    ? "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    : "border-red-100 bg-red-50 text-slate-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-slate-100"
                }`}
              >
                <p className="break-words">
                  <span className="font-medium">{item.actor.name}</span> curtiu sua review em{" "}
                  <span className="font-medium">{item.review.game.title}</span>.
                </p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
