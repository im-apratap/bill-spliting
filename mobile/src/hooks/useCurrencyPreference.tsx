import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function useCurrencyPreference() {
  const [preferredCurrency, setPreferredCurrency] = useState<"USD" | "INR">(
    "USD",
  );

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const stored = await AsyncStorage.getItem("preferredCurrency");
        if (stored === "USD" || stored === "INR") {
          setPreferredCurrency(stored);
        }
      } catch (error) {
        console.error("Failed to load preferred currency:", error);
      }
    };
    loadPreference();
  }, []);

  const toggleCurrency = async (currency: "USD" | "INR") => {
    try {
      setPreferredCurrency(currency);
      await AsyncStorage.setItem("preferredCurrency", currency);
    } catch (error) {
      console.error("Failed to save preferred currency:", error);
    }
  };

  const getCurrencySymbol = () => {
    return preferredCurrency === "INR" ? "₹" : "$";
  };

  const USD_TO_INR = 83;

  const formatFiatFromUSD = (usdAmount: number, usdToInr = USD_TO_INR) => {
    if (preferredCurrency === "INR") {
      return `₹${(usdAmount * usdToInr).toFixed(2)}`;
    }
    return `$${usdAmount.toFixed(2)}`;
  };

  const amountToUSD = (amount: number, usdToInr = USD_TO_INR) => {
    return preferredCurrency === "INR" ? amount / usdToInr : amount;
  };

  const amountFromUSD = (usdAmount: number, usdToInr = USD_TO_INR) => {
    return preferredCurrency === "INR" ? usdAmount * usdToInr : usdAmount;
  };

  return {
    preferredCurrency,
    toggleCurrency,
    getCurrencySymbol,
    formatFiatFromUSD,
    amountToUSD,
    amountFromUSD,
  };
}
