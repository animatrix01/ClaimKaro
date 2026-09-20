"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Profile } from "./rules/types";

// Privacy-first persistence. Everything lives in the browser's localStorage on
// THIS device — the profile, the document vault, and the application tracker.
// Nothing is uploaded. The rules engine also runs on-device; only the optional
// AI explanation ever sends a short, de-identified summary to the server.

export const initialProfile: Profile = {
  language: "en",
  state: "CENTRAL",
  category: "GENERAL",
  disability: "none",
  household: {
    isWidow: false,
    isPregnantOrLactating: false,
    hasSchoolGoingChild: false,
    hasElderly60Plus: false,
    lacksPuccaHouse: false,
    lacksLpg: false,
    isRural: true,
  },
  documentsHave: [],
};

function getScopedStorageKey(baseKey: string) {
  if (typeof window === "undefined") {
    return baseKey;
  }

  const userId = window.localStorage.getItem("claimkaro_current_uid");
  return userId ? `${baseKey}:${userId}` : baseKey;
}

function useLocal<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void, boolean] {
  const [val, setVal] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  const initialRef = useRef(initial);
  initialRef.current = initial;
  // The current key and value, read inside the setter so writes always target
  // the live key without re-creating the setter on every change.
  const keyRef = useRef(key);
  keyRef.current = key;
  const valRef = useRef(val);
  valRef.current = val;

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      try {
        const s = localStorage.getItem(key);
        const next = s ? (JSON.parse(s) as T) : initialRef.current;
        if (!cancelled) {
          setVal(next);
          valRef.current = next;
        }
      } catch {
        if (!cancelled) {
          setVal(initialRef.current);
          valRef.current = initialRef.current;
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    };

    load();

    const syncStorage = () => load();
    if (typeof window !== "undefined") {
      window.addEventListener("storage", syncStorage);
      window.addEventListener("claimkaro-auth-change", syncStorage);
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", syncStorage);
        window.removeEventListener("claimkaro-auth-change", syncStorage);
      }
    };
  }, [key]);

  // Persist only on explicit updates, writing to the CURRENT key. There is no
  // auto-persist effect on key change — that previously overwrote a freshly
  // loaded scoped key (e.g. right after sign-in) with stale state.
  const update = useCallback((next: T | ((p: T) => T)) => {
    const resolved = typeof next === "function" ? (next as (p: T) => T)(valRef.current) : next;
    valRef.current = resolved;
    setVal(resolved);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(keyRef.current, JSON.stringify(resolved));
      }
    } catch {
      /* ignore */
    }
  }, []);

  return [val, update, loaded];
}

export function useProfile() {
  const [profileKey, setProfileKey] = useState(() => getScopedStorageKey("claimkaro_profile"));

  useEffect(() => {
    const syncKey = () => setProfileKey(getScopedStorageKey("claimkaro_profile"));
    syncKey();

    if (typeof window !== "undefined") {
      window.addEventListener("claimkaro-auth-change", syncKey);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("claimkaro-auth-change", syncKey);
      }
    };
  }, []);

  return useLocal<Profile>(profileKey, initialProfile);
}

// Write profile fields directly to the uid-scoped localStorage key. Used at
// sign-in / onboarding time, when the useProfile() hook's scoped key may not
// have caught up with the freshly-set current_uid yet (a React state race that
// otherwise writes onboarding data to the wrong key and loses it).
export function writeProfileForUid(uid: string, updater: (p: Profile) => Profile) {
  if (typeof window === "undefined") return;
  const key = uid ? `claimkaro_profile:${uid}` : "claimkaro_profile";
  let current: Profile = initialProfile;
  try {
    const s = localStorage.getItem(key);
    if (s) current = { ...initialProfile, ...(JSON.parse(s) as Profile) };
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(key, JSON.stringify(updater(current)));
  } catch {
    /* ignore */
  }
}

export type TrackStatus = "to_start" | "applied" | "under_review" | "approved" | "received" | "rejected";
export const TRACK_STATUSES: TrackStatus[] = ["to_start", "applied", "under_review", "approved", "received", "rejected"];

export interface TrackedApp {
  schemeId: string;
  status: TrackStatus;
  note?: string;
  addedAt: string;
  updatedAt: string;
}

export function useTracked() {
  const [trackedKey, setTrackedKey] = useState(() => getScopedStorageKey("claimkaro_tracked"));

  useEffect(() => {
    const syncKey = () => setTrackedKey(getScopedStorageKey("claimkaro_tracked"));
    syncKey();

    if (typeof window !== "undefined") {
      window.addEventListener("claimkaro-auth-change", syncKey);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("claimkaro-auth-change", syncKey);
      }
    };
  }, []);

  return useLocal<TrackedApp[]>(trackedKey, []);
}

// Consent for the optional AI explanation (the only thing that ever leaves the device).
export function useAIConsent() {
  const [consentKey, setConsentKey] = useState(() => getScopedStorageKey("claimkaro_ai_consent"));

  useEffect(() => {
    const syncKey = () => setConsentKey(getScopedStorageKey("claimkaro_ai_consent"));
    syncKey();

    if (typeof window !== "undefined") {
      window.addEventListener("claimkaro-auth-change", syncKey);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("claimkaro-auth-change", syncKey);
      }
    };
  }, []);

  return useLocal<boolean>(consentKey, true);
}

export function clearSession() {
  try {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("claimkaro_current_uid");
      sessionStorage.removeItem("claimkaro_mock_user");
      sessionStorage.removeItem("claimkaro_mock_phone");
      localStorage.removeItem("claimkaro_current_uid");
      localStorage.removeItem("claimkaro_mock_user");
      localStorage.removeItem("claimkaro_mock_phone");
      window.dispatchEvent(new Event("claimkaro-auth-change"));
    }
  } catch {
    /* ignore */
  }
}

export function clearAll() {
  try {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("claimkaro_current_uid");
      sessionStorage.removeItem("claimkaro_mock_user");
      sessionStorage.removeItem("claimkaro_mock_phone");
      localStorage.removeItem("claimkaro_mock_user");
      localStorage.removeItem("claimkaro_mock_phone");
    }
    localStorage.removeItem("claimkaro_current_uid");
    localStorage.removeItem("claimkaro_profile");
    localStorage.removeItem("claimkaro_tracked");
    localStorage.removeItem("claimkaro_ai_consent");

    for (const key of Object.keys(localStorage)) {
      if (
        key.startsWith("claimkaro_profile:") ||
        key.startsWith("claimkaro_tracked:") ||
        key.startsWith("claimkaro_ai_consent:")
      ) {
        localStorage.removeItem(key);
      }
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("claimkaro-auth-change"));
    }
  } catch {
    /* ignore */
  }
}
