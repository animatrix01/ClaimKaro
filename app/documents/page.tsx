"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import confetti from "canvas-confetti";
import { useProfile } from "@/lib/store";
import { Nav, YNU, DOC_ICON, ALL_DOCS } from "@/components/shared";
import { T, type Lang } from "@/lib/i18n";
import { runAssessment } from "@/lib/rules/engine";
import { tx } from "@/lib/rules/types";
import type { DocDetails, DocId } from "@/lib/rules/types";
import { useAuth } from "@/components/AuthGate";
import { speakText, isSpeechSupported } from "@/lib/speech";

interface ScanOutcome {
  docId: DocId;
  nameOnDoc?: string;
  confidence: "high" | "medium" | "low";
  source: "gemini" | "fallback";
  error?: string;
}

function fileTypeIcon(file: File): string {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "📕";
  if (name.match(/\.(doc|docx)$/)) return "📝";
  if (name.match(/\.(jpg|jpeg|png|webp|gif|bmp)$/)) return "🖼️";
  if (name.endsWith(".txt")) return "📄";
  return "📎";
}

// Circular progress ring for readiness score
function ScoreRing({ score }: { score: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score === 100 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }}>
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-extrabold leading-none" style={{ color }}>{score}</span>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">Score</span>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const [profile, setProfile] = useProfile();
  const { requireAuth } = useAuth();
  const lang = profile.language;
  const setLang = (l: Lang) => setProfile((p) => ({ ...p, language: l }));
  const t = T[lang];
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanOutcome, setScanOutcome] = useState<ScanOutcome | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (showWebcam) {
      document.body.style.overflow = "hidden";
      document.body.style.height = "100vh";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [showWebcam]);

  useEffect(() => {
    if (webcamStream && videoRef.current) {
      videoRef.current.srcObject = webcamStream;
      videoRef.current.play().catch(() => {});
    }
  }, [webcamStream]);

  async function startWebcam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setWebcamStream(stream);
      setShowWebcam(true);
    } catch {
      alert(lang === "hi"
        ? "कैमरा खोलने में असफल। कृपया अनुमति दें या फ़ोटो चुनें।"
        : "Failed to open camera. Please allow permission or choose a photo.");
    }
  }

  function stopWebcam() {
    webcamStream?.getTracks().forEach((t) => t.stop());
    setWebcamStream(null);
    setShowWebcam(false);
  }

  async function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      stopWebcam();
      setScanning(true);
      setScanOutcome(null);
      const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
      const payload = await fileToDownscaledBase64(file);
      let outcome: ScanOutcome;
      if (!payload) {
        outcome = { ...mockScan(), error: t.scanUnsupportedFile };
      } else {
        try {
          const res = await fetch("/api/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: payload.base64, mimeType: payload.mimeType }),
          });
          const data = await res.json() as { docId?: string | null; nameOnDoc?: string; confidence?: string; source?: string; error?: string };
          if (!res.ok || !data.docId) {
            outcome = { ...(data.docId ? { docId: data.docId as DocId } : mockScan()), confidence: "low", source: "fallback", error: data.error || t.scanUnreadable };
            if (data.docId === null && data.source === "gemini") outcome.error = t.scanNotDoc;
          } else {
            outcome = { docId: data.docId as DocId, nameOnDoc: data.nameOnDoc, confidence: (data.confidence as ScanOutcome["confidence"]) || "medium", source: (data.source as ScanOutcome["source"]) || "gemini" };
          }
        } catch {
          outcome = { ...mockScan(), error: t.scanOffline };
        }
      }
      applyScan(outcome);
      setScanning(false);
    }, "image/jpeg", 0.85);
  }

  function toggleDoc(d: DocId) {
    setProfile((p) => ({ ...p, documentsHave: p.documentsHave.includes(d) ? p.documentsHave.filter((x) => x !== d) : [...p.documentsHave, d] }));
  }
  function setName(doc: DocId, val: string) {
    setProfile((p) => { const cur: DocDetails = p.docDetails ?? { names: {} }; return { ...p, docDetails: { ...cur, names: { ...cur.names, [doc]: val } } }; });
  }
  function setDD(patch: Partial<DocDetails>) {
    setProfile((p) => ({ ...p, docDetails: { names: {}, ...(p.docDetails ?? {}), ...patch } }));
  }
  function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadedFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  }
  function removeUpload(index: number) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function fileToDownscaledBase64(file: File): Promise<{ base64: string; mimeType: string } | null> {
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      if (!dataUrl.startsWith("data:")) return null;
      const raw = dataUrl.split(",")[1];
      if (dataUrl.startsWith("data:image/") && typeof document !== "undefined") {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const im = new Image();
          im.onload = () => resolve(im);
          im.onerror = reject;
          im.src = dataUrl;
        });
        const max = 1024;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        if (scale < 1) {
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const out = canvas.toDataURL("image/jpeg", 0.75);
          return { base64: out.split(",")[1], mimeType: "image/jpeg" };
        }
      }
      const mimeType = file.type || "image/jpeg";
      if (!mimeType.startsWith("image/")) return null;
      return { base64: raw, mimeType };
    } catch { return null; }
  }

  function mockScan(): ScanOutcome {
    return { docId: "ration_bpl", confidence: "low", source: "fallback" };
  }

  async function handleScan(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScanning(true);
    setScanOutcome(null);
    try {
      const payload = await fileToDownscaledBase64(file);
      let outcome: ScanOutcome;
      if (!payload) {
        outcome = { ...mockScan(), error: t.scanUnsupportedFile };
      } else {
        try {
          const res = await fetch("/api/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: payload.base64, mimeType: payload.mimeType }),
          });
          const data = await res.json() as { docId?: string | null; nameOnDoc?: string; confidence?: string; source?: string; error?: string };
          if (!res.ok || !data.docId) {
            outcome = { ...(data.docId ? { docId: data.docId as DocId } : mockScan()), confidence: "low", source: "fallback", error: data.error || t.scanUnreadable };
            if (data.docId === null && data.source === "gemini") outcome.error = t.scanNotDoc;
          } else {
            outcome = { docId: data.docId as DocId, nameOnDoc: data.nameOnDoc, confidence: (data.confidence as ScanOutcome["confidence"]) || "medium", source: (data.source as ScanOutcome["source"]) || "gemini" };
          }
        } catch {
          outcome = { ...mockScan(), error: t.scanOffline };
        }
      }
      applyScan(outcome);
    } finally {
      setScanning(false);
    }
  }

  function applyScan(outcome: ScanOutcome) {
    setScanOutcome(outcome);
    if (!outcome.docId || outcome.confidence === "low") return;
    setProfile((p) => {
      const documentsHave = p.documentsHave.includes(outcome.docId) ? p.documentsHave : [...p.documentsHave, outcome.docId];
      const cur: DocDetails = p.docDetails ?? { names: {} };
      const names = outcome.nameOnDoc ? { ...cur.names, [outcome.docId]: outcome.nameOnDoc } : cur.names;
      return { ...p, documentsHave, docDetails: { ...cur, names } };
    });
    let assessment;
    try {
      assessment = runAssessment({
        ...profile,
        docDetails: { ...(profile.docDetails ?? { names: {} }), names: { ...(profile.docDetails?.names ?? {}), ...(outcome.nameOnDoc ? { [outcome.docId]: outcome.nameOnDoc } : {}) } },
        documentsHave: profile.documentsHave.includes(outcome.docId) ? profile.documentsHave : [...profile.documentsHave, outcome.docId],
        language: lang,
      });
    } catch { assessment = undefined; }
    const value = assessment?.estimatedAnnualValue ? `₹${assessment.estimatedAnnualValue.toLocaleString("en-IN")}` : "";
    confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
    if (isSpeechSupported()) {
      const docLabel = outcome.docId === "ration_bpl" ? "आपका राशन कार्ड" : "आपका जाति प्रमाण पत्र";
      const msg = `बधाई हो! ${docLabel} जाँच लिया गया है।${outcome.nameOnDoc ? ` नाम ${outcome.nameOnDoc} पाया गया।` : ""} अब आप ${value ? `${value} सालाना` : "योजना का लाभ"} दावा करने के लिए तैयार हैं।`;
      speakText(msg, "hi");
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const assessment = runAssessment({ ...profile, language: lang });
  const hasDocs = profile.documentsHave.length > 0;
  const score = assessment.readiness.score;

  const WebcamModal = () => {
    if (!showWebcam) return null;
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4"
        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}>
        <div className="relative w-full max-w-4xl">
          <div className="relative bg-black rounded-3xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute flex items-center justify-center pointer-events-none"
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
              <div className="border-4 border-dashed border-white/40 rounded-2xl flex items-center justify-center"
                style={{ width: "80%", height: "75%" }}>
                <p className="text-white text-base font-bold bg-black/70 px-6 py-3 rounded-full backdrop-blur-sm">
                  {lang === "hi" ? "दस्तावेज़ को फ्रेम में रखें" : "Position document in frame"}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <button onClick={stopWebcam} className="rounded-2xl bg-white/90 hover:bg-white px-6 py-3.5 text-base font-bold text-slate-800 transition click-scale shadow-lg">
              {lang === "hi" ? "रद्द करें" : "Cancel"}
            </button>
            <button onClick={capturePhoto} className="flex-1 rounded-2xl bg-brand-green hover:bg-brand-green-hover px-6 py-3.5 text-base font-bold text-white transition hover-lift click-scale shadow-lg flex items-center justify-center gap-2">
              <span className="text-xl">📸</span>
              {lang === "hi" ? "फ़ोटो लें" : "Capture Photo"}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="hs-page animate-page-enter min-h-screen">
      <WebcamModal />
      <Nav lang={lang} onLang={setLang} />

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">

        {/* ── 1. Page Header with privacy badge + vault summary ── */}
        <div className="text-center animate-page-enter">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-mint-bg border border-mint-border/50 mb-3">
            <span>🔒</span>
            <span className="text-xs font-bold text-brand-green uppercase tracking-wider">{t.privacyChip}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            {lang === "hi" ? "आपका दस्तावेज़ लॉकर" : "Your document vault"}
          </h1>
          <p className="text-[13.5px] text-slate-500 mt-2 leading-relaxed">{t.docsLead}</p>
          {/* Live vault summary */}
          {hasDocs && (
            <div className="inline-flex items-center gap-3 mt-3 px-4 py-2 rounded-full bg-white border border-[#E3E0CF] shadow-xs animate-page-enter">
              <span className="text-sm font-bold text-slate-700">
                {profile.documentsHave.length} {lang === "hi" ? "दस्तावेज़" : "document"}{profile.documentsHave.length !== 1 && lang === "en" ? "s" : ""}
              </span>
              <span className="w-px h-4 bg-slate-200" />
              <span className={`text-sm font-bold ${score === 100 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600"}`}>
                {score === 100
                  ? (lang === "hi" ? "✅ तैयार" : "✅ Ready to apply")
                  : (lang === "hi" ? `⚠️ ${score}% तैयार` : `⚠️ ${score}% ready`)}
              </span>
            </div>
          )}
        </div>

        {/* ── 2. Merged Snap & Listen + Upload card ── */}
        <section className="rounded-3xl bg-white border border-[#E3E0CF]/80 shadow-sm hover-lift transition-all overflow-hidden animate-page-enter">
          {/* Snap & Listen — gradient top section */}
          <div className="p-6" style={{ background: 'linear-gradient(135deg, #EFF4FF 0%, #ffffff 100%)' }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">📸</span>
                  <h2 className="text-[15px] font-bold text-slate-850 uppercase tracking-wider">{t.scanTitle}</h2>
                </div>
                <p className="text-[13px] text-slate-500 leading-relaxed">{t.scanHint}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  onClick={() => requireAuth(startWebcam)}
                  disabled={scanning || showWebcam}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-brand-green hover:bg-brand-green-hover px-5 py-3 text-sm font-bold text-white transition hover-lift click-scale shadow-sm disabled:opacity-60 disabled:pointer-events-none"
                >
                  📸 {scanning ? t.scanScanning : t.scanCamera}
                </button>
                <label htmlFor="file-scan"
                  className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl bg-white border border-[#E3E0CF] hover:bg-slate-50 px-5 py-3 text-sm font-bold text-slate-700 transition hover-lift click-scale select-none">
                  🖼️ {t.scanFile}
                </label>
                <input id="file-scan" type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={(e) => requireAuth(() => handleScan(e))} />
              </div>
            </div>

            {scanning && (
              <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-mint-bg/60 border border-mint-border px-4 py-3">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-green border-t-transparent" />
                <p className="text-[13px] font-bold text-brand-green">{t.scanWorking}</p>
              </div>
            )}

            {!scanning && scanOutcome && (
              <div className={`mt-4 rounded-2xl px-4 py-3 border ${scanOutcome.docId && scanOutcome.confidence !== "low" ? "bg-mint-bg/60 border-mint-border" : "bg-red-50/60 border-red-100"}`} role="status">
                <p className={`text-[13.5px] font-bold ${scanOutcome.docId && scanOutcome.confidence !== "low" ? "text-brand-green" : "text-red-700"}`}>
                  {scanOutcome.docId && scanOutcome.confidence !== "low"
                    ? `✅ ${t.scanSuccess.replace("{doc}", t.docNames[scanOutcome.docId])}`
                    : `⚠️ ${scanOutcome.error || t.scanUnreadable}`}
                </p>
                {scanOutcome.nameOnDoc && scanOutcome.confidence !== "low" && (
                  <p className="mt-0.5 text-[12.5px] font-semibold text-slate-600">
                    {t.nameOnDoc} {t.docNames[scanOutcome.docId]}: <span className="font-extrabold">{scanOutcome.nameOnDoc}</span>
                    {scanOutcome.source === "fallback" ? " · " + t.scanLowConfidence : ""}
                  </p>
                )}
              </div>
            )}

            <div className="mt-3 flex items-center gap-1.5 text-[11.5px] text-slate-400">
              <span>🔒</span>
              <span>{t.scanPrivacy}</span>
            </div>
          </div>

          {/* OR divider */}
          <div className="relative flex items-center px-6">
            <div className="flex-1 border-t border-slate-100" />
            <span className="mx-3 text-xs font-bold text-slate-400 uppercase tracking-wider bg-white px-2">
              {lang === "hi" ? "या" : "or"}
            </span>
            <div className="flex-1 border-t border-slate-100" />
          </div>

          {/* Upload from device — bottom section */}
          <div className="p-6 pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">📁</span>
                  <h2 className="text-[15px] font-bold text-slate-850 uppercase tracking-wider">{t.uploadTitle}</h2>
                </div>
                <p className="text-[13px] text-slate-500 leading-relaxed">{t.uploadHint}</p>
              </div>
              <label htmlFor="device-upload"
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl bg-white border-2 border-brand-green/30 hover:bg-mint-bg/40 hover:border-brand-green/60 px-5 py-3 text-sm font-bold text-brand-green transition hover-lift click-scale select-none shrink-0">
                📁 {t.uploadButton}
              </label>
              <input id="device-upload" type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt,.rtf" className="hidden"
                onChange={(e) => requireAuth(() => handleUpload(e))} />
            </div>

            {/* ── 3. Uploaded files with type icon + remove ── */}
            {uploadedFiles.length > 0 && (
              <ul className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-4 border border-slate-100">
                {uploadedFiles.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center gap-3 text-xs font-bold text-slate-700 group animate-page-enter">
                    <span className="text-base shrink-0">{fileTypeIcon(file)}</span>
                    <span className="truncate flex-1">{file.name}</span>
                    <span className="shrink-0 text-slate-400 font-semibold">{formatSize(file.size)}</span>
                    <span className="shrink-0 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">✓</span>
                    <button onClick={() => removeUpload(index)}
                      className="shrink-0 text-slate-300 hover:text-red-500 transition font-bold text-sm leading-none"
                      title="Remove">✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ── 4. Document Vault Checklist ── */}
        <section className="rounded-3xl bg-white p-6 border border-[#E3E0CF]/80 shadow-sm hover-lift transition-all animate-page-enter">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold text-slate-850 uppercase tracking-wider">{t.haveQ}</h2>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
              profile.documentsHave.length === 0
                ? "bg-slate-50 text-slate-400 border-slate-200"
                : "bg-mint-bg text-brand-green border-mint-border/60"
            }`}>
              {profile.documentsHave.length} / {ALL_DOCS.length} {lang === "hi" ? "दस्तावेज़" : "docs"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {ALL_DOCS.map((d) => {
              const active = profile.documentsHave.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => requireAuth(() => toggleDoc(d))}
                  className={`relative flex items-center gap-2.5 rounded-2xl px-4 py-3.5 text-left text-[13px] font-bold border transition-all duration-200 hover-lift click-scale ${
                    active
                      ? "bg-brand-green text-white border-brand-green shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <span className="text-xl leading-none shrink-0">{DOC_ICON[d]}</span>
                  <span className="leading-tight">{t.docNames[d]}</span>
                  {active && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[10px] font-extrabold">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── 5. Rejection details section ── */}
          {hasDocs && (
            <div className="mt-6 space-y-5 border-t border-slate-100 pt-5">
              {/* Amber callout warning */}
              <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3.5 flex items-start gap-3">
                <span className="text-xl shrink-0">⚠️</span>
                <div>
                  <p className="text-[13.5px] font-bold text-amber-800">
                    {lang === "hi" ? "अधिकांश आवेदन यहाँ असफल होते हैं" : "Most applications fail here, not at the office"}
                  </p>
                  <p className="text-[12px] text-amber-700 mt-0.5 leading-relaxed">
                    {lang === "hi"
                      ? "ये विवरण ध्यान से भरें — नाम बेमेल और आधार-बैंक सीडिंग की गलतियाँ मंज़ूरी के बाद भी पैसा रोक देती हैं।"
                      : "Fill these carefully — name mismatches and Aadhaar-bank seeding errors stop money even after approval."}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-[14.5px] font-bold text-slate-800">{t.detailsTitle}</h3>
                <p className="mt-0.5 text-[12.5px] text-slate-500 leading-relaxed">{t.detailsHint}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {profile.documentsHave
                  .filter((d) => ["aadhaar", "bank", "caste", "income", "ration_bpl"].includes(d))
                  .map((d) => (
                    <div key={d}>
                      <p className="mb-1.5 text-[13px] font-bold text-slate-600">
                        {t.nameOnDoc} {t.docNames[d]}
                      </p>
                      <input
                        value={profile.docDetails?.names?.[d] ?? ""}
                        onChange={(e) => { const v = e.target.value; requireAuth(() => setName(d, v)); }}
                        placeholder="—"
                        className="w-full rounded-2xl border border-[#E3E0CF] px-4 py-2.5 text-sm font-bold outline-none focus:border-brand-green focus:ring-2 focus:ring-mint-bg transition"
                      />
                    </div>
                  ))}
              </div>

              <div className="space-y-4 pt-3 border-t border-slate-50">
                {profile.documentsHave.includes("bank") && (
                  <>
                    <YNU label={t.seedQ} value={profile.docDetails?.bankAadhaarSeeded} onChange={(v) => requireAuth(() => setDD({ bankAadhaarSeeded: v }))} t={t} />
                    <YNU label={t.dormantQ} value={profile.docDetails?.bankDormant} onChange={(v) => requireAuth(() => setDD({ bankDormant: v }))} t={t} />
                    <div>
                      <p className="mb-1.5 text-[13px] font-bold text-slate-600">{t.ifscLabel}</p>
                      <input
                        value={profile.docDetails?.bankIfsc ?? ""}
                        onChange={(e) => { const v = e.target.value; requireAuth(() => setDD({ bankIfsc: v })); }}
                        placeholder="SBIN0001234"
                        className="w-full rounded-2xl border border-[#E3E0CF] px-4 py-2.5 text-sm font-bold outline-none focus:border-brand-green focus:ring-2 focus:ring-mint-bg transition sm:w-1/2"
                      />
                    </div>
                  </>
                )}
                {profile.documentsHave.includes("aadhaar") && (
                  <YNU label={t.mobileQ} value={profile.docDetails?.aadhaarMobileLinked} onChange={(v) => requireAuth(() => setDD({ aadhaarMobileLinked: v }))} t={t} />
                )}
                {profile.documentsHave.includes("caste") && profile.category === "OBC" && (
                  <YNU label={t.nclQ} value={profile.docDetails?.casteIsNCL} onChange={(v) => requireAuth(() => setDD({ casteIsNCL: v }))} t={t} />
                )}
                {profile.documentsHave.includes("income") && (
                  <div>
                    <p className="mb-1.5 text-[13px] font-bold text-slate-600">{t.incomeYearQ}</p>
                    <input
                      type="number"
                      value={profile.docDetails?.incomeCertYear ?? ""}
                      onChange={(e) => { const v = e.target.value; requireAuth(() => setDD({ incomeCertYear: v === "" ? undefined : Number(v) })); }}
                      placeholder="2024"
                      className="w-32 rounded-2xl border border-[#E3E0CF] px-4 py-2 text-sm font-bold outline-none focus:border-brand-green focus:ring-2 focus:ring-mint-bg transition"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── 6. Readiness card with circular score ring ── */}
        {hasDocs ? (
          <section className="rounded-3xl bg-white p-6 shadow-sm border border-[#E3E0CF] hover-lift animate-page-enter">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-1.5">🛡️ {t.readyTitle}</h3>
                <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">{t.readyBody}</p>
              </div>
              <div className="shrink-0">
                <ScoreRing score={score} />
                <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{t.readyScore}</p>
              </div>
            </div>

            {assessment.readiness.issues.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-emerald-50 p-3.5 text-[13.5px] font-bold text-emerald-700 border border-emerald-100 flex items-center gap-2">
                ✅ {t.allClear}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {assessment.readiness.issues.map((issue) => {
                  const sev = {
                    blocker: { card: "border-rose-200 bg-rose-50/50", badge: "bg-rose-100 text-rose-800 border-rose-200", label: t.sevBlocker },
                    warning: { card: "border-amber-200 bg-amber-50/50", badge: "bg-amber-100 text-amber-800 border-amber-200", label: t.sevWarning },
                    info:    { card: "border-slate-200 bg-slate-50/50", badge: "bg-slate-100 text-slate-800 border-slate-200", label: t.sevInfo },
                  }[issue.severity];
                  const { tx: _tx } = { tx };
                  return (
                    <li key={issue.id} className={`rounded-2xl border p-4 transition-colors ${sev.card}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${sev.badge}`}>{sev.label}</span>
                        <p className="text-[14px] font-bold text-slate-900">{_tx(issue.title, lang)}</p>
                      </div>
                      <p className="mt-1.5 text-[13.5px] text-slate-600 leading-relaxed">{_tx(issue.detail, lang)}</p>
                      <p className="mt-2 text-[13px] font-bold text-slate-800">
                        👉 {t.fixLabel} <span className="font-normal text-slate-600">{_tx(issue.fix, lang)}</span>
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : (
          <section className="rounded-3xl bg-white p-6 text-center text-[14px] text-slate-500 border border-[#E3E0CF]/80 shadow-2xs hover-lift transition">
            {t.addFirst}
          </section>
        )}

        <footer className="pb-10 pt-4 text-center text-[11px] font-semibold text-slate-400 max-w-sm mx-auto leading-normal">
          {t.trust}
        </footer>
      </main>
    </div>
  );
}
