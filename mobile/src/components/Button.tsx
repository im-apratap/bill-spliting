import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { colors } from "../theme/colors";
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}
export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  let backgroundColor = colors.primary;
  let borderColor = "transparent";
  let textColor = "#FFFFFF";
  let borderWidth = 0;
  if (variant === "secondary") {
    backgroundColor = colors.secondary;
    textColor = colors.background;
  } else if (variant === "outline") {
    backgroundColor = "transparent";
    borderColor = colors.border;
    borderWidth = 1;
    textColor = colors.primary;
  } else if (variant === "danger") {
    backgroundColor = colors.surface;
    borderColor = colors.border;
    borderWidth = 1;
    textColor = colors.error;
  }
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor, borderColor, borderWidth },
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};
const styles = StyleSheet.create({
  button: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 999, 
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
    minHeight: 60,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
