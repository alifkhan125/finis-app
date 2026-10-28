import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import QuoteSectionCard from "./QuoteSectionCard";
import QuoteWorkGroupCard, { type QuoteSelectedWorkGroup } from "./QuoteWorkGroupCard";
import QuoteWorkTotalsBar from "./QuoteWorkTotalsBar";

type QuoteWorkItemsStepProps = {
  catalogTitle: string;
  catalogDescription: string;
  groups: QuoteSelectedWorkGroup[];
  subtotal: number;
  itemsSelected: number;
  estimatedTotal: number;
  onToggleGroup: (groupId: string) => void;
  onToggleItem: (groupId: string, itemId: string) => void;
  onEditItem: (groupId: string, itemId: string) => void;
  onDeleteItem: (groupId: string, itemId: string) => void;
  onChangeItemQuantity: (
    groupId: string,
    itemId: string,
    value: string,
  ) => void;
  onSelectItemUnit: (groupId: string, itemId: string, unit: string) => void;
  onAddCustomItem: () => void;
  onNext: () => void;
  onBack: () => void;
  estimatedTime: string;
  onChangeEstimatedTime: (value: string) => void;
  showFinancials?: boolean;
};

export default function QuoteWorkItemsStep({
  catalogTitle,
  catalogDescription,
  groups,
  subtotal,
  itemsSelected,
  estimatedTotal,
  onToggleGroup,
  onToggleItem,
  onEditItem,
  onDeleteItem,
  onChangeItemQuantity,
  onSelectItemUnit,
  onAddCustomItem,
  onNext,
  onBack,
  estimatedTime,
  onChangeEstimatedTime,
  showFinancials = true,
}: QuoteWorkItemsStepProps) {
  return (
    <>
      <QuoteSectionCard title="Select Services" icon="construct-outline">
        <Text className="text-[14px] font-medium text-[#2B2B2B]">
          {catalogTitle}
        </Text>
        <Text className="mt-2 text-[13px] leading-5 text-[#66707B]">
          {catalogDescription}
        </Text>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onAddCustomItem}
          className="mt-4 h-[46px] flex-row items-center justify-center rounded-[12px] border border-[#1F5577] bg-white"
        >
          <Ionicons name="add" size={18} color="#1F5577" />
          <Text className="ml-2 text-[14px] font-medium text-[#1F5577]">
            Add Service
          </Text>
        </TouchableOpacity>
      </QuoteSectionCard>

      {groups.length === 0 ? (
        <View className="my-3 items-center justify-center rounded-[16px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-8">
          <Ionicons name="construct-outline" size={36} color="#94A3B8" />
          <Text className="mt-2 text-[15px] font-semibold text-[#334155]">
            No services added yet
          </Text>
          <Text className="mt-1 text-center text-[12px] leading-5 text-[#64748B]">
            Tap "Add Service" above to add tasks, labor, materials, or select saved templates.
          </Text>
        </View>
      ) : (
        groups.map((group) => (
          <QuoteWorkGroupCard
            key={group.id}
            group={group}
            showFinancials={showFinancials}
            onToggleGroup={() => onToggleGroup(group.id)}
            onToggleItem={(itemId) => onToggleItem(group.id, itemId)}
            onEditItem={(itemId) => onEditItem(group.id, itemId)}
            onDeleteItem={(itemId) => onDeleteItem(group.id, itemId)}
            onChangeItemQuantity={(itemId, value) =>
              onChangeItemQuantity(group.id, itemId, value)
            }
            onSelectItemUnit={(itemId, unit) =>
              onSelectItemUnit(group.id, itemId, unit)
            }
          />
        ))
      )}

      <Text className="mb-2 mt-1 text-[12px] font-medium text-[#344054]">
        Estimated Time
      </Text>
      <TextInput
        value={estimatedTime}
        onChangeText={onChangeEstimatedTime}
        placeholder="e.g. 6 - 9 weeks"
        placeholderTextColor="#98A2B3"
        className="mb-4 h-[58px] rounded-[16px] border border-[#D5DEE8] bg-[#F6F8FB] px-4 text-[18px] text-[#667085]"
      />

      {showFinancials ? (
        <QuoteWorkTotalsBar
          itemsSelected={itemsSelected}
          estimatedTotal={estimatedTotal}
          subtotal={subtotal}
        />
      ) : (
        <View className="rounded-[14px] border border-[#D7E0E8] bg-[#F8FAFC] px-4 py-3">
          <Text className="text-[13px] font-medium text-[#475467]">
            {itemsSelected} services selected. Pricing will be added by your admin.
          </Text>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onBack}
        className="mt-4 h-[52px] items-center justify-center rounded-[12px] border border-[#D6DCE3] bg-white"
      >
        <Text className="text-[15px] font-medium text-[#2B2B2B]">Back</Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onNext}
        className="mt-3 h-[56px] items-center justify-center rounded-[14px] bg-[#1F5577]"
      >
        <Text className="text-[16px] font-medium text-white">Next</Text>
      </TouchableOpacity>
    </>
  );
}
