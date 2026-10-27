import { router } from "expo-router";
import React, { useState } from "react";
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
import { useCreateInventoryMutation } from "@/hooks/inventory/inventory";
import { toast } from "sonner-native";

export default function AddInventoryScreen() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("Units");
  const [minStockQty, setMinStockQty] = useState("5");
  const { mutate: createItem, isPending } = useCreateInventoryMutation();

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!unit.trim()) {
      toast.error("Unit type is required");
      return;
    }

    createItem(
      {
        name: name.trim(),
        category: category.trim() || undefined,
        unit: unit.trim(),
        currentQty: Number(quantity) || 0,
        minStockQty: Number(minStockQty) || 0,
      },
      { onSuccess: () => router.back() },
    );
  };

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
          <InventoryHeader title="Add Inventory" onBack={() => router.back()} />

          <View className="mt-6 flex-1 px-5">
            <View className="rounded-[24px] border border-[#DEE4EA] bg-[#F7F9FB] p-4">
         

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
                label="Initial Quantity"
                value={quantity}
                onChangeText={setQuantity}
                placeholder="0"
                keyboardType="number-pad"
              />
              <InventoryFormField
                label="Unit Type"
                value={unit}
                onChangeText={setUnit}
                placeholder="e.g. Pkgs, Ltrs, Units"
              />
              <InventoryFormField
                label="Reorder Threshold"
                value={minStockQty}
                onChangeText={setMinStockQty}
                placeholder="5"
                keyboardType="number-pad"
              />
              <Text className="mt-1 text-[11px] font-medium text-[#8B949C]">
                System will alert you when stock falls below this level.
              </Text>
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
                <Text className="text-[16px] font-medium text-[#1F2937]">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
