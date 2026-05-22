import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { Container } from "../../src/components/Container";
import { Card } from "../../src/components/Card";
import { Button } from "../../src/components/Button";
import { colors } from "../../src/theme/colors";
import { apiClient } from "../../src/api/client";
import { router, useFocusEffect } from "expo-router";
export default function HomeScreen() {
  const [groups, setGroups] = useState([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const fetchData = async () => {
    try {
      setError("");
      const [groupsRes, userRes] = await Promise.all([
        apiClient.get("/groups"),
        apiClient.get("/users/me"),
      ]);
      setGroups(groupsRes.data.data || []);
      setUser(userRes.data.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Failed to load data",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, []),
  );
  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };
  const renderGroupItem = ({ item }: { item: any }) => (
    <Card style={styles.groupCard}>
      <View style={styles.groupCardImagePlaceholder}>
        <FontAwesome5 name="layer-group" size={32} color={colors.primary} />
      </View>
      <View style={styles.groupInfoRow}>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{item.name}</Text>
          <Text style={styles.memberCount}>
            {item.members?.length || 0} members
          </Text>
        </View>
        <Button
          title=""
          variant="primary"
          style={styles.floatingArrowBtn}
          onPress={() => router.push(`/group/${item._id}` as any)}
        />
        <View pointerEvents="none" style={styles.iconOverlay}>
          <FontAwesome5 name="chevron-right" size={16} color="#FFFFFF" />
        </View>
      </View>
    </Card>
  );
  if (loading && !refreshing) {
    return (
      <Container style={styles.centerElement}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Container>
    );
  }
  return (
    <Container>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greetingTitle}>
            Hello, {user?.name?.split(" ")[0] || "User"}
          </Text>
          <Text style={styles.greetingSubtitle}>Split expenses and settle up</Text>
        </View>
        {}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Retry" onPress={fetchData} variant="secondary" />
          </View>
        ) : null}
        <FlatList
          data={groups}
          keyExtractor={(item: any) => item._id}
          renderItem={renderGroupItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome5
                name="folder-open"
                size={48}
                color={colors.border}
              />
              <Text style={styles.emptyText}>
                You don&apos;t have any groups yet
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
        {}
        <View style={styles.floatingActionWrapper}>
          <Button
            title="+ Create Group"
            onPress={() => router.push("/group/create" as any)}
            style={styles.floatingAddBtn}
          />
        </View>
      </View>
    </Container>
  );
}
const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  centerElement: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    marginTop: 24,
    marginBottom: 24,
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 6,
  },
  listContent: {
    paddingBottom: 40,
  },
  groupCard: {
    padding: 16,
  },
  groupCardImagePlaceholder: {
    backgroundColor: colors.surfaceLight,
    height: 140,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  groupInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: "700",
  },
  memberCount: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 6,
  },
  floatingArrowBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginVertical: 0,
    minHeight: 0,
  },
  iconOverlay: {
    position: "absolute",
    right: 16,
  },
  floatingActionWrapper: {
    paddingVertical: 16,
    paddingTop: 8,
  },
  floatingAddBtn: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    color: colors.textMuted,
    marginTop: 20,
    fontSize: 16,
    fontWeight: "500",
  },
  errorContainer: {
    padding: 16,
    backgroundColor: "rgba(255, 77, 77, 0.1)",
    borderRadius: 16,
    marginBottom: 24,
    alignItems: "center",
  },
  errorText: {
    color: colors.error,
    marginBottom: 12,
    textAlign: "center",
  },
});
