"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";

export default function LoginPage() {
  const { data: session } = useSession();

  return (
    <section className="mx-auto max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Entrar</h1>

      {session?.user ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">Você já está logado como {session.user.name}.</p>
          <Link
            href="/"
            className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Voltar para Home
          </Link>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <svg aria-hidden viewBox="0 0 48 48" className="h-5 w-5">
            <path
              fill="#FFC107"
              d="M43.61 20.08H42V20H24v8h11.3A11.99 11.99 0 0 1 24 36c-6.62 0-12-5.38-12-12s5.38-12 12-12c3.06 0 5.84 1.15 7.96 3.04l5.66-5.66A19.9 19.9 0 0 0 24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.34-.14-2.65-.39-3.92Z"
            />
            <path
              fill="#FF3D00"
              d="M6.31 14.69l6.57 4.82A12 12 0 0 1 24 12c3.06 0 5.84 1.15 7.96 3.04l5.66-5.66A19.9 19.9 0 0 0 24 4A19.99 19.99 0 0 0 6.31 14.69Z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.11 0 9.74-1.95 13.26-5.11l-6.12-5.18A11.94 11.94 0 0 1 24 36a11.99 11.99 0 0 1-11.28-7.95l-6.52 5.02A20 20 0 0 0 24 44Z"
            />
            <path
              fill="#1976D2"
              d="M43.61 20.08H42V20H24v8h11.3a12.04 12.04 0 0 1-4.16 5.71l6.12 5.18C36.82 39.26 44 34 44 24c0-1.34-.14-2.65-.39-3.92Z"
            />
          </svg>
          Login com Google
        </button>
      )}
    </section>
  );
}
