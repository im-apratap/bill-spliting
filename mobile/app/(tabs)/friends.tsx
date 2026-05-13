import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../src/theme/colors";
import { apiClient } from "../../src/api/client";
import { Container } from "../../src/components/Container";
import { FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
type Friend = {
  _id: string;
  name: string;
  username: string;
  pubKey: string;
};
type FriendRequest = {
  _id: string;
  sender: {
    _id: string;
    name: string;
    username: string;
  };
  createdAt: string;
};
export default function FriendsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"friends" | "requests">("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchData = async () => {
    setLoading(true);
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        apiClient.get("/friends"),
        apiClient.get("/friends/requests"),
      ]);
      setFriends(friendsRes.data);
      setRequests(requestsRes.data);
    } catch (error) {
      console.error("Error fetching friends data:", error);
      Alert.alert("Error", "Failed to load friends.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const handleAccept = async (requestId: string) => {
    try {
      await apiClient.post("/friends/accept-request", { requestId });
      fetchData(); 
      Alert.alert("Success", "Friend request accepted");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Something went wrong.",
      );
    }
  };
  const handleDecline = async (requestId: string) => {
    try {
      await apiClient.post("/friends/decline-request", { requestId });
      fetchData(); 
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Something went wrong.",
      );
    }
  };
  const renderFriend = ({ item }: { item: Friend }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardUsername}>@{item.username}</Text>
      </View>
    </View>
  );
  const renderRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.sender.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.sender.name}</Text>
        <Text style={styles.cardUsername}>@{item.sender.username}</Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.btn, styles.primaryBtn]}
          onPress={() => handleAccept(item._id)}
        >
          <Text style={styles.primaryBtnText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() => handleDecline(item._id)}
        >
          <Text style={styles.secondaryBtnText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
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
          <Text style={styles.title}>Friends</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push("/friends/add-friend" as any)}
          >
            <FontAwesome5 name="user-plus" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        {}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "friends" && styles.activeTab]}
            onPress={() => setActiveTab("friends")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "friends" && styles.activeTabText,
              ]}
            >
              My Friends
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "requests" && styles.activeTab]}
            onPress={() => setActiveTab("requests")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "requests" && styles.activeTabText,
              ]}
            >
              Requests {requests.length > 0 ? `(${requests.length})` : ""}
            </Text>
          </TouchableOpacity>
        </View>
        {activeTab === "friends" ? (
          <FlatList
            data={friends}
            keyExtractor={(item) => item._id}
            renderItem={renderFriend}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                You have not added any friends yet.
              </Text>
            }
          />
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item._id}
            renderItem={renderRequest}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No pending friend requests.</Text>
            }
          />
        )}
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
  addBtn: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textMuted,
  },
  activeTabText: {
    color: "#fff",
  },
  listContainer: {
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}20`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.primary,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 4,
  },
  cardUsername: {
    fontSize: 14,
    color: colors.textMuted,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
  },
  secondaryBtn: {
    backgroundColor: `${colors.error}20`,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
  secondaryBtnText: {
    color: colors.error,
    fontWeight: "bold",
    fontSize: 13,
  },
  emptyText: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: 40,
    fontSize: 16,
  },
});
