<div align="right"><strong>HACK DEVENGERS 2.0</strong></div>

<div align="center">

<img src="./public/logo.png" alt="ClaimKaro Logo" width="120" height="120" />

# ClaimKaro — दावा करो

### The benefits you are owed: found, explained, and claimed.

<br />

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-claim--karo.vercel.app-blue?style=for-the-badge)](https://claim-karo.vercel.app/)
[![Hack Devengers 2.0](https://img.shields.io/badge/Built_for-Hack_Devengers_2.0-orange?style=for-the-badge)](https://claim-karo.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.9-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

<br />

**An AI-powered, privacy-first, bilingual welfare navigator that helps low-income Indian families discover government schemes, fix paperwork mistakes, and track applications until the money arrives.**

---

</div>

<br />

## 🎬 DEMO VIDEO

https://github.com/user-attachments/assets/3375c7a4-c197-47ca-a667-6bf897510ef6

<br />

## 📋 Table of Contents

- [The Problem](#-the-problem-were-solving)
- [Features](#-features-that-make-a-difference)
- [Innovation](#-innovation-that-sets-us-apart)
- [Tech Stack](#%EF%B8%8F-technology-stack)
- [Quick Start](#-get-started-in-2-minutes)
- [Testing](#-testing-the-ai-features)
- [Deployment](#-deployment)
- [Why It Matters](#-why-this-project-matters)
- [Acknowledgments](#-built-with-gratitude)

<br />

<br />

---

## 🎯 The Problem We're Solving

<br />

India spends **₹4+ lakh crore** annually on welfare, yet ~20% of eligible families never access these benefits.

### Why?

| Issue | Impact |
|-------|--------|
| **Discovery Gap** | People don't know what they're entitled to |
| **Documentation Trap** | Missing one paper locks them out of everything |
| **Silent Rejections** | 8–12% of approved scholarships never paid due to errors |

<br />

**ClaimKaro solves all three.**

<br />

---

<br />

## ✨ Features That Make a Difference

<br />

### 🔍 **Intelligent Eligibility Discovery**
- **NLP-powered intake**: Describe your situation in natural language (English or Hindi) — "मैं एक विधवा हूं, BPL कार्ड है, और मेरे दो बच्चे स्कूल में पढ़ते हैं।"
- **Voice input**: Speak instead of typing using Web Speech API
- **Deterministic rules engine**: Evaluates 11+ central schemes (PM-KISAN, PM-JAY, PMAY-G, MGNREGA, Ujjwala, NFSA, NSAP pensions, PMMVY, scholarships, disability pensions)
- **Instant results**: Shows exactly which schemes you're likely eligible for and why

<br />

### 🛡️ **Rejection-Proofing Audit**

<br />
ClaimKaro runs a **pre-submission audit** that catches the silent killers:
- **Name mismatch detection** across Aadhaar, bank, and certificates
- **DBT seeding verification** — checks if your bank account is actually seeded for direct transfers
- **Dormant account alert** — flags accounts with no transactions in 12+ months
- **IFSC validation** — validates bank codes before you submit
- **Document recency checks** — warns if your income cert is older than the scheme's time limit

Each issue comes with a **specific fix** (not vague advice).

<br />

### 🗂️ **Document Vault with AI Scanning**

<br />
- Upload or snap a photo of your **ration card** or **caste certificate**
- **Gemini Vision** reads the document and auto-fills your vault
- **Confetti + TTS celebration**: "बधाई हो! आपका राशन कार्ड जाँच लिया गया है। अब आप ₹12,000 सालाना दावा करने के लिए तैयार हैं।"
- Tracks exactly which documents you have and **calculates the unlock path** — "Get your caste certificate first and it unlocks 4 schemes worth ₹18,000/year"

<br />

### 📍 **Application Tracker**

<br />
- Track each scheme from **To start → Applied → Under verification → Approved → Money received**
- Status-specific next steps: "Wait for verification; follow up at the office if it's been over 2 weeks."
- Notes field for important dates and reference numbers

<br />

### 🤖 **AI Assistant (ClaimKaro Sahayak)**

<br />
- **Floating chatbot** powered by **Gemini 2.5 Flash**
- Bilingual (EN/HI) with instant language toggle
- **Voice support**: Click the mic, speak your question, get answers
- **Text-to-speech**: Every bot reply is read aloud (mute toggle available)
- Context-aware: Knows your profile and gives personalized guidance
- Smart suggestions: "What to write in the Situation Box?", "How to check documents?"

<br />

### 🌐 **Bilingual & Accessible**

<br />
- **Full EN/HI support** — every string, every button, every explanation
- **Voice input/output** for low-literacy users
- **Offline-first**: Rules engine runs on-device; nothing uploaded
- **Privacy-first**: All data lives in browser localStorage (scoped per user UID)

<br />

### 🔐 **Lazy Authentication**

<br />
- Pages are public by default — no login required to explore
- **Firebase phone OTP** for accounts (with SMS)
- **Demo account**: Phone `8888777700` / OTP `112233` works without SMS billing (perfect for hackathons!)
- **Local mock fallback**: OTP `123456` if Firebase isn't configured
- **Guest-to-account merge**: Everything you entered while logged out moves to your account on sign-in

---

## � Innovation That Sets Us Apart

### 1. **Deterministic Engine First, AI Second**
Most "AI welfare apps" are just a chatbot wrapper. ClaimKaro's core is a **deterministic rules engine** (1800+ lines) that:
- Evaluates eligibility with traceable logic
- Computes the exact "unlock path" through the documentation maze
- Runs a pre-submission audit with actionable fixes
- Works 100% offline

**AI enhances but never decides**:
- **Gemini** parses free text into structured data (with keyword fallback)
- **Gemini** restates the engine's result in friendly language (the engine authored every verdict)
- **Gemini Vision** reads document photos
- **Gemini Chat** answers questions using the deterministic assessment as context

This is the opposite of "prompt the LLM and hope for the best."

### 2. **Voice-First for Low-Literacy Users**
- **Web Speech API** for voice input (works in Hindi: "मैं एक किसान हूं")
- **Text-to-speech** for every bot reply and scan result
- **Bilingual throughout** — not just translated UI, but culturally adapted copy
- **Example**: The Hindi string for "widow" uses culturally appropriate phrasing, not literal translation

### 3. **Rejection-Proofing as a Feature**
Nobody else does this. We treat documentation hygiene as a **first-class feature**:
- Name mismatch detection with exact instructions ("Ask the bank to update using Aadhaar copy")
- DBT seeding check (most people think "Aadhaar linked to bank" is enough — it's not)
- Severity scoring: **blocker** (will definitely fail) vs **warning** (might fail) vs **info** (heads-up)

### 4. **Document Scanning with Gemini Vision**
- Snap a ration card → Gemini Vision extracts the name and card type
- **Confetti + voice celebration** when successful
- Multimodal prompt engineering to handle low-quality photos

### 5. **Lazy Auth Pattern**
- Explore the app, fill in your profile, see results — all without signing in
- Only when you try to **track** a scheme does the auth modal appear
- Everything you entered pre-login **merges into your account** on sign-in
- Demo account bypasses SMS billing for judges/testing

### 6. **Graph-Based Unlock Path**
The app computes the **dependency graph** of documents and schemes:
- "You need Aadhaar + bank to claim anything"
- "Your caste certificate unlocks 4 schemes; your income cert unlocks 2 more"
- Sorted by **impact** (which doc unlocks the most value)

---

## 🛠️ Technology Stack

**Powered by cutting-edge tech, built for real-world impact**

### **Frontend**
- **Next.js 16.2.9** (App Router, React Server Components)
- **React 19.2.4**
- **TypeScript 5**
- **Tailwind CSS v4** (with CSS custom properties for design tokens)

### **AI/ML**
- **Google Gemini 2.5 Flash** (via `@google/generative-ai` SDK)
  - NLP parsing (free text → structured profile)
  - Vision API (document photo → extracted data)
  - Chat assistance (context-aware Q&A)
- **Web Speech API** (browser-native)
  - Speech recognition (voice input)
  - Speech synthesis (text-to-speech)

### **Authentication**
- **Firebase 12.15.0** (phone OTP with reCAPTCHA)
- Local mock fallback for development
- Demo account for testing

### **State Management**
- **Custom localStorage hooks** (no Redux/Zustand)
- UID-scoped storage (multi-account support)
- Cross-tab sync via `storage` event

### **Deployment**
- **Vercel** (serverless functions for API routes)

### **Developer Experience**
- **Turbopack** (Next.js 16 dev server)
- **ESLint** + **Prettier**
- **TypeScript strict mode**

---

## 📁 Folder Structure

```
ClaimKaro/
├── app/                          # Next.js App Router
│   ├── api/                      # Server API routes
│   │   ├── chat/route.ts         # AI chat endpoint
│   │   ├── explain/route.ts      # AI explanation endpoint
│   │   ├── parse/route.ts        # NLP parsing endpoint
│   │   └── scan/route.ts         # Document Vision endpoint
│   ├── dashboard/page.tsx
│   ├── documents/page.tsx        # Document vault + audit
│   ├── profile/page.tsx
│   ├── schemes/page.tsx          # Main intake + results page
│   ├── tracker/page.tsx          # Application tracker
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   ├── globals.css               # Global styles + design tokens
│   └── favicon.ico
│
├── components/
│   ├── AuthGate.tsx              # Auth modal + lazy auth logic
│   ├── HelpBot.tsx               # AI chatbot widget
│   └── shared.tsx                # Shared UI components
│
├── lib/
│   ├── rules/                    # Deterministic rules engine
│   │   ├── types.ts              # Domain types (Profile, Assessment, etc.)
│   │   ├── schemes.ts            # 11 scheme definitions + evaluate()
│   │   ├── engine.ts             # Main orchestration (runAssessment)
│   │   ├── graph.ts              # Dependency graph + unlock path
│   │   ├── validation.ts         # Rejection-proofing audit
│   │   ├── documents.ts          # Document definitions
│   │   ├── citations.ts          # Government source citations
│   │   └── inquiry.ts            # Guided AI intake
│   ├── firebase.ts               # Firebase config
│   ├── gemini.ts                 # Gemini SDK wrapper + fallbacks
│   ├── i18n.ts                   # Bilingual string table (1000+ strings)
│   ├── personas.ts               # Demo personas for testing
│   ├── profile.ts                # Profile utilities
│   ├── speech.ts                 # Web Speech API wrapper
│   └── store.ts                  # localStorage state hooks
│
├── public/                       # Static assets
│   └── logo.png                  # ClaimKaro icon
│
├── scripts/
│   └── test-engine.ts            # Smoke test for rules engine
│
├── .gitignore
├── next.config.ts                # Next.js config
├── package.json
├── postcss.config.mjs            # Tailwind v4 PostCSS
├── tsconfig.json
├── vercel.json                   # Vercel deployment
└── README.md
```

---

## 🚀 Get Started in 2 Minutes

### Option 1: Try the Live Demo
**Visit:** [claim-karo.vercel.app](https://claim-karo.vercel.app/)

**Demo login:**
- Phone: `8888777700`
- OTP: `112233`

No installation needed — fully functional online!

---

### Option 2: Run Locally

### Prerequisites
- **Node.js 20+** (we use React 19)
- **npm** or **yarn** or **pnpm**

### 1. Clone the Repository
```bash
git clone https://github.com/animatrix01/ClaimKaro.git
cd ClaimKaro
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Configure API Keys (Optional)

The app works out of the box with demo mode! For full AI features:

- **Gemini API**: Get a free key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Firebase**: Optional for phone OTP. Use demo account instead: phone `8888777700` / OTP `112233`

Create a `.env.local` file with your keys. The app degrades gracefully without them — AI features fall back to keyword parsing, and auth uses demo/mock mode.

### 4. Run the Development Server
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Test with Demo Personas
Click the "👤" icon in the top-right to load pre-built personas:
- **Radha (Widow)**: SC widow, BPL, no LPG
- **Ramesh (Elderly Labourer)**: 68-year-old landless worker
- **Priya (Pregnant)**: Pregnant woman, small farmer
- **Suresh (Student)**: OBC student for scholarship
- **Lakshmi (Disabled)**: Severe disability, rural

### 6. Try Voice Input
1. Navigate to `/schemes`
2. Click the microphone icon in the situation box
3. Allow microphone access
4. Speak in Hindi or English
5. Watch it transcribe and parse your input

---

## 🎨 Key Pages

### **`/schemes`** — Benefits Discovery
The main page. Enter your situation (text or voice), see instant results:
- **Intake form**: Free-text box + quick-tap situation buttons
- **Results panel**: Scheme cards with verdicts, benefit values, and missing docs
- **Unlock path visualization**: Graph showing which document to get first
- **AI explanation**: Optional plain-language summary

### **`/documents`** — Document Vault
Upload or scan your documents:
- **Camera scan**: Take a photo of your ration card or caste certificate
- **Gemini Vision** extracts the data
- **Rejection audit**: Pre-submission checks with severity scores
- **Vault summary**: Shows which docs you have and what they unlock

### **`/tracker`** — Application Tracker
Track each scheme's status:
- 6 statuses: To start → Applied → Under verification → Approved → Received → Rejected
- Status-specific next steps
- Notes field for important info
- Progress bar

### **`/profile`** — Your Profile
View and edit your profile:
- Name, age, phone, state
- Language preference (EN/HI)
- Photo upload
- Sign out / clear data

---

## 🧪 Testing the AI Features

### Test NLP Parsing
1. Go to `/schemes`
2. Type: "मैं एक विधवा हूं, BPL कार्ड है, दो बच्चे स्कूल में पढ़ते हैं, और मेरे पास कोई गैस कनेक्शन नहीं है।"
3. Click "Find my benefits"
4. Watch the parser extract: category, household (widow, hasSchoolGoingChild), documents (ration_bpl), lacksLpg

### Test Document Scanning
1. Go to `/documents`
2. Click "Snap & Listen"
3. Upload a photo of a ration card (or use a sample image)
4. Gemini Vision extracts the name and card type
5. Confetti + voice celebration plays

### Test AI Chat
1. Click the floating 🤖 button (bottom-right)
2. Ask: "How do I check if my documents are ready?"
3. Get a context-aware response with your profile summary
4. Toggle language (EN/HI) and ask again

---

## 🌍 Deployment

**Live at:** [claim-karo.vercel.app](https://claim-karo.vercel.app/)

### Deploy Your Own Copy

```bash
vercel
```

Or click:
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/animatrix01/ClaimKaro)

---

## 🏆 Why This Project Matters

ClaimKaro isn't just a hackathon demo — it's a real solution to a real problem that affects **millions of families**.

**The numbers:**
- **₹4+ lakh crore** spent annually on welfare
- **~20% exclusion rate** purely due to documentation/awareness gaps
- **8–12% of approved scholarships** never paid due to silent errors

**What makes ClaimKaro different:**
1. **Deterministic engine** — not a chatbot wrapper
2. **Rejection-proofing** — catches the errors that silently kill applications
3. **Voice-first + bilingual** — designed for low-literacy users
4. **Privacy-first** — everything runs on-device
5. **Lazy auth** — explore without signing in
6. **Graph-based unlock path** — shows the exact document to get first

---

## 🙏 Built with Gratitude

**Huge thanks to the Hack Devengers 2.0 community** for organizing this incredible hackathon! 🎉🚀

This was an intense build — from ideation to a fully-functional bilingual web app with AI, voice support, and a production-ready rules engine. The mentorship, the energy, and the collaborative spirit of Hack Devengers made it possible.

Special shoutout to:
- The organizers for creating a space for builders to ship real solutions
- Fellow hackers for the feedback and camaraderie
- The judges for taking the time to review this project

**Hack Devengers 2.0** reminded us why we build — not just to win, but to create tools that genuinely help people. 🚀

---

## 📜 License

This project is built for **Hack Devengers 2.0**. All code is open-source and available for learning, modification, and deployment.

---

## 📞 Contact

Built by **[animatrix01](https://github.com/animatrix01)**

Have questions or feedback? Open an issue or reach out!

---

**ClaimKaro** — Claim everything the government owes you. 🌾
