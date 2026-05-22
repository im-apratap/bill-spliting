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
import Svg, { G, Circle } from "react-native-svg";

const sliceColors = [
  "#EF4444", // Red
  "#EAB308", // Yellow
  "#8B5CF6", // Purple
  "#22C55E", // Green
  "#EC4899", // Pink
  "#0EA5E9", // Blue
  "#F97316", // Orange
  "#14B8A6", // Teal
];

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

  const isPayer =
    expense.paidBy?._id === currentUserId || expense.paidBy === currentUserId;

  const totalAmount = expense.amount;
  
  // Normalize shares data for the chart and list
  let sharesData: any[] = [];
  if (expense.splitType === "equal") {
    const equalAmount = totalAmount / expense.splitAmong.length;
    sharesData = expense.splitAmong.map((user: any, index: number) => ({
      _id: user._id,
      name: user.name || user.username,
      amount: equalAmount,
      percentage: (1 / expense.splitAmong.length) * 100,
      color: sliceColors[index % sliceColors.length],
    }));
  } else {
    sharesData = expense.shares.map((share: any, index: number) => {
      const amt = expense.splitType === "percentage" 
        ? (share.amount / 100) * totalAmount 
        : share.amount;
      const pct = expense.splitType === "percentage"
        ? share.amount
        : (share.amount / totalAmount) * 100;
        
      return {
        _id: share.user?._id || index.toString(),
        name: share.user?.name || share.user?.username || "Unknown",
        amount: amt,
        percentage: pct,
        color: sliceColors[index % sliceColors.length],
      };
    });
  }

  const renderExpenseOverview = () => {
    const radius = 60;
    const strokeWidth = 24;
    const circumference = 2 * Math.PI * radius;
    const halfCircle = radius + strokeWidth;
    let accumulatedPercentage = 0;

    return (
      <Card style={styles.overviewCard}>
        <View style={styles.dropdownHeader}>
          <Text style={styles.overviewTitle}>EXPENSE OVERVIEW</Text>
        </View>

        <View style={styles.chartContainer}>
          <View style={styles.donutWrapper}>
            <Svg width={halfCircle * 2} height={halfCircle * 2} viewBox={`0 0 ${halfCircle * 2} ${halfCircle * 2}`}>
              <G origin={`${halfCircle}, ${halfCircle}`}>
                {sharesData.map((item, index) => {
                  const pct = item.percentage / 100;
                  const rotation = (accumulatedPercentage * 360) - 90;
                  accumulatedPercentage += pct;
                  return (
                    <Circle
                      key={index}
                      cx="50%"
                      cy="50%"
                      r={radius}
                      fill="transparent"
                      stroke={item.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${pct * circumference} ${circumference}`}
                      rotation={rotation}
                      origin={`${halfCircle}, ${halfCircle}`}
                      strokeLinecap="butt"
                    />
                  );
                })}
              </G>
            </Svg>
            <View style={styles.donutCenter}>
              <Text style={styles.donutCenterText}>Expenses</Text>
            </View>
          </View>
          
          <View style={styles.legendContainer}>
            {sharesData.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                <Text style={styles.legendText} numberOfLines={1}>{item.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sharesList}>
          {sharesData.map((item) => (
            <View key={item._id} style={styles.shareRow}>
              <View style={[styles.shareIcon, { backgroundColor: item.color }]}>
                <FontAwesome5 name="user" size={16} color="#FFF" />
              </View>
              <View style={styles.shareDetails}>
                <View style={styles.shareRowTop}>
                  <Text style={styles.shareName}>{item.name}</Text>
                  <Text style={[styles.shareAmount, { color: item.color }]}>
                    -${item.amount.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.shareRowBottom}>
                  <View style={styles.progressBarBg}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { backgroundColor: item.color, width: `${item.percentage}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.sharePercentage}>
                    {item.percentage.toFixed(2)}%
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </Card>
    );
  };

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
        
        <View style={styles.topSummary}>
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
        </View>

        {renderExpenseOverview()}

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
  topSummary: {
    alignItems: "center",
    marginBottom: 24,
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
    marginBottom: 16,
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
  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  dropdownHeader: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 24,
  },
  overviewTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 1,
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  donutWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 24,
  },
  donutCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  donutCenterText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  legendContainer: {
    flex: 1,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    marginRight: 8,
  },
  legendText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "500",
  },
  sharesList: {
    marginTop: 8,
  },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  shareIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  shareDetails: {
    flex: 1,
  },
  shareRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  shareName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  shareAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  shareRowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    marginRight: 12,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  sharePercentage: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    width: 60,
    textAlign: "right",
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
