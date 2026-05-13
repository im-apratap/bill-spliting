import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors } from "../../src/theme/colors";
import { Container } from "../../src/components/Container";
import { apiClient } from "../../src/api/client";
import { FontAwesome5 } from "@expo/vector-icons";
export default function AddFriendScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSendRequest = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "Please enter a username");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post("/friends/send-request", {
        username: username.trim(),
      });
      Alert.alert("Success", "Friend request sent!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      Alert.alert(
        "Error",
        error?.response?.data?.message ||
          "Failed to send friend request. Please check the username.",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Container>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <FontAwesome5 name="arrow-left" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Add Friend</Text>
            <View style={{ width: 44 }} />
          </View>
          <View style={styles.formContainer}>
            <Text style={styles.label}>Search by Username</Text>
            <TextInput
              style={styles.input}
              placeholder="@username"
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.description}>
              Enter your friend&apos;s exact username to send them a friend request.
              They will need to accept it before they appear in your friends
              list.
            </Text>
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSendRequest}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Send Friend Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </Container>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    marginTop: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: 22,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
  },
  formContainer: {
    flex: 1,
    paddingTop: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: 30,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
