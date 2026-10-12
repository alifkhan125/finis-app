import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import AvatarStack from "./AvatarStack";
import PriorityBadge from "./PriorityBadge";

type AssignedProjectCardProps = {
  priority: "MEDIUM" | "HIGH" | "LOW";
  title: string;
  site: string;
  date: string;
  checklist: string;
  links: string;
  extraMembers: string;
  avatars: (string | null)[];
  onPress?: () => void;
  onMenuPress?: () => void;
};

export default function AssignedProjectCard({
  priority,
  title,
  site,
  date,
  checklist,
  links,
  extraMembers,
  avatars,
  onPress,
  onMenuPress,
}: AssignedProjectCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className="mt-4 h-[206px] w-full flex-col items-start gap-4 rounded-xl border border-[#EDEDED] bg-white p-4"
    >
      <View className="w-full flex-row items-center justify-between">
        <View className="flex-row items-center">
          <PriorityBadge level={priority} />
          <Ionicons
            name="business-outline"
            size={24}
            color="#1e5d7e"
            style={{ marginLeft: 12 }}
          />
        </View>
        {onMenuPress && (
          <TouchableOpacity
            onPress={onMenuPress}
            className="p-2 -mr-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      <View className="w-full">
        <Text className="text-[16px] font-semibold text-[#101010]">
          {title}
        </Text>
        <Text
          className="mt-1 text-[14px] font-normal leading-[22.4px] text-[#878787]"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {site}
        </Text>
      </View>

      <View className="w-full">
        {date ? (
          <View className="flex-row items-center justify-center gap-2 rounded-md bg-[#F7F7F8] px-4 py-1 self-start">
            <Text className="text-[12px] font-normal text-[#101010]">
              {date}
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center justify-center gap-2 rounded-md bg-[#F7F7F8] px-4 py-1 self-start opacity-50">
            <Text className="text-[12px] font-normal text-[#64748b]">
              No Date
            </Text>
          </View>
        )}
        <View className="mt-4">
          <AvatarStack avatars={avatars} extraCount={extraMembers} />
        </View>
      </View>
    </TouchableOpacity>
  );
}
