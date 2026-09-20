"use client";

import React, { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { Nav } from "@/components/shared";
import { auth } from "@/lib/firebase";
import { T } from "@/lib/i18n";
import { clearSession, initialProfile, useProfile } from "@/lib/store";
import { getStateOptions, useAuth } from "@/components/AuthGate";
import type { StateId } from "@/lib/rules/types";

export default function ProfilePage() {
  const [profile, setProfile] = useProfile();
  const { requireAuth, user, isProfileComplete } = useAuth();
  const lang = profile.language;
  const t = T[lang];

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editState, setEditState] = useState<StateId>("CENTRAL");
  const [editEmail, setEditEmail] = useState("");

  // Keep the edit fields in sync with the stored profile, but never while the
  // user is actively editing — otherwise a background profile reload (e.g. an
  // auth/storage sync firing a fresh object) would overwrite what they're typing.
  useEffect(() => {
    if (isEditing) return;
    setEditName(profile.name || "");
    setEditAge(profile.age?.toString() || "");
    setEditPhone(profile.phone || "");
    setEditState(profile.state || "CENTRAL");
    setEditEmail(profile.email || "");
  }, [profile, isEditing]);

  async function handleLogout() {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch {}

    clearSession();
    window.location.replace("/");
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile((p) => ({ ...p, photoBase64: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }

  function handleDeletePhoto() {
    setProfile((p) => ({ ...p, photoBase64: undefined }));
  }

  function handleSave() {
    setProfile((p) => ({
      ...p,
      name: editName.trim(),
      age: editAge.trim() ? Number(editAge) : undefined,
      phone: editPhone.trim(),
      state: editState,
      email: editEmail.trim(),
    }));
    setIsEditing(false);
  }

  function handleCancel() {
    setEditName(profile.name || "");
    setEditAge(profile.age?.toString() || "");
    setEditPhone(profile.phone || "");
    setEditState(profile.state || "CENTRAL");
    setEditEmail(profile.email || "");
    setIsEditing(false);
  }

  const stateOptions = getStateOptions();
  const currentStateLabel = stateOptions.find((o) => o.value === profile.state)?.label || profile.state || "—";

  const details = [
    { label: t.profileName, value: profile.name || "—" },
    { label: t.profileAge, value: profile.age || "—" },
    { label: t.profilePhone, value: profile.phone || "—" },
    { label: t.profileState, value: currentStateLabel },
    { label: t.profileEmail, value: profile.email || "—" },
  ];

  return (
    <div className="hs-page animate-page-enter min-h-screen">
      <Nav lang={lang} onLang={(l) => setProfile((p) => ({ ...p, language: l }))} />
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        
        {/* Title & Photo Section */}
        <section className="rounded-3xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] p-6 text-white shadow-md flex flex-col items-center sm:flex-row sm:items-center sm:justify-start gap-6 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-4 translate-y-4">
            <span className="text-[120px] font-bold leading-none">C</span>
          </div>

          {/* Profile Picture Upload Container */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/80 bg-mint-bg/25 flex items-center justify-center text-white text-3xl font-black shadow-inner">
              {profile.photoBase64 ? (
                <img
                  src={profile.photoBase64}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                profile.name ? profile.name.charAt(0).toUpperCase() : "👤"
              )}
            </div>
            <input
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              className="hidden"
              id="profile-photo-upload"
              onChange={(e) => requireAuth(() => handlePhotoUpload(e))}
            />
          </div>

          <div className="text-center sm:text-left space-y-2 z-10">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-200">{t.profileTitle}</p>
            <h2 className="text-2xl font-bold leading-tight">
              {profile.name || (lang === "hi" ? "अतिथि उपयोगकर्ता" : "Guest User")}
            </h2>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2.5 pt-1">
              <label
                htmlFor="profile-photo-upload"
                className="cursor-pointer bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl px-3 py-1.5 text-xs font-bold transition click-scale shadow-2xs"
              >
                {profile.photoBase64 ? t.changePhoto : t.uploadPhoto}
              </label>
              {profile.photoBase64 && (
                <button
                  onClick={() => requireAuth(handleDeletePhoto)}
                  className="bg-red-500/20 hover:bg-red-500/35 border border-red-500/30 text-rose-200 rounded-xl px-3 py-1.5 text-xs font-bold transition click-scale shadow-2xs"
                >
                  {t.deletePhoto}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Details & Edit Section */}
        <section className="rounded-3xl bg-white p-6 border border-[#E3E0CF]/80 shadow-2xs hover-lift transition-all">
          {!isEditing ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {details.map((d) => (
                  <div key={d.label} className="rounded-2xl bg-slate-50 p-4 border border-slate-100 shadow-3xs">
                    <p className="text-[11.5px] font-bold text-slate-450 uppercase tracking-wider">{d.label}</p>
                    <p className="mt-1 text-[14.5px] font-bold text-slate-800 leading-snug">{d.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setIsEditing(true)}
                  className="rounded-2xl bg-brand-green hover:bg-brand-green-hover px-5 py-2.5 text-[13.5px] font-bold text-white transition hover-lift click-scale shadow-xs"
                >
                  ✏️ {t.editProfile}
                </button>
                {user && isProfileComplete ? (
                  <button
                    onClick={handleLogout}
                    className="rounded-2xl bg-white border border-rose-200 hover:bg-rose-50/50 text-rose-650 px-4 py-2.5 text-[13px] font-bold transition click-scale"
                  >
                    🚪 {t.logout}
                  </button>
                ) : (
                  <button
                    onClick={() => requireAuth(() => {})}
                    className="rounded-2xl bg-brand-green hover:bg-brand-green-hover px-5 py-2.5 text-[13px] font-bold text-white transition click-scale shadow-xs"
                  >
                    🔑 {t.authSignin}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                requireAuth(handleSave);
              }}
              className="space-y-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[12.5px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                    {t.profileName}
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-2xl border border-[#E3E0CF] px-4 py-2.5 text-sm font-bold outline-none focus:border-brand-green focus:ring-2 focus:ring-mint-bg transition"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                    {t.profileAge}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="120"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    className="w-full rounded-2xl border border-[#E3E0CF] px-4 py-2.5 text-sm font-bold outline-none focus:border-brand-green focus:ring-2 focus:ring-mint-bg transition"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                    {t.profilePhone}
                  </label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full rounded-2xl border border-[#E3E0CF] px-4 py-2.5 text-sm font-bold outline-none focus:border-brand-green focus:ring-2 focus:ring-mint-bg transition"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                    {t.profileState}
                  </label>
                  <select
                    value={editState}
                    onChange={(e) => setEditState(e.target.value as StateId)}
                    className="w-full rounded-2xl border border-[#E3E0CF] px-4 py-2.5 text-sm font-bold outline-none focus:border-brand-green focus:ring-2 focus:ring-mint-bg bg-white transition"
                  >
                    {stateOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[12.5px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                    {t.profileEmail}
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full rounded-2xl border border-[#E3E0CF] px-4 py-2.5 text-sm font-bold outline-none focus:border-brand-green focus:ring-2 focus:ring-mint-bg transition"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="rounded-2xl bg-brand-green hover:bg-brand-green-hover px-5 py-2.5 text-[13.5px] font-bold text-white transition hover-lift click-scale shadow-xs"
                >
                  💾 {t.saveProfile}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-2xl bg-white border border-[#E3E0CF] hover:bg-slate-50 text-slate-550 px-4 py-2.5 text-[13px] font-bold transition click-scale"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
