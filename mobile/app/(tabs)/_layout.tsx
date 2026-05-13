import "react-native-get-random-values";
import { Buffer } from "buffer";
import { Tabs } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";
import { colors } from "../../src/theme/colors";
import { Platform } from "react-native";
if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer;
}
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.surface,
          shadowColor: "transparent", 
          elevation: 0, 
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: "700",
        },
        tabBarStyle: {
          backgroundColor: "#1A1D1F",
          borderTopWidth: 0,
          height: Platform.OS === "ios" ? 85 : 65,
          paddingBottom: Platform.OS === "ios" ? 24 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#889098",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="user-friends" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="history" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <FontAwesome5 name="user" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
