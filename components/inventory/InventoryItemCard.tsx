import { Feather } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { getInventoryStatus } from "./inventoryStore";
import { InventoryItem } from "./types";

type InventoryItemCardProps = {
  item: InventoryItem;
  onPressUpdate?: () => void;
  onPressDelete?: () => void;
};

export default function InventoryItemCard({
  item,
  onPressUpdate,
  onPressDelete,
}: InventoryItemCardProps) {
  const status = getInventoryStatus(item);

  const badge =
    status === "Critical"
      ? { bg: "#FEE2E2", text: "#DC2626" }
      : status === "Low Stock"
        ? { bg: "#FEF3C7", text: "#B45309" }
        : { bg: "#D1FAE5", text: "#047857" };

  const progressColor =
    status === "Critical"
      ? "#FF2E3A"
      : status === "Low Stock"
        ? "#E7A900"
        : "#10B84A";

  const progressPercent = Math.min(
    (item.currentQty / item.minStock) * 100,
    100,
  );

  return (
    <View className="mt-4 rounded-2xl border border-[#DEE4EA] bg-[#F7F9FB] px-4 py-4">
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-[17px] font-medium text-[#111827]">
            {item.name}
          </Text>
          <Text className="mt-1 text-[16px] text-[#475467]">
            {item.category}
          </Text>
        </View>

        <View
          className="rounded-lg px-3 py-1.5"
          style={{ backgroundColor: badge.bg }}
        >
          <Text
            className="text-[14px] font-medium"
            style={{ color: badge.text }}
          >
            {status}
          </Text>
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <View className="w-[31%]">
          <Text className="text-[14px] text-[#475467]">Current</Text>
          <Text className="text-[17px] font-medium text-[#101828]">
            {item.currentQty} {item.unit}
          </Text>
        </View>

        <View className="w-[31%]">
          <Text className="text-[14px] text-[#475467]">Min Stock</Text>
          <Text className="text-[17px] font-medium text-[#101828]">
            {item.minStock} {item.unit}
          </Text>
        </View>

        <View className="w-[31%]">
          <Text className="text-[14px] text-[#475467]">Location</Text>
          <Text className="text-[17px] font-medium text-[#101828]">
            {item.location}
          </Text>
        </View>
      </View>

      <View className="mt-4 h-3 w-full rounded-full bg-[#D8DDE5]">
        <View
          className="h-3 rounded-full"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: progressColor,
          }}
        />
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <Text className="text-[15px] text-[#667085]">
          Updated: {item.updatedAt}
        </Text>

        {onPressUpdate || onPressDelete ? (
          <View className="flex-row items-center space-x-3">
            {onPressUpdate ? (
              <TouchableOpacity activeOpacity={0.85} onPress={onPressUpdate} className="mr-3">
                <Feather name="edit-2" size={20} color="#1D5478" />
              </TouchableOpacity>
            ) : null}
            {onPressDelete ? (
              <TouchableOpacity activeOpacity={0.85} onPress={onPressDelete}>
                <Feather name="trash-2" size={20} color="#DC2626" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
