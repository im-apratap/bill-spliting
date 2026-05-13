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
    borderRadius: 32, 
    padding: 24,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05, 
    shadowRadius: 16,
    elevation: 2,
  },
});
