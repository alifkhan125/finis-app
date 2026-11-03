import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

type QuoteSectionCardProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  action?: React.ReactNode;
  children: React.ReactNode;
};

export default function QuoteSectionCard({
  title,
  icon,
  action,
  children,
}: QuoteSectionCardProps) {
  return (
    <View className="mt-5 rounded-[20px] border border-[#D7E0E8] bg-white px-5 py-5 shadow-sm">
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <Ionicons name={icon} size={22} color="#255779" />
          <Text className="ml-2.5 text-[16px] font-bold text-[#1F2937]">
            {title}
          </Text>
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}
