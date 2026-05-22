import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { Container } from "../../src/components/Container";
import { Input } from "../../src/components/Input";
import { Button } from "../../src/components/Button";
import { colors } from "../../src/theme/colors";
import { apiClient } from "../../src/api/client";
import { FontAwesome5 } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useCurrencyPreference } from "../../src/hooks/useCurrencyPreference";

const USD_TO_INR = 83;

export default function CreateSettlementScreen() {
  const { groupId } = useLocalSearchParams();
  const [toUserId, setToUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [settlements, setSettlements] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [successModal, setSuccessModal] = useState(false);
  const [settledAmount, setSettledAmount] = useState<string>("");
  const {
    preferredCurrency,
    getCurrencySymbol,
    formatFiatFromUSD,
    amountToUSD,
    amountFromUSD,
  } = useCurrencyPreference();

  const fetchData = React.useCallback(async () => {
    try {
      const userRes = await apiClient.get("/users/me");
      const loggedInUserId = userRes.data.data._id;
      setCurrentUserId(loggedInUserId);

      const groupRes = await apiClient.get(`/groups/${groupId}`);
      const otherMembers = groupRes.data.data.members.filter(
        (m: any) => m._id !== loggedInUserId,
      );
      setMembers(otherMembers);

      const balanceRes = await apiClient.get(`/expenses/balances/${groupId}`);
      setSettlements(balanceRes.data.data.settlements);
      if (otherMembers.length > 0) {
        setToUserId(otherMembers[0]._id);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch group data");
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId) {
      fetchData();
    }
  }, [groupId, fetchData]);

  const handleCheckAmount = () => {
    if (!toUserId || settlements.length === 0 || !currentUserId) {
      setAmount("0");
      setError("No balances found or you don't owe anyone.");
      return;
    }

    const oweThem = settlements.find(
      (s) => s.to._id === toUserId && s.from._id === currentUserId,
    );
    const theyOwe = settlements.find(
      (s) => s.from._id === toUserId && s.to._id === currentUserId,
    );

    if (oweThem) {
      setAmount(amountFromUSD(oweThem.amount, USD_TO_INR).toFixed(2));
      setError("");
    } else if (theyOwe) {
      setAmount("0");
      setError(
        `You don't owe them. They actually owe you ${formatFiatFromUSD(theyOwe.amount, USD_TO_INR)}.`,
      );
    } else {
      setAmount("0");
      setError("You don't owe this user anything.");
    }
  };

  const handleSettle = async () => {
    if (!toUserId || !amount || isNaN(Number(amount))) {
      setError("Please select a user and valid amount");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const numericAmount = Number(amount);
      const usdAmount = amountToUSD(numericAmount, USD_TO_INR);

      const res = await apiClient.post("/settlements/create", {
        groupId,
        toUserId,
        amount: usdAmount,
      });

      const { settlements: createdSettlements } = res.data.data;
      const firstSettlement = createdSettlements[0];
      if (!firstSettlement?.toUpiId) {
        throw new Error(
          `User @${firstSettlement?.to || "selected user"} has not set up their UPI ID yet.`,
        );
      }

      const upiAmount =
        preferredCurrency === "INR" ? numericAmount : numericAmount * USD_TO_INR;
      const upiUrl = `upi://pay?pa=${encodeURIComponent(
        firstSettlement.toUpiId,
      )}&pn=${encodeURIComponent(firstSettlement.to)}&am=${upiAmount.toFixed(
        2,
      )}&cu=INR`;

      try {
        await Linking.openURL(upiUrl);
      } catch (err) {
        console.warn("Could not open UPI app, proceeding to confirmation", err);
      }

      Alert.alert("Confirm Payment", "Did your UPI payment succeed?", [
        { text: "No", style: "cancel", onPress: () => setLoading(false) },
        {
          text: "Yes",
          onPress: async () => {
            try {
              await apiClient.post("/settlements/fiat-submit", {
                settlementIds: createdSettlements.map(
                  (st: any) => st.settlementId,
                ),
              });
              setSettledAmount(amount);
              setSuccessModal(true);
            } catch (err: any) {
              setError(
                err.response?.data?.message || "Failed to confirm payment",
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to settle");
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setSuccessModal(false);
    router.back();
  };

  return (
    <Container>
      <Modal
        visible={successModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseSuccess}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <FontAwesome5
                name="check-circle"
                size={64}
                color={colors.success}
              />
            </View>
            <Text style={styles.successTitle}>Payment Sent!</Text>
            <Text style={styles.successSubtitle}>
              Successfully settled {getCurrencySymbol()}
              {settledAmount} via UPI
            </Text>
            <Button
              title="Done"
              onPress={handleCloseSuccess}
              variant="outline"
              style={styles.doneButton}
            />
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Settle Up</Text>
          <Text style={styles.subtitle}>Pay your friends using UPI</Text>
        </View>

        <View style={styles.form}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {members.length === 0 ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Who are you paying?</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={toUserId}
                  onValueChange={(itemValue) => setToUserId(itemValue)}
                  style={styles.picker}
                  dropdownIconColor={colors.primary}
                >
                  {members.map((m) => (
                    <Picker.Item
                      key={m._id}
                      label={m.name || m.username}
                      value={m._id}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          )}

          <Button
            title="Check Amount Owed"
            onPress={handleCheckAmount}
            variant="outline"
            style={styles.checkButton}
          />
          <Input
            label={`Amount (${preferredCurrency})`}
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
          <Button
            title="Pay via UPI App"
            onPress={handleSettle}
            loading={loading}
            style={styles.actionButton}
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
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    color: colors.text,
    fontWeight: "700",
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  picker: {
    color: colors.text,
  },
  checkButton: {
    marginBottom: 16,
  },
  actionButton: {
    marginTop: 16,
  },
  errorText: {
    color: colors.error,
    marginBottom: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: 8,
  },
  successSubtitle: {
    color: colors.textMuted,
    textAlign: "center",
    fontSize: 16,
    marginBottom: 24,
  },
  doneButton: {
    width: "100%",
  },
});
