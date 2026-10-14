import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabIconProps = {
  focused: boolean;
  activeName: keyof typeof Ionicons.glyphMap;
  inactiveName: keyof typeof Ionicons.glyphMap;
};

function TabIcon({ focused, activeName, inactiveName }: TabIconProps) {
  return (
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons
        name={focused ? activeName : inactiveName}
        size={19}
        color={focused ? "#1f3d5c" : "#4b5563"}
      />
    </View>
  );
}

export default function ManagerLayout() {
  const insets = useSafeAreaInsets();
  const extraBottomInset = Math.max(insets.bottom, 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        freezeOnBlur: false,
        tabBarActiveTintColor: "#1f3d5c",
        tabBarInactiveTintColor: "#6b7280",
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 4,
        },
        tabBarStyle: {
          height: 60 + extraBottomInset,
          paddingTop: 8,
          paddingBottom: 14 + extraBottomInset,
          backgroundColor: "#ffffff",
          borderTopWidth: 0,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          shadowColor: "#0f172a",
          shadowOpacity: 0.04,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: -1 },
          elevation: 3,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              activeName="home"
              inactiveName="home-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "Projects",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              activeName="briefcase"
              inactiveName="briefcase-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              activeName="checkmark-done"
              inactiveName="checkmark-done-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              activeName="cube"
              inactiveName="cube-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              activeName="chatbubble-ellipses"
              inactiveName="chatbubble-ellipses-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="quotes"
        options={{
          title: "Quotes",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              activeName="receipt"
              inactiveName="receipt-outline"
            />
          ),
        }}
      />
    </Tabs>
  );
}
