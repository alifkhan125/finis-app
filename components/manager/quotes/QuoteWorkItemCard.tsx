import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { formatCurrency, type QuoteUnitOption } from "./quoteTypes";

export type QuoteSelectedWorkItem = {
  id: string;
  title: string;
  quantity: string;
  unitOptions: QuoteUnitOption[];
  selectedUnit: string;
  selectedUnitPrice: number;
  selected: boolean;
  isCustom?: boolean;
  description?: string;
  estimatedHours?: string;
  scopeChecklist?: string[];
  locationMode?: "all" | "selected";
  selectedFloorNumbers?: number[];
  selectedUnitNames?: string[];
  plannedLocationKeys?: string[];
};

type BackendQuoteItem = {
  id: string;
  title: string;
  projectType: string;
  propertyType: string;
  unitType: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  subtotal: number;
  notes: string | null;
  isCustom: boolean;
  unitOptions?: QuoteUnitOption[];
  selectedUnit?: string;
  selectedUnitPrice?: number;
  selected?: boolean;
  description?: string;
  estimatedHours?: string;
  scopeChecklist?: string[];
  locationMode?: "all" | "selected";
  selectedFloorNumbers?: number[];
  selectedUnitNames?: string[];
  plannedLocationKeys?: string[];
};

type QuoteWorkItemCardProps = {
  item: QuoteSelectedWorkItem | BackendQuoteItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onChangeQuantity: (value: string) => void;
  onSelectUnit: (unit: string) => void;
};

function formatUnitPrice(value: number) {
  const formatted = Number.isInteger(value)
    ? String(value)
    : String(value.toFixed(2));
  return formatted.replace(/\.00$/, "").replace(/(\.\d*[1-9])0$/, "$1");
}

export default function QuoteWorkItemCard({
  item,
  onToggle,
  onEdit,
  onDelete,
  onChangeQuantity,
  onSelectUnit,
}: QuoteWorkItemCardProps) {
  const unitOptions = "unitOptions" in item ? item.unitOptions ?? [] : [];
  const selectedUnit =
    "selectedUnit" in item ? item.selectedUnit ?? "" : item.unit ?? "";
  const selectedUnitPrice =
    "selectedUnitPrice" in item
      ? item.selectedUnitPrice || item.unitOptions?.find((option) => option.unit === selectedUnit)?.price || item.unitOptions?.[0]?.price || 0
      : ((item as any).unitCost ?? item.unitPrice ?? 0);
  const quantityValue =
    "quantity" in item ? String(item.quantity ?? 0) : "0";
  const selected = "selected" in item ? item.selected ?? false : true;

  const quantity = Number(quantityValue) || 0;
  const subtotal = quantity * selectedUnitPrice;
  const currentUnitIndex = unitOptions.findIndex(
    (option) => option.unit === selectedUnit,
  );

  const handleUnitPress = () => {
    if (!unitOptions.length) return;
    const nextIndex =
      currentUnitIndex >= 0
        ? (currentUnitIndex + 1) % unitOptions.length
        : 0;
    onSelectUnit(unitOptions[nextIndex].unit);
  };

  const assignedLocationsCount = item.plannedLocationKeys?.length ?? (item.selectedFloorNumbers?.length ? item.selectedFloorNumbers.length : 0);

  return (
    <View className="rounded-[16px] border border-[#E6EBF1] bg-white px-4 py-4 shadow-sm">
      <View className="mb-4 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[16px] font-semibold text-[#101828]">
            {item.title}
          </Text>
          {assignedLocationsCount > 0 ? (
            <View className="mt-1 flex-row items-center gap-1">
              <Ionicons name="location" size={12} color="#1F5577" />
              <Text className="text-[11px] font-semibold text-[#1F5577]">
                Assigned to {assignedLocationsCount} {assignedLocationsCount === 1 ? "unit/location" : "units/locations"}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onEdit}
            className="h-9 w-9 items-center justify-center rounded-[10px] border border-[#D5DEE8] bg-white"
          >
            <Ionicons name="create-outline" size={16} color="#475467" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onDelete}
            className="h-9 w-9 items-center justify-center rounded-[10px] bg-[#FEE2E2]"
          >
            <Ionicons name="trash-outline" size={16} color="#B42318" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onToggle}
            className={`h-9 w-9 items-center justify-center rounded-[10px] border ${selected ? "border-[#1F5577] bg-[#1F5577]" : "border-[#C7D1DB] bg-white"}`}
          >
            <Ionicons
              name={selected ? "checkmark" : "add"}
              size={16}
              color={selected ? "#FFFFFF" : "#98A2B3"}
            />
          </TouchableOpacity>
        </View>
      </View>

      <Text className="mb-2 text-[12px] font-medium text-[#344054]">
        Quantity
      </Text>
      <TextInput
        value={quantityValue}
        onChangeText={onChangeQuantity}
        keyboardType="decimal-pad"
        className="mb-4 h-[54px] rounded-[14px] border border-[#DDE3EA] bg-[#F8FAFC] px-4 text-[17px] text-[#475467]"
      />

      <Text className="mb-2 text-[12px] font-medium text-[#344054]">Unit</Text>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleUnitPress}
        className="mb-4 h-[54px] flex-row items-center justify-between rounded-[14px] border border-[#DDE3EA] bg-[#F8FAFC] px-4"
      >
        <Text className="text-[17px] text-[#475467]">{selectedUnit || "Select unit"}</Text>
        {unitOptions.length > 1 ? (
          <Ionicons name="chevron-down" size={18} color="#98A2B3" />
        ) : null}
      </TouchableOpacity>

      <Text className="mb-2 text-[12px] font-medium text-[#344054]">
        Unit Price
      </Text>
      <View className="mb-4 h-[54px] flex-row items-center rounded-[14px] border border-[#DDE3EA] bg-[#F8FAFC] px-4">
        <Text className="mr-2 text-[17px] text-[#98A2B3]">$</Text>
        <Text className="text-[17px] text-[#475467]">
          {formatUnitPrice(selectedUnitPrice)}
        </Text>
      </View>

      <Text className="mb-2 text-[12px] font-medium text-[#344054]">
        Subtotal
      </Text>
      <View className="h-[54px] justify-center rounded-[14px] border border-[#DDE3EA] bg-[#F8FAFC] px-4">
        <Text className="text-[17px] font-semibold text-[#101828]">
          {formatCurrency(subtotal)}
        </Text>
      </View>
    </View>
  );
}

