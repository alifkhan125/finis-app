import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import QuoteWorkItemCard, {
  type QuoteSelectedWorkItem,
} from "./QuoteWorkItemCard";

export type QuoteSelectedWorkGroup = {
  id: string;
  title: string;
  expanded: boolean;
  items: QuoteSelectedWorkItem[];
};

type QuoteWorkGroupCardProps = {
  group: QuoteSelectedWorkGroup;
  onToggleGroup: () => void;
  onToggleItem: (itemId: string) => void;
  onEditItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onChangeItemQuantity: (itemId: string, value: string) => void;
  onSelectItemUnit: (itemId: string, unit: string) => void;
  showFinancials?: boolean;
};

export default function QuoteWorkGroupCard({
  group,
  onToggleGroup,
  onToggleItem,
  onEditItem,
  onDeleteItem,
  onChangeItemQuantity,
  onSelectItemUnit,
  showFinancials = true,
}: QuoteWorkGroupCardProps) {
  return (
    <View className="mb-4 rounded-[18px] border border-[#E3E8EE] bg-[#FCFDFE] px-4 py-4 shadow-sm">
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onToggleGroup}
        className="flex-row items-start justify-between"
      >
        <View className="flex-1 pr-3">
          <Text className="text-[18px] font-semibold text-[#101828]">
            {group.title}
          </Text>
          <Text className="mt-1 text-[13px] text-[#667085]">
            {group.items.length} {group.items.length === 1 ? "item" : "items"}
          </Text>
        </View>
        <Ionicons
          name={group.expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#7B8794"
        />
      </TouchableOpacity>

      {group.expanded ? (
        <View className="mt-4 gap-3">
          {group.items.map((item, index) => (
            <QuoteWorkItemCard
              key={`${group.id}-${item.id}-${index}`}
              item={item}
              showFinancials={showFinancials}
              onToggle={() => onToggleItem(item.id)}
              onEdit={() => onEditItem(item.id)}
              onDelete={() => onDeleteItem(item.id)}
              onChangeQuantity={(value) => onChangeItemQuantity(item.id, value)}
              onSelectUnit={(unit) => onSelectItemUnit(item.id, unit)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
