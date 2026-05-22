import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView
} from "react-native";
import { Container } from "../../src/components/Container";
import { Card } from "../../src/components/Card";
import { Button } from "../../src/components/Button";
import { Input } from "../../src/components/Input";
import { colors } from "../../src/theme/colors";
import { apiClient, clearTokens } from "../../src/api/client";
import { FontAwesome5 } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCurrencyPreference } from "../../src/hooks/useCurrencyPreference";
export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upiIdInput, setUpiIdInput] = useState("");
  const [updatingUpi, setUpdatingUpi] = useState(false);
  const { preferredCurrency, toggleCurrency } = useCurrencyPreference();
  useEffect(() => {
    fetchProfile();
  }, []);
  const fetchProfile = async () => {
    try {
      const res = await apiClient.get("/users/me");
      setUser(res.data.data);
      if (res.data.data.upiId) {
        setUpiIdInput(res.data.data.upiId);
      }
    } catch (err: any) {
      console.error("Failed to fetch profile", err);
    } finally {
      setLoading(false);
    }
  };
  const handleUpdateUpi = async () => {
    if (!upiIdInput.trim()) {
      Alert.alert("Error", "Please enter a valid UPI ID");
      return;
    }
    try {
      setUpdatingUpi(true);
      await apiClient.put("/users/upi", { upiId: upiIdInput.trim() });
      setUser({ ...user, upiId: upiIdInput.trim() });
      Alert.alert("Success", "UPI ID updated successfully!");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to update UPI ID");
    } finally {
      setUpdatingUpi(false);
    }
  };
  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        onPress: async () => {
          try {
            await apiClient.post("/users/logout");
          } catch {}
          await clearTokens();
          router.replace("/(auth)/login");
        },
        style: "destructive",
      },
    ]);
  };
  if (loading) {
    return (
      <Container style={styles.centerElement}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Container>
    );
  }
  return (
    <Container>
      <ScrollView>
        <View style={styles.content}>
          <Card style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <FontAwesome5 name="user-alt" size={40} color={colors.primary} />
            </View>
            <Text style={styles.name}>{user?.name || "User"}</Text>
            <Text style={styles.username}>@{user?.username || "unknown"}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </Card>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <Card style={styles.walletCard}>
            <FontAwesome5
              name="rupee-sign"
              size={24}
              color={colors.secondary}
              style={styles.walletIcon}
            />
            <View style={styles.walletInfo}>
              <Text style={styles.walletLabel}>
                UPI ID (GPay / PhonePe / Paytm)
              </Text>
              <Input
                value={upiIdInput}
                onChangeText={setUpiIdInput}
                placeholder="e.g. user@okhdfcbank"
                autoCapitalize="none"
              />
              <Button
                title={user?.upiId ? "Update UPI ID" : "Save UPI ID"}
                onPress={handleUpdateUpi}
                loading={updatingUpi}
                style={{ marginTop: 8 }}
              />
            </View>
          </Card>

          <Text style={styles.sectionTitle}>App Preferences</Text>
          <Card style={styles.prefCard}>
            <FontAwesome5
              name="globe"
              size={24}
              color={colors.secondary}
              style={styles.walletIcon}
            />
            <View style={styles.prefInfo}>
              <Text style={styles.walletLabel}>Display Currency</Text>
              <View style={styles.currencyToggleGroup}>
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    preferredCurrency === "USD" && styles.segmentBtnActive,
                  ]}
                  onPress={() => toggleCurrency("USD")}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      preferredCurrency === "USD" && styles.segmentTextActive,
                    ]}
                  >
                    USD ($)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    preferredCurrency === "INR" && styles.segmentBtnActive,
                  ]}
                  onPress={() => toggleCurrency("INR")}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      preferredCurrency === "INR" && styles.segmentTextActive,
                    ]}
                  >
                    INR (₹)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
          <View style={{ flex: 1 }} />
          <Button
            title="Sign Out"
            onPress={handleLogout}
            style={styles.logoutBtn}
            textStyle={{ fontWeight: "700" }}
          />
        </View>
      </ScrollView>
    </Container>
  );
}
const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
  },
  centerElement: {
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    alignItems: "center",
    paddingVertical: 32,
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.primary,
  },
  username: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: "600",
    marginTop: 4,
  },
  email: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 12,
  },
  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  walletIcon: {
    marginRight: 16,
  },
  walletInfo: {
    flex: 1,
  },
  walletLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  logoutBtn: {
    marginBottom: 16,
  },
  prefCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 24,
  },
  prefInfo: {
    flex: 1,
  },
  currencyToggleGroup: {
    flexDirection: "row",
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: 2,
    marginTop: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 6,
  },
  segmentBtnActive: {
    backgroundColor: colors.background,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: "800",
  },
});
