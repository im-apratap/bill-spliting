const FALLBACK_USD_TO_INR = 83;
const CACHE_TTL_MS = 60 * 60 * 1000;

let cachedRates = { usdToInr: FALLBACK_USD_TO_INR, updatedAt: 0 };

export const getExchangeRates = async () => {
  const now = Date.now();
  if (now - cachedRates.updatedAt < CACHE_TTL_MS) {
    return cachedRates;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    const usdToInr = Number(data?.rates?.INR);
    if (!Number.isFinite(usdToInr) || usdToInr <= 0) {
      throw new Error("Invalid INR exchange rate");
    }

    cachedRates = { usdToInr, updatedAt: now };
  } catch (error) {
    console.error("Error fetching currency rates:", error);
    cachedRates = { usdToInr: FALLBACK_USD_TO_INR, updatedAt: now };
  }

  return cachedRates;
};

export const convertToUSD = async (amount, currency = "USD") => {
  if (currency.toUpperCase() !== "INR") {
    return amount;
  }

  const { usdToInr } = await getExchangeRates();
  return amount / usdToInr;
};
