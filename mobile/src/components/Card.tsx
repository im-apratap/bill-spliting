import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { colors } from "../theme/colors";
interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}
export const Card: React.FC<CardProps> = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 24,
    marginVertical: 10,
    elevation: 0,
    shadowOpacity: 0,
  },
});
