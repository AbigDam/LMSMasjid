# Teacher Portal — Frontend (FE‑1)

**Owner / section:** this folder is my part of the LMS — the **Teacher Portal frontend** (maintained by [@alattasmo15](https://github.com/alattasmo15)).
**Scope:** Login, Sign Up, and Teacher Dashboard **only**. Mock data, no backend yet.

This is one slice of the larger Al‑Hidaya LMS. Other pages (class detail, roster, attendance/tracker, reports, etc.) are owned by teammates and are intentionally **not** built here — buttons for them log a `TODO` placeholder instead.

---

## Tech stack

- **Expo** (React Native, managed workflow) — runs on **iOS, Android, and Web** from one codebase
- **React Navigation** (native stack) for screen flow
- **AsyncStorage** for the "Remember me" email
- **expo-linear-gradient**, **@expo/vector-icons** for UI

> Backend will be **Django REST** later. Every place that will call the API is marked with a `// TODO (Django auth)` comment.

---

## Run it locally

```bash
cd frontend/teacher-portal
npm install
npx expo start
```

Then press **`w`** (web), **`a`** (Android emulator), or **`i`** (iOS simulator / Mac only), or scan the QR code with the **Expo Go** app on a phone.

---

## What each page is for

| Page / file | Purpose |
|---|---|
| **`screens/LoginScreen.js`** | Teacher login. Email + password with show/hide toggle, **Remember me** (stores only the email — never the password), forgot‑password placeholder, and full validation (valid email + strong password). On success → Dashboard. |
| **`screens/SignupScreen.js`** | Teacher account creation. Name, email, password, confirm password, with a **live password‑strength meter** and rule checklist. On success → Dashboard. |
| **`screens/DashboardScreen.js`** | The main teacher home. Salaam greeting, quick stats (students / classes / next class), today's Iqama prayer times, **My Courses** cards, community announcements, and contact footer. Fully **responsive**: persistent sidebar on desktop/tablet, slide‑out drawer + hamburger on mobile. |

## Supporting files

| File | Purpose |
|---|---|
| **`App.js`** | Navigation root (Login → Signup → Dashboard). Marks where the future Django auth provider goes. |
| **`components/Sidebar.js`** | Left navigation (logo, the teacher's class list, red **Sign Out**). Persistent on desktop, drawer on mobile. |
| **`components/CourseCard.js`** | A class card: title, program, students, schedule, location, "active" badge, **View Course Details** button. |
| **`components/TextField.js`** | Reusable labelled input with icon, inline error, and password show/hide. |
| **`components/PasswordStrength.js`** | Live strength bar + rule checklist for the Sign Up password. |
| **`components/BrandHeader.js`** / **`AuthScene.js`** | Al‑Hidaya branding + shared layout for the auth screens. |
| **`constants/theme.js`** | Design tokens (Al‑Hidaya bronze/cream palette, spacing, shadows). Change colors here once, everywhere updates. |
| **`constants/brand.js`** | Org details (name, address, contact, social) + logo/photo assets. |
| **`constants/validation.js`** | Email + password rules (8+ chars, upper, lower, number, special character). |
| **`data/mockData.js`** | **Mock only.** Courses, prayer times, announcements. Fields we don't know yet are marked `TBD`. Replace with the Django API later. |

---

## Security notes

- **Passwords are never stored.** Only the email is saved (for "Remember me"). When the real backend lands, the password is sent once over HTTPS and only the returned token should be kept — in **SecureStore**, not AsyncStorage.
- **No secrets in this folder.** No `.env`, API keys, or tokens are committed. `node_modules/` and build output are git‑ignored (see `.gitignore`).
- The Al‑Hidaya logo/photo in `assets/branding/` are the center's assets, included for this internal project — get permission before any public release.

---

## Status

✅ Login, Sign Up, Dashboard built and running on iOS / Android / Web with mock data.
⬜ Django API integration (auth, courses, roster) — future phase.
