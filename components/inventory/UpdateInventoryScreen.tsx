import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InventoryFormField from "./InventoryFormField";
import InventoryHeader from "./InventoryHeader";
import {
  useAllInventoryItemsQuery,
  useUpdateInventoryMutation,
} from "@/hooks/inventory/inventory";
import { toast } from "sonner-native";

export default function UpdateInventoryScreen({ itemId }: { itemId: string }) {
  const { data: items, isLoading } = useAllInventoryItemsQuery();
  const item = useMemo(() => items?.find((entry) => entry.id === itemId), [items, itemId]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("Units");
  const [minStockQty, setMinStockQty] = useState("5");
  const { mutate: updateItem, isPending } = useUpdateInventoryMutation();

  useEffect(() => {
    if (!item) return;
    setName(item.name || "");
    setCategory(item.category || "");
    setQuantity(String(item.currentQty ?? 0));
    setUnit(item.unit || "Units");
    setMinStockQty(String(item.minStock ?? 5));
  }, [item]);

  const handleSave = () => {
    if (!item?.projectId) {
      toast.error("Unable to identify this inventory item");
      return;
    }
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!unit.trim()) {
      toast.error("Unit type is required");
      return;
    }

    updateItem(
      {
        itemId,
        projectId: item.projectId,
        name: name.trim(),
        category: category.trim() || undefined,
        currentQty: Number(quantity) || 0,
        unit: unit.trim(),
        minStockQty: Number(minStockQty) || 0,
      },
      { onSuccess: () => router.back() },
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#E9EDF1]">
        <ActivityIndicator size="large" color="#1F506D" />
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView className="flex-1 bg-[#E9EDF1]" edges={["top", "left", "right"]}>
        <InventoryHeader title="Edit Inventory" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-[15px] text-[#697487]">Inventory item not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#E9EDF1]" edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
        >
          <InventoryHeader title={`Edit Product: ${item.name}`} onBack={() => router.back()} />

          <View className="mt-6 flex-1 px-5">
            <View className="rounded-[24px] border border-[#DEE4EA] bg-[#F7F9FB] p-4">
              <Text className="text-[17px] font-semibold text-[#2B2B2B]">Product details</Text>

              <InventoryFormField
                label="Product Name"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Concrete Mix, Steel Bars"
              />
              <InventoryFormField
                label="Category"
                value={category}
                onChangeText={setCategory}
                placeholder="e.g. Structural, Finishing"
              />
              <InventoryFormField
                label="Current Stock Quantity"
                value={quantity}
                onChangeText={setQuantity}
                placeholder="0"
                keyboardType="number-pad"
              />
              <InventoryFormField
                label="Unit"
                value={unit}
                onChangeText={setUnit}
                placeholder="e.g. Kg, Bags, Units"
              />
              <InventoryFormField
                label="Low Stock Threshold"
                value={minStockQty}
                onChangeText={setMinStockQty}
                placeholder="5"
                keyboardType="number-pad"
              />
            </View>

            <View className="mt-8 flex-row items-center justify-between">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.back()}
                className="h-[56px] w-[48%] items-center justify-center rounded-[14px] border border-[#D3D9E2] bg-[#F7F9FB]"
                disabled={isPending}
              >
                <Text className="text-[16px] font-medium text-[#1F2937]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSave}
                disabled={isPending}
                className="h-[56px] w-[48%] flex-row items-center justify-center rounded-[14px] bg-[#B9DBEE]"
              >
                {isPending ? <ActivityIndicator color="#1F2937" style={{ marginRight: 8 }} /> : null}
                <Text className="text-[16px] font-medium text-[#1F2937]">Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
