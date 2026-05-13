import React from "react";
import {
  View,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  StyleProp,
} from "react-native";
import { colors } from "../theme/colors";
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}
export const Input: React.FC<InputProps> = ({
  label,
  error,
  style,
  containerStyle,
  ...props
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <RNTextInput
        style={[styles.input, error ? styles.inputError : null, style]}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    width: "100%",
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999, 
    paddingHorizontal: 24,
    paddingVertical: 18,
    color: colors.text,
    fontSize: 16,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
