"use client";

import Link from "next/link";
import { useProfile } from "@/lib/store";
import { Nav } from "@/components/shared";
import { T } from "@/lib/i18n";

export default function DashboardPage() {
  const [profile] = useProfile();
  const lang = profile.language;
  const t = T[lang];

  return (
    <>
      <Nav lang={lang} onLang={(l) => {}} />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        <section className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white shadow-md">
          <p className="text-sm font-semibold text-blue-50">{t.profileTitle}</p>
          <h1 className="mt-1 text-2xl font-bold">{profile.name || "Welcome"}</h1>
        </section>
        <section className="grid gap-3 sm:grid-cols-2">
          <Link href="/profile" className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-900">Profile</p>
            <p className="mt-1 text-sm text-slate-600">Review your personal details and logout.</p>
          </Link>
          <Link href="/schemes" className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-900">Find benefits</p>
            <p className="mt-1 text-sm text-slate-600">Check schemes that match your situation.</p>
          </Link>
        </section>
      </main>
    </>
  );
}
