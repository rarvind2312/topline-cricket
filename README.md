# Topline Cricket (Expo)

This project is an Expo (React Native) app with Firebase backend + Cloud Functions.

---

## Prerequisites

Install these on your machine first:

- **Git**
- **Node.js 20** (required by Firebase Functions)
- **npm** (comes with Node)
- **Expo CLI** (`npx expo` is enough; global install optional)

Optional but recommended:
- **Watchman** (macOS)
- **Android Studio** (for Android emulator)
- **Xcode** (for iOS simulator, macOS only)

---

## Clone the repo

```bash
git clone <YOUR_GITHUB_REPO_URL>
cd topline-cricket
```

---

## Install dependencies

### Root app (Expo)
```bash
npm install
```

### Firebase Functions (server)
```bash
cd functions
npm install
cd ..
```

---

## Environment setup (Firebase)

This app expects Firebase config in `src/firebase.ts` and uses the Firebase project in `.firebaserc`.
If you are using your own Firebase project:

1. Update `.firebaserc` with your project id.
2. Update Firebase config in `src/firebase.ts`.

Cloud Functions require Node 20 (see `functions/package.json`).

---

## Run the app with Expo

### Start Metro bundler
```bash
npm run start
```

### iOS (macOS only)
```bash
npm run ios
```

### Android (macOS / Windows)
```bash
npm run android
```

### Physical device (iOS/Android)
- Install **Expo Go** from the App Store / Play Store
- Scan the QR code from the Expo terminal

---

## Platform notes

### macOS
- For iOS simulator, you need **Xcode** installed.
- For Android emulator, you need **Android Studio**.
- Watchman is recommended for file watching:
  ```bash
  brew install watchman
  ```

### Windows
- iOS simulator is **not supported** on Windows.
- For Android, install **Android Studio** and create an emulator.

---

## Firebase Functions (optional, local)

From the `functions` folder:

```bash
npm run build
npm run serve
```

Deploy functions:
```bash
npm run deploy
```

---

## Quick troubleshooting

- **Expo fails to start**: try `npx expo start -c` to clear cache.
- **Android emulator not detected**: open Android Studio and start an emulator first.
- **iOS build fails**: ensure Xcode is installed and opened at least once.

---

## Scripts

From project root:

- `npm run start` → Expo dev server
- `npm run ios` → iOS simulator
- `npm run android` → Android emulator
- `npm run web` → Web

From `functions/`:

- `npm run build` → Build Cloud Functions
- `npm run serve` → Run emulator
- `npm run deploy` → Deploy functions

