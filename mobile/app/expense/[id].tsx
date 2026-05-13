import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { Container } from "../../src/components/Container";
import { Card } from "../../src/components/Card";
import { Button } from "../../src/components/Button";
import { colors } from "../../src/theme/colors";
import { apiClient } from "../../src/api/client";
import { FontAwesome5 } from "@expo/vector-icons";
import { format } from "date-fns";
export default function ExpenseDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [expense, setExpense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const fetchExpenseData = useCallback(async () => {
    try {
      setLoading(true);
      const [expenseRes, userRes] = await Promise.all([
        apiClient.get(`/expenses/${id}`),
        apiClient.get("/users/me"),
      ]);
      setExpense(expenseRes.data.data);
      setCurrentUserId(userRes.data.data._id);
    } catch (err: any) {
      console.error("Failed to fetch expense details", err);
      Alert.alert("Error", err.response?.data?.message || "Expense not found");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      fetchExpenseData();
    }, [fetchExpenseData]),
  );
  const handleDelete = () => {
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense permanently?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiClient.delete(`/expenses/${id}`);
              Alert.alert("Success", "Expense deleted");
              router.back();
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || "Failed to delete expense",
              );
            }
          },
        },
      ],
    );
  };
  if (loading) {
    return (
      <Container style={styles.centerElement}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Container>
    );
  }
  if (!expense) return null;
  const renderSplitDetails = () => {
    return (
      <View style={styles.splitSection}>
        <Text style={styles.sectionTitle}>Split Details</Text>
        <Text style={styles.splitTypeBadge}>
          {expense.splitType.toUpperCase()}
        </Text>
        {expense.splitType === "equal" ? (
          <View style={styles.sharesList}>
            {expense.splitAmong.map((user: any) => (
              <View key={user._id} style={styles.shareRow}>
                <View style={styles.shareUser}>
                  <View style={styles.avatarMini}>
                    <Text style={styles.avatarMiniText}>
                      {user.name?.charAt(0) || user.username?.charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.shareName}>
                    {user.name || user.username}
                  </Text>
                </View>
                <Text style={styles.shareAmount}>
                  ${(expense.amount / expense.splitAmong.length).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.sharesList}>
            {expense.shares.map((share: any) => (
              <View key={share._id} style={styles.shareRow}>
                <View style={styles.shareUser}>
                  <View style={styles.avatarMini}>
                    <Text style={styles.avatarMiniText}>
                      {share.user?.name?.charAt(0) ||
                        share.user?.username?.charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.shareName}>
                    {share.user?.name || share.user?.username}
                  </Text>
                </View>
                <Text style={styles.shareAmount}>
                  {expense.splitType === "percentage"
                    ? `${share.amount}% ($${((share.amount / 100) * expense.amount).toFixed(2)})`
                    : `$${share.amount.toFixed(2)}`}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };
  const isPayer =
    expense.paidBy?._id === currentUserId || expense.paidBy === currentUserId;
  return (
    <Container>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <FontAwesome5 name="chevron-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Expense Details</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.summaryCard}>
          <View style={styles.iconCircle}>
            <FontAwesome5 name="receipt" size={32} color={colors.primary} />
          </View>
          <Text style={styles.expenseDesc}>{expense.description}</Text>
          <Text style={styles.expenseAmount}>${expense.amount.toFixed(2)}</Text>
          <Text style={styles.expenseDate}>
            {format(new Date(expense.createdAt), "MMM do, yyyy • h:mm a")}
          </Text>
          <View style={styles.paidByContainer}>
            <Text style={styles.paidByText}>Paid by </Text>
            <Text style={styles.paidByName}>
              {expense.paidBy?.name || "Someone"}
            </Text>
          </View>
        </Card>
        {renderSplitDetails()}
      </ScrollView>
      <View style={styles.footer}>
        <Button
          title="Edit Expense"
          onPress={() => router.push(`/expense/edit/${expense._id}` as any)}
          style={styles.actionBtn}
          variant="secondary"
        />
        {isPayer && (
          <Button
            title="Delete"
            onPress={handleDelete}
            style={[styles.actionBtn, { backgroundColor: colors.error }] as any}
          />
        )}
      </View>
    </Container>
  );
}
const styles = StyleSheet.create({
  centerElement: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
  },
  backBtn: {
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primary,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    alignItems: "center",
    padding: 32,
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  expenseDesc: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.primary,
    textAlign: "center",
    marginBottom: 8,
  },
  expenseAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.error,
    marginBottom: 8,
  },
  expenseDate: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 24,
  },
  paidByContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.primary}10`,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  paidByText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  paidByName: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  splitSection: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: 12,
  },
  splitTypeBadge: {
    alignSelf: "flex-start",
    backgroundColor: `${colors.secondary}20`,
    color: colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 16,
  },
  sharesList: {
    marginTop: 8,
  },
  shareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  shareUser: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarMiniText: {
    fontWeight: "800",
    color: colors.primary,
    fontSize: 12,
  },
  shareName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  shareAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 32,
    backgroundColor: colors.background,
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: 8,
  },
});
