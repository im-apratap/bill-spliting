import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router, Link } from "expo-router";
import { Container } from "../../src/components/Container";
import { Input } from "../../src/components/Input";
import { Button } from "../../src/components/Button";
import { colors } from "../../src/theme/colors";
import { apiClient, setTokens } from "../../src/api/client";
import {
  registerForPushNotificationsAsync,
  sendPushTokenToBackend,
} from "../../src/utils/notifications";
export default function LoginScreen() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleLogin = async () => {
    if (!emailOrUsername || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload: any = { password };
      if (emailOrUsername.includes("@")) {
        payload.email = emailOrUsername.toLowerCase().trim();
      } else {
        payload.username = emailOrUsername.toLowerCase().trim();
      }
      const response = await apiClient.post("/users/login", payload);
      const { accessToken, refreshToken } = response.data.data;
      await setTokens(accessToken, refreshToken);
      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) {
        await sendPushTokenToBackend(pushToken);
      }
      router.replace("/(tabs)/home");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Container>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>
              Sol<Text style={styles.highlight}>Share</Text>
            </Text>
            <Text style={styles.subtitle}>Settle up on the Solana network</Text>
          </View>
          <View style={styles.form}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Input
              label="Email or Username"
              placeholder="Enter your email or username"
              value={emailOrUsername}
              onChangeText={setEmailOrUsername}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Don&apos;t have an account?{" "}
              </Text>
              <Link href="/(auth)/register" asChild>
                <Text style={styles.linkText}>Sign Up</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
}
const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: 42,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: -1,
  },
  highlight: {
    color: colors.secondary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 8,
  },
  form: {
    width: "100%",
  },
  loginButton: {
    marginTop: 24,
  },
  errorText: {
    color: colors.error,
    textAlign: "center",
    marginBottom: 16,
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 32,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  linkText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
});
