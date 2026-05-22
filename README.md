# OmniSplit: Expense Splitter

OmniSplit is a mobile application built with React Native and Expo. It helps groups split expenses like dinners, rent, and trips, then settle debts through real-money UPI payment links.

## Features

- **UPI Settlements**: Settle debts through Indian UPI payment links for GPay, PhonePe, Paytm, and other UPI apps.
- **Mobile Foundation First**: Built natively using React Native and Expo for a smooth iOS and Android experience.
- **Smart AI Receipt Scanner**: Integration with Gemini AI allows users to instantly take a picture of a bill with their camera and dynamically prefill the expense title, extracted currency, and total split amount.
- **Robust Backend**: Node.js Express server using PostgreSQL (Prisma ORM) to handle group coordination, user profile matching, historical activity fetching, and push notifications.

## Tech Stack

- **Frontend App**: React Native, Expo, React Navigation
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
```

### 3. Running on your device

- **Dev mode**: Install the `Expo Go` app on your Android Phone. Scan the QR code given by `npx expo start`.
- **Native APK Build**:
  Since this app uses native modules such as camera packages, use a native build for the best performance and functionality:
  ```bash
  eas build -p android --profile preview
  ```
