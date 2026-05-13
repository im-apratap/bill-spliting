import React, { useState } from "react";
import { View, StyleSheet, Text, ScrollView } from "react-native";
import { router } from "expo-router";
import { Container } from "../../src/components/Container";
import { Input } from "../../src/components/Input";
import { Button } from "../../src/components/Button";
import { colors } from "../../src/theme/colors";
import { apiClient } from "../../src/api/client";
export default function CreateGroupScreen() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleCreateGroup = async () => {
    if (!name.trim()) {
      setError("Group name is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.post("/groups", { name });
      const newGroup = res.data.data;
      router.replace(`/group/${newGroup._id}` as any);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Failed to create group",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <Container>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>New Group</Text>
          <Text style={styles.subtitle}>Create a group to share expenses</Text>
        </View>
        <View style={styles.form}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Input
            label="Group Name"
            placeholder="e.g. Goa Trip, Apartment Rent"
            value={name}
            onChangeText={setName}
            autoFocus
          />
          <Button
            title="Create Group"
            onPress={handleCreateGroup}
            loading={loading}
            style={styles.createButton}
          />
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            disabled={loading}
          />
        </View>
      </ScrollView>
    </Container>
  );
}
const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingTop: 16,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 8,
  },
  form: {
    width: "100%",
  },
  createButton: {
    marginTop: 24,
    marginBottom: 12,
  },
  errorText: {
    color: colors.error,
    textAlign: "center",
    marginBottom: 16,
    fontSize: 14,
  },
});
