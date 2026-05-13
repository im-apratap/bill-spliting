import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../src/theme/colors";
import { apiClient } from "../../src/api/client";
import { Container } from "../../src/components/Container";
import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import { openSolscanTx } from "../../src/utils/solana";
type Group = {
  _id: string;
  name: string;
};
type HistoryLog = {
  _id: string;
  actionType: string;
  description: string;
  group?: Group;
  createdAt: string;
  txSignature?: string;
};
export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const fetchHistory = async () => {
    try {
      const response = await apiClient.get("/history");
      setHistory(response.data);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    fetchHistory();
  }, []);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory();
  }, []);
  const getActionDetails = (actionType: string) => {
    switch (actionType) {
      case "EXPENSE_ADDED":
        return {
          icon: "receipt",
          color: colors.primary,
          iconFamily: "MaterialIcons",
        };
      case "EXPENSE_DELETED":
        return {
          icon: "trash",
          color: colors.error,
          iconFamily: "FontAwesome5",
        };
      case "SETTLEMENT_CREATED":
      case "SETTLEMENT_CONFIRMED":
        return {
          icon: "check-circle",
          color: colors.success,
          iconFamily: "FontAwesome5",
        };
      case "MEMBER_ADDED":
      case "FRIEND_ADDED":
        return {
          icon: "user-plus",
          color: "#4ADE80",
          iconFamily: "FontAwesome5",
        };
      case "MEMBER_REMOVED":
        return {
          icon: "user-minus",
          color: colors.error,
          iconFamily: "FontAwesome5",
        };
      case "GROUP_CREATED":
        return { icon: "users", color: "#60A5FA", iconFamily: "FontAwesome5" };
      default:
        return {
          icon: "info-circle",
          color: colors.textMuted,
          iconFamily: "FontAwesome5",
        };
    }
  };
  const renderIcon = (
    iconFamily: string,
    iconName: string,
    color: string,
    size: number,
  ) => {
    if (iconFamily === "MaterialIcons") {
      return <MaterialIcons name={iconName as any} size={size} color={color} />;
    }
    return <FontAwesome5 name={iconName} size={size} color={color} />;
  };
  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };
  const renderHistoryItem = ({ item }: { item: HistoryLog }) => {
    const { icon, color, iconFamily } = getActionDetails(item.actionType);
    const isSettlement = item.actionType.includes("SETTLEMENT");
    return (
      <View style={styles.card}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
          {renderIcon(iconFamily, icon, color, 20)}
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.description}>{item.description}</Text>
          <View style={styles.metaData}>
            {item.group && (
              <View style={styles.groupBadge}>
                <Text style={styles.groupText}>{item.group.name}</Text>
              </View>
            )}
            <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
          </View>
          {isSettlement && item.txSignature && (
            <TouchableOpacity
              style={styles.solscanLink}
              onPress={() => openSolscanTx(item.txSignature!)}
            >
              <FontAwesome5 name="external-link-alt" size={12} color={colors.secondary} />
              <Text style={styles.solscanLinkText}>View on Solscan</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };
  const filters = ["ALL", "EXPENSES", "SETTLEMENTS", "GROUPS", "FRIENDS"];
  const filteredHistory = history.filter((item) => {
    if (filter === "ALL") return true;
    if (filter === "EXPENSES") return item.actionType.includes("EXPENSE");
    if (filter === "SETTLEMENTS") return item.actionType.includes("SETTLEMENT");
    if (filter === "GROUPS") return item.actionType.includes("GROUP");
    if (filter === "FRIENDS")
      return (
        item.actionType.includes("FRIEND") || item.actionType.includes("MEMBER")
      );
    return true;
  });
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Container>
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
        </View>
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            {filters.map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterChip,
                  filter === f && styles.filterChipActive,
                ]}
                onPress={() => setFilter(f)}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === f && styles.filterTextActive,
                  ]}
                >
                  {f === "ALL"
                    ? "All Activity"
                    : f.charAt(0) + f.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => item._id}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="history" size={48} color={colors.border} />
              <Text style={styles.emptyText}>No activity history yet.</Text>
            </View>
          }
        />
      </Container>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.text,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  filterTextActive: {
    color: "#FFF",
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  description: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 6,
  },
  metaData: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupBadge: {
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  groupText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  time: {
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 80,
  },
  emptyText: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: 16,
    fontSize: 16,
  },
  solscanLink: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  solscanLinkText: {
    color: colors.secondary,
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },
});
