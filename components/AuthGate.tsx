"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { useProfile, clearAll, clearSession, writeProfileForUid } from "@/lib/store";

// Hackathon demo account — fully local, no Firebase / SMS billing required.
const DEMO_PHONE_DIGITS = "8888777700";
const DEMO_OTP = "112233";
const DEMO_UID = "demo-uid-8888777700";
// Retired demo logins — stale sessions on these UIDs are dropped on load.
const RETIRED_DEMO_UIDS = ["demo-uid-9999888800"];

// Rebuild a locally-authenticated (demo / mock) user from what was stored at
// sign-in. Crucially it reuses the SAME uid that was saved — never recomputes
// one — so the profile stays under the same scoped storage key across refreshes.
function restoreLocalUser(): User | null {
  if (typeof window === "undefined") return null;
  const uid = localStorage.getItem("claimkaro_current_uid");
  if (uid && RETIRED_DEMO_UIDS.includes(uid)) {
    localStorage.removeItem("claimkaro_mock_user");
    localStorage.removeItem("claimkaro_mock_phone");
    localStorage.removeItem("claimkaro_current_uid");
    return null;
  }
  if (localStorage.getItem("claimkaro_mock_user") !== "true") return null;
  if (!uid) return null;
  const phone = localStorage.getItem("claimkaro_mock_phone") || "";
  return { uid, phoneNumber: phone } as User;
}
import { T } from "@/lib/i18n";
import type { StateId } from "@/lib/rules/types";
import { initialProfile } from "@/lib/store";
import type { Profile } from "@/lib/rules/types";

// Lazy auth: pages are public; commit actions call requireAuth(). If the
// visitor is logged in with a complete profile the action runs at once,
// otherwise the login form opens as a modal and the action runs right after.
interface AuthContextValue {
  user: User | null;
  isProfileComplete: boolean;
  requireAuth: (action: () => void) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isProfileComplete: false,
  requireAuth: (action) => action(),
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

// Merge anything typed while logged out (unscoped keys) into the account's
// uid-scoped keys. Latest answers win; the account's identity (name, phone,
// age) is preserved when already set.
function mergeGuestDataIntoUid(uid: string) {
  if (typeof window === "undefined" || !uid) return;
  try {
    const read = (key: string) => {
      try {
        const s = localStorage.getItem(key);
        return s ? JSON.parse(s) : undefined;
      } catch {
        return undefined;
      }
    };
    const guestProfile = read("claimkaro_profile") as Partial<Profile> | undefined;
    if (guestProfile && typeof guestProfile === "object") {
      const scopedKey = `claimkaro_profile:${uid}`;
      const scoped = (read(scopedKey) as Partial<Profile> | undefined) ?? {};
      const merged: Partial<Profile> = {
        ...guestProfile,
        ...scoped,
        name: scoped.name || guestProfile.name || initialProfile.name,
        phone: scoped.phone || guestProfile.phone || initialProfile.phone,
        age: scoped.age ?? guestProfile.age,
        language: guestProfile.language || scoped.language || initialProfile.language,
        state: scoped.state && scoped.state !== "CENTRAL" ? scoped.state : guestProfile.state || scoped.state || initialProfile.state,
        household: { ...initialProfile.household, ...(guestProfile.household ?? {}), ...(scoped.household ?? {}) },
        documentsHave: Array.from(new Set([...(scoped.documentsHave ?? []), ...(guestProfile.documentsHave ?? [])])),
        docDetails: scoped.docDetails ?? guestProfile.docDetails,
      };
      localStorage.setItem(scopedKey, JSON.stringify(merged));
    }
    const guestTracked = read("claimkaro_tracked");
    if (Array.isArray(guestTracked) && guestTracked.length > 0) {
      const scopedKey = `claimkaro_tracked:${uid}`;
      const scoped = read(scopedKey);
      const scopedArr = Array.isArray(scoped) ? scoped : [];
      const have = new Set(scopedArr.map((x: { schemeId: string }) => x?.schemeId));
      localStorage.setItem(scopedKey, JSON.stringify([...scopedArr, ...guestTracked.filter((x: { schemeId: string }) => x && !have.has(x.schemeId))]));
    }
    const guestConsent = read("claimkaro_ai_consent");
    if (typeof guestConsent === "boolean" && read(`claimkaro_ai_consent:${uid}`) === undefined) {
      localStorage.setItem(`claimkaro_ai_consent:${uid}`, JSON.stringify(guestConsent));
    }
    localStorage.removeItem("claimkaro_profile");
    localStorage.removeItem("claimkaro_tracked");
    localStorage.removeItem("claimkaro_ai_consent");
  } catch {
    /* ignore */
  }
}

export function getStateOptions(): { value: StateId; label: string }[] {
  return [
    { value: "ANDHRA_PRADESH", label: "Andhra Pradesh" },
    { value: "ARUNACHAL_PRADESH", label: "Arunachal Pradesh" },
    { value: "ASSAM", label: "Assam" },
    { value: "BIHAR", label: "Bihar" },
    { value: "CHHATTISGARH", label: "Chhattisgarh" },
    { value: "GOA", label: "Goa" },
    { value: "GUJARAT", label: "Gujarat" },
    { value: "HARYANA", label: "Haryana" },
    { value: "HIMACHAL_PRADESH", label: "Himachal Pradesh" },
    { value: "JHARKHAND", label: "Jharkhand" },
    { value: "KARNATAKA", label: "Karnataka" },
    { value: "KERALA", label: "Kerala" },
    { value: "MADHYA_PRADESH", label: "Madhya Pradesh" },
    { value: "MAHARASHTRA", label: "Maharashtra" },
    { value: "MANIPUR", label: "Manipur" },
    { value: "MEGHALAYA", label: "Meghalaya" },
    { value: "MIZORAM", label: "Mizoram" },
    { value: "NAGALAND", label: "Nagaland" },
    { value: "ODISHA", label: "Odisha" },
    { value: "PUNJAB", label: "Punjab" },
    { value: "RAJASTHAN", label: "Rajasthan" },
    { value: "SIKKIM", label: "Sikkim" },
    { value: "TAMIL_NADU", label: "Tamil Nadu" },
    { value: "TELANGANA", label: "Telangana" },
    { value: "TRIPURA", label: "Tripura" },
    { value: "UTTAR_PRADESH", label: "Uttar Pradesh" },
    { value: "UTTARAKHAND", label: "Uttarakhand" },
    { value: "WEST_BENGAL", label: "West Bengal" },
    { value: "ANDAMAN_AND_NICOBAR_ISLANDS", label: "Andaman and Nicobar Islands" },
    { value: "CHANDIGARH", label: "Chandigarh" },
    { value: "DADRA_AND_NAGAR_HAVELI_AND_DAMAN_AND_DIU", label: "Dadra and Nagar Haveli and Daman and Diu" },
    { value: "DELHI", label: "Delhi" },
    { value: "JAMMU_AND_KASHMIR", label: "Jammu and Kashmir" },
    { value: "LADAKH", label: "Ladakh" },
    { value: "LAKSHADWEEP", label: "Lakshadweep" },
    { value: "PUDUCHERRY", label: "Puducherry" },
    { value: "CENTRAL", label: "Central / Other" },
  ];
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useProfile();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [name, setName] = useState(profile.name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [age, setAge] = useState(profile.age?.toString() || "");
  const [state, setState] = useState<StateId>(profile.state || "CENTRAL");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isMockFallback, setIsMockFallback] = useState(false);
  // Lazy-auth modal: null = closed. When a commit action needs login, the
  // action is stashed here and runs right after login/onboarding completes.
  const [loginOpen, setLoginOpen] = useState(false);
  const pendingRef = useRef<(() => void) | null>(null);
  const lang = profile.language;
  const t = T[lang];

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      const localUser = restoreLocalUser();
      setUser(localUser);
      if (!localUser) localStorage.removeItem("claimkaro_current_uid");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("claimkaro-auth-change"));
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (nextUser) {
        setUser(nextUser);
        localStorage.setItem("claimkaro_current_uid", nextUser.uid);
      } else {
        // No real Firebase session — fall back to a stored demo/mock login if present.
        const localUser = restoreLocalUser();
        setUser(localUser);
        if (!localUser) localStorage.removeItem("claimkaro_current_uid");
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("claimkaro-auth-change"));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const resetToken = window.localStorage.getItem("claimkaro_auth_reset");
      if (resetToken) {
        setUser(null);
        setOtpSent(false);
        setConfirmation(null);
        setError("");
        window.localStorage.removeItem("claimkaro_auth_reset");
      }
    }
  }, []);

  useEffect(() => {
   const authInstance = auth;
   if (!isFirebaseConfigured || !authInstance) {
     return;
   }

   // Wait a tick so the recaptcha-container div has mounted in the DOM
   const timer = setTimeout(() => {
     const container = document.getElementById("recaptcha-container");
     if (!container) return;

     if (!(window as Window & { recaptchaVerifier?: RecaptchaVerifier }).recaptchaVerifier) {
       const verifier = new RecaptchaVerifier(authInstance, "recaptcha-container", {
        size: "invisible",
        callback: () => {},
      });
      (window as Window & { recaptchaVerifier?: RecaptchaVerifier }).recaptchaVerifier = verifier;
    }
  }, 100);

  return () => clearTimeout(timer);
}, []);

  const isProfileComplete = useMemo(() => {
    return Boolean(
      profile.name?.trim() &&
        profile.age &&
        profile.phone?.trim() &&
        profile.state,
    );
  }, [profile]);

  const closeLogin = useCallback(() => {
    pendingRef.current = null;
    setLoginOpen(false);
    setOtpSent(false);
    setError("");
  }, []);

  const runPending = useCallback(() => {
    const fn = pendingRef.current;
    pendingRef.current = null;
    setLoginOpen(false);
    setOtpSent(false);
    setError("");
    if (fn) {
      // Let the uid switch + store reload land first.
      setTimeout(fn, 60);
    }
  }, []);

  const requireAuth = useCallback(
    (action: () => void) => {
      if (user && isProfileComplete) {
        action();
      } else {
        pendingRef.current = action;
        setLoginOpen(true);
      }
    },
    [user, isProfileComplete],
  );

  async function saveOnboarding() {
    const safeAge = Number(age);
    if (!name.trim() || !phone.trim() || !Number.isFinite(safeAge) || safeAge <= 0 || !state) {
      setError("Please fill in all onboarding fields.");
      return;
    }
    setProfile((p) => ({
      ...p,
      name: name.trim(),
      phone,
      age: safeAge,
      state,
    }));
    setError("");
    runPending();
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const isDev = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const normalizedPhone = phone.trim();

    if (!normalizedPhone) {
      setError("Please enter your phone number.");
      return;
    }

    // Hackathon demo account — works in every environment, no SMS/billing needed.
    const phoneDigits = normalizedPhone.replace(/\D/g, "");
    const isDemoAccount = phoneDigits === DEMO_PHONE_DIGITS || phoneDigits === `91${DEMO_PHONE_DIGITS}`;
    if (isDemoAccount) {
      setSubmitting(true);
      if (!otpSent) {
        setOtpSent(true);
        setSubmitting(false);
        return;
      }

      if (otp.trim() !== DEMO_OTP) {
        setError(`Invalid OTP. For the demo account, please use ${DEMO_OTP}.`);
        setSubmitting(false);
        return;
      }

      const safeAge = Number(age);
      if (!name.trim() || !Number.isFinite(safeAge) || safeAge <= 0 || !state) {
        setError(lang === "hi" ? "कृपया सभी फ़ील्ड भरें।" : "Please fill in all fields.");
        setSubmitting(false);
        return;
      }
      // Write straight to the uid-scoped key so it survives the key switch below.
      writeProfileForUid(DEMO_UID, (p) => ({
        ...p,
        name: name.trim(),
        phone: normalizedPhone,
        age: safeAge,
        state,
      }));

      localStorage.setItem("claimkaro_mock_user", "true");
      localStorage.setItem("claimkaro_mock_phone", normalizedPhone);
      mergeGuestDataIntoUid(DEMO_UID);
      localStorage.setItem("claimkaro_current_uid", DEMO_UID);
      setUser({ uid: DEMO_UID, phoneNumber: normalizedPhone } as any);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("claimkaro-auth-change"));
      }
      setSubmitting(false);
      runPending();
      return;
    }

    const mustUseMock = !isFirebaseConfigured || !auth || isMockFallback;

    if (mustUseMock && isDev) {
      setSubmitting(true);
      if (!otpSent) {
        setOtpSent(true);
        setOtp("123456");
        setIsMockFallback(true);
        setSubmitting(false);
        return;
      }

      if (otp.trim() !== "123456") {
        setError("Invalid OTP. For development mock auth, please use 123456.");
        setSubmitting(false);
        return;
      }

      const mockUid = `mock-uid-${normalizedPhone.replace(/\D/g, "")}`;
      localStorage.setItem("claimkaro_mock_user", "true");
      localStorage.setItem("claimkaro_mock_phone", normalizedPhone);
      mergeGuestDataIntoUid(mockUid);
      localStorage.setItem("claimkaro_current_uid", mockUid);

      const safeAge = Number(age);
      if (!name.trim() || !normalizedPhone || !Number.isFinite(safeAge) || safeAge <= 0 || !state) {
        setError(lang === "hi" ? "कृपया सभी फ़ील्ड भरें।" : "Please fill in all fields.");
        setSubmitting(false);
        return;
      }
      writeProfileForUid(mockUid, (p) => ({
        ...p,
        name: name.trim(),
        phone: normalizedPhone,
        age: safeAge,
        state,
      }));
      setUser({ uid: mockUid, phoneNumber: normalizedPhone } as any);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("claimkaro-auth-change"));
      }
      setSubmitting(false);
      runPending();
      return;
    }

    // Real Firebase Auth
    setSubmitting(true);
    if (!otpSent) {
      try {
        if (!auth) {
          throw new Error("Firebase Auth is not initialized.");
        }
        const recaptcha = (window as Window & { recaptchaVerifier?: RecaptchaVerifier }).recaptchaVerifier;
        if (!recaptcha) {
          throw new Error("Recaptcha verifier not ready.");
        }
        await recaptcha.render();
        const result = await signInWithPhoneNumber(auth, normalizedPhone, recaptcha);
        setConfirmation(result);
        setOtpSent(true);
      } catch (err: any) {
        const errCode = err?.code || "";
        const errMsg = err?.message || "";
        const isBilling = errCode.includes("billing-not-enabled") || errMsg.includes("billing-not-enabled");
        if (isDev && isBilling) {
          // Dev fallback to mock auth so local sign-in keeps working without the Blaze plan.
          console.warn("Firebase phone auth requires the Blaze billing plan. Falling back to local mock authentication (OTP: 123456).");
          setIsMockFallback(true);
          setOtpSent(true);
          setOtp("123456");
        } else if (isBilling) {
          setError(
            lang === "hi"
              ? "फ़ोन साइन-इन अभी उपलब्ध नहीं है। कृपया बाद में पुनः प्रयास करें।"
              : "Phone sign-in is temporarily unavailable (SMS service not enabled). Please try again later.",
          );
        } else if (errCode.includes("invalid-phone-number")) {
          setError(
            lang === "hi"
              ? "अमान्य फ़ोन नंबर। कृपया देश कोड सहित दर्ज करें, जैसे +91…"
              : "Invalid phone number. Please include the country code, e.g. +91…",
          );
        } else if (errCode.includes("too-many-requests")) {
          setError(
            lang === "hi"
              ? "बहुत अधिक प्रयास। कृपया कुछ देर बाद पुनः प्रयास करें।"
              : "Too many attempts. Please try again in a little while.",
          );
        } else {
          setError(err instanceof Error ? err.message : "Failed to send OTP.");
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Verify OTP
    try {
      if (!confirmation) {
        throw new Error("No verification code confirmation available.");
      }
      const userCredential = await confirmation.confirm(otp);
      const nextUser = userCredential.user;

      const safeAge = Number(age);
      if (!name.trim() || !normalizedPhone || !Number.isFinite(safeAge) || safeAge <= 0 || !state) {
        setError(lang === "hi" ? "कृपया सभी फ़ील्ड भरें।" : "Please fill in all fields.");
        setSubmitting(false);
        return;
      }
      writeProfileForUid(nextUser.uid, (p) => ({
        ...p,
        name: name.trim(),
        phone: normalizedPhone,
        age: safeAge,
        state,
      }));

      setUser(nextUser);
      mergeGuestDataIntoUid(nextUser.uid);
      localStorage.setItem("claimkaro_current_uid", nextUser.uid);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("claimkaro-auth-change"));
      }
      runPending();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Failed to verify OTP.");
    } finally {
      setSubmitting(false);
    }
  }

  // Public by default: children always render. The login/onboarding form
  // only appears as a modal when a commit action calls requireAuth().
  const isOnboarding = Boolean(user && !isProfileComplete);

  return (
    <AuthContext.Provider value={{ user, isProfileComplete, requireAuth }}>
      {children}
      {loginOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center"
          onClick={closeLogin}
          role="dialog"
          aria-modal="true"
          aria-label={lang === "hi" ? "लॉगिन" : "Login"}
        >
          <div
            className="hs-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-700">ClaimKaro</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">
                  {isOnboarding
                    ? (lang === "hi" ? "प्रोफ़ाइल पूरी करें" : "Complete your profile")
                    : t.authSingleTitle}
                </h1>
                {!isOnboarding && (
                  <p className="text-xs text-slate-500 mt-1">{t.authSingleSub}</p>
                )}
                {isOnboarding && (
                  <p className="text-xs text-slate-500 mt-1">
                    {lang === "hi"
                      ? `आप फोन नंबर ${phone || user?.phoneNumber} से जुड़े हैं। जारी रखने के लिए कृपया अपनी प्रोफ़ाइल विवरण भरें।`
                      : `You are signed in as ${phone || user?.phoneNumber}. Please complete your profile to continue.`}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeLogin}
                className="shrink-0 rounded-full p-1.5 text-lg leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label={lang === "hi" ? "बंद करें" : "Close"}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={isOnboarding ? (e) => { e.preventDefault(); saveOnboarding(); } : handleAuthSubmit}
              className="mt-6 space-y-4"
            >
              <div id="recaptcha-container"></div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700 font-bold">{t.profileName}</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 font-bold">{t.profileAge}</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 font-bold"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 font-bold">{t.profileState}</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value as StateId)}
                  className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-white font-bold"
                  required
                >
                  {getStateOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {!isOnboarding && (
                <div>
                  <label className="text-sm font-medium text-slate-700 font-bold">Phone number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-0 focus:border-blue-500 font-bold"
                    placeholder="+91 98765 43210"
                    required
                    disabled={otpSent}
                  />
                </div>
              )}

              {!isOnboarding && otpSent && (
                <div>
                  <label className="text-sm font-medium text-slate-700 font-bold">OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-0 focus:border-blue-500 font-bold"
                    placeholder="123456"
                    required
                  />
                </div>
              )}

              {error ? <p className="text-sm text-rose-600">{error}</p> : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 transition"
              >
                {submitting
                  ? t.authLoading
                  : isOnboarding
                    ? (lang === "hi" ? "प्रोफ़ाइल पूरी करें" : "Complete Profile")
                    : !otpSent
                      ? (lang === "hi" ? "OTP प्राप्त करें" : "Get OTP")
                      : t.authContinue}
              </button>
            </form>

            {!isOnboarding && (
              <div className="mt-5 rounded-xl bg-mint-bg border border-mint-border px-4 py-3 text-[12px] leading-relaxed">
                <p className="font-bold text-blue-700">{t.authDemoNote}</p>
                <p className="mt-0.5 font-semibold text-slate-700">
                  {t.authDemoPhone}: <span className="font-extrabold">+91 {DEMO_PHONE_DIGITS}</span> · {t.authDemoOtp}: <span className="font-extrabold">{DEMO_OTP}</span>
                </p>
              </div>
            )}

            {isOnboarding && (
              <button
                type="button"
                onClick={async () => {
                  if (auth) {
                    await signOut(auth).catch(() => {});
                  }
                  clearSession();
                  window.location.reload();
                }}
                className="mt-4 w-full text-center text-xs font-semibold text-rose-600 hover:underline"
              >
                {lang === "hi" ? "🚪 लॉग आउट करें (दूसरा नंबर उपयोग करें)" : "🚪 Log out (use different number)"}
              </button>
            )}
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}
