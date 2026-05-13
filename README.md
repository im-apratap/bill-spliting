# OmniSplit: Web2 & Web3 Payment Splitter

OmniSplit is a dual-mode mobile application built natively using React Native and Expo. It solves the problem of splitting expenses (like dinners, rent, trips) by allowing users to settle debts seamlessly via **Crypto (Solana)** or **Fiat (UPI / GPay / PhonePe)**.

## Features

- **Dual Mode (Fiat & Crypto)**: A single app to settle your debts on-chain with Solana MWA or off-chain using Indian UPI payment links.
- **Mobile Foundation First**: Built natively using React Native and Expo for a smooth iOS and Android experience.
- **Smart AI Receipt Scanner**: Integration with Gemini AI allows users to instantly take a picture of a bill with their camera and dynamically prefill the expense title, extracted currency, and total split amount.
- **Real-Time Price Context**: Pulls the live price of SOL/USD and SOL/INR concurrently on a scalable backend to give users immediate feedback on crypto equivalents of fiat debts.
- **Robust Backend**: Node.js Express server using PostgreSQL (Prisma ORM) to handle group coordination, user profile matching, historical activity fetching, and push notifications.

## Tech Stack

- **Frontend App**: React Native, Expo, React Navigation
- **Blockchain Interface**: Solana Web3.js, Solana Mobile Wallet Adapter
- **Backend Infrastructure**: Node.js, Express, PostgreSQL, Prisma ORM
- **Artificial Intelligence**: Google Gemini Vision AI

## Setting Up the Project Locally

### 1. Backend Server Setup

Navigate into the server directory and create your `.env` file.

```bash
cd server
cp .env.example .env
bun install
bunx prisma db push
bun run dev
```

_Required Environment Variables (`.env`):_

```
PORT=8000
DB_URI=your_postgresql_connection_uri_here
ACCESS_TOKEN_SECRET=your_secret_phrase
REFRESH_TOKEN_SECRET=your_secret_phrase
GEMINI_API_KEY=your_gemini_api_key
```

### 2. Mobile App Setup

In a new terminal, navigate to the `mobile` app and install its dependencies. Ensure you configure your IP address if running physically.

```bash
cd mobile
cp .env.example .env
bun install
npx expo start -c
```

_Required Environment Variables (`.env`):_

```
EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_NETWORK_IP>:8000/api
EXPO_PUBLIC_SOLANA_NETWORK=devnet
```

### 3. Running on your device

- **Dev mode**: Install the `Expo Go` app on your Android Phone. Scan the QR code given by `npx expo start`.
- **Native APK Build**:
  Since this app uses native modules (Solana MWA, Camera packages), we highly recommend building it into a standalone APK for the best performance and functionality:
  ```bash
  eas build -p android --profile preview
  ```
