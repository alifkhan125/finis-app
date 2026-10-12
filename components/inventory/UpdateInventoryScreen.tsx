import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal,
  FlatList,
  Pressable,
  TextInput,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import InventoryFormField from "./InventoryFormField";
import InventoryHeader from "./InventoryHeader";
import { useUpdateInventoryMutation, useInventoryProjectsQuery, useAllInventoryItemsQuery } from "@/hooks/inventory/inventory";
import { toast } from "sonner-native";

type SelectorBottomSheetProps = {
  visible: boolean;
  title: string;
  options: string[];
  selectedValue: string;
  placeholder: string;
  onClose: () => void;
  onSelect: (value: string) => void;
};

function SelectorBottomSheet({
  visible,
  title,
  options,
  selectedValue,
  placeholder,
  onClose,
  onSelect,
}: SelectorBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const [searchValue, setSearchValue] = useState("");
  const normalizedSearch = searchValue.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (!normalizedSearch) return options;
    return options.filter((item) =>
      item.toLowerCase().includes(normalizedSearch),
    );
  }, [normalizedSearch, options]);
  const canCreateValue =
    searchValue.trim().length > 0 &&
    !options.some((item) => item.toLowerCase() === normalizedSearch);

  useEffect(() => {
    if (visible) {
      setSearchValue(selectedValue);
    }
  }, [selectedValue, visible]);

  const closeSheet = () => {
    Keyboard.dismiss();
    setSearchValue("");
    onClose();
  };

  const handleCreate = () => {
    const value = searchValue.trim();
    if (!value) {
      toast.error(`Please search or enter a ${title.toLowerCase()}`);
      return;
    }

    onSelect(value);
    closeSheet();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={closeSheet}
    >
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={closeSheet}
        >
          <Pressable
            className="h-[450px] rounded-t-[24px] bg-white px-5 pt-4"
            style={{ paddingBottom: Math.max(insets.bottom, 28) }}
            onPress={(event) => event.stopPropagation()}
          >
            <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-[#D8DEE5]" />
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-[18px] font-bold text-[#141A22]">Select {title}</Text>
              <TouchableOpacity onPress={closeSheet}>
                <Ionicons name="close" size={24} color="#697487" />
              </TouchableOpacity>
            </View>

            <View className="mb-4 h-[52px] flex-row items-center rounded-[12px] border border-[#D8DEE5] bg-[#F7F9FB] px-4">
              <Ionicons name="search-outline" size={20} color="#8B949C" />
              <TextInput
                autoFocus
                value={searchValue}
                onChangeText={setSearchValue}
                placeholder={placeholder}
                placeholderTextColor="#A0AEC0"
                className="ml-2 flex-1 text-[16px] text-[#141A22]"
                returnKeyType={canCreateValue ? "done" : "search"}
                onSubmitEditing={() => {
                  if (canCreateValue) handleCreate();
                }}
              />
            </View>

            {canCreateValue ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleCreate}
                className="mb-3 rounded-[12px] border border-[#1F506D] bg-[#EEF6FB] px-4 py-3"
              >
                <Text className="text-[14px] font-medium text-[#1F506D]">
                  {`Create "${searchValue.trim()}"`}
                </Text>
              </TouchableOpacity>
            ) : null}

            <FlatList
              data={filteredOptions}
              keyExtractor={(item, index) => `${title}-${index}-${item.toLowerCase()}`}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    onSelect(item);
                    closeSheet();
                  }}
                  className={`mb-3 min-h-[52px] flex-row items-center justify-between rounded-[12px] border px-4 py-3 ${selectedValue.toLowerCase() === item.toLowerCase()
                    ? "border-[#2662F4] bg-[#F0F4FF]"
                    : "border-[#D8DEE5] bg-[#F7F9FB]"
                    }`}
                >
                  <Text className="flex-1 pr-3 text-[15px] font-medium text-[#141A22]">{item}</Text>
                  {selectedValue.toLowerCase() === item.toLowerCase() ? (
                    <Ionicons name="checkmark-circle" size={20} color="#2662F4" />
                  ) : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text className="py-6 text-center text-[14px] text-[#697487]">
                  No {title.toLowerCase()} found.
                </Text>
              }
            />
            {/* REQUIRED FILLER TO PREVENT ANDROID KEYBOARD GAP BUG - DO NOT REMOVE */}
            <View className="bg-white absolute" style={{ height: 400, bottom: -390, left: 0, right: 0 }} />
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DropdownField({
  label,
  value,
  placeholder,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <View className="mt-4">
      <Text className="text-[14px] font-medium text-[#4D596A]">{label}</Text>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        className="mt-2 flex-row items-center justify-between rounded-[12px] border border-[#D8DEE5] bg-white px-4 py-3.5"
      >
        <Text className={`text-[16px] ${value ? "text-[#141A22]" : "text-[#A0AEC0]"}`}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#A0AEC0" />
      </TouchableOpacity>
    </View>
  );
}

export default function UpdateInventoryScreen({ itemId }: { itemId: string }) {
  const { data: items } = useAllInventoryItemsQuery();
  const item = useMemo(() => items?.find(i => i.id === itemId), [items, itemId]);

  const [projectId, setProjectId] = useState<string | null>(null);
  const [isProjectModalVisible, setProjectModalVisible] = useState(false);
  const [selector, setSelector] = useState<"category" | "unit" | "location" | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [location, setLocation] = useState("");
  const [quantity, setQuantity] = useState("");
  const [minStockQty, setMinStockQty] = useState("");

  useEffect(() => {
    if (item) {
      setProjectId(item.projectId || null);
      setName(item.name || "");
      setCategory(item.category || "");
      setUnit(item.unit || "");
      setLocation(item.location || "");
      setQuantity(item.currentQty?.toString() || "0");
      setMinStockQty(item.minStock?.toString() || "0");
    }
  }, [item]);

  const { data: inventoryOptions, isLoading: isLoadingProjects } = useInventoryProjectsQuery();
  const projects = inventoryOptions?.projects ?? [];
  const { mutate: updateItem, isPending } = useUpdateInventoryMutation();

  const selectedProject = projects.find((p) => p.id === projectId);
  const locationOptions = useMemo(
    () => Array.from(new Set(projects.map((project) => project.location?.trim()).filter((value): value is string => Boolean(value)))),
    [projects],
  );
  const selectorConfig = selector
    ? {
      category: {
        title: "Category",
        options: inventoryOptions?.category ?? [],
        value: category,
        placeholder: "Enter new category",
        onSelect: setCategory,
      },
      unit: {
        title: "Unit",
        options: inventoryOptions?.unit ?? [],
        value: unit,
        placeholder: "Enter new unit",
        onSelect: setUnit,
      },
      location: {
        title: "Location",
        options: locationOptions,
        value: location,
        placeholder: "Enter new location",
        onSelect: setLocation,
      },
    }[selector]
    : null;

  const handleSave = () => {
    if (!projectId) {
      toast.error("Please select a project first");
      return;
    }

    if (!category.trim() || !unit.trim() || !location.trim()) {
      toast.error("Please select category, unit, and location");
      return;
    }

    updateItem(
      {
        itemId,
        projectId,
        name: name.trim() || "Unnamed Item",
        category: category.trim(),
        unit: unit.trim(),
        currentQty: Number(quantity) || 0,
        location: location.trim(),
      },
      {
        onSuccess: () => {
          router.back();
        },
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#E9EDF1] " edges={['top', 'left', "right"]}>
      <KeyboardAvoidingView
        className="flex-1"

        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
        >
          <InventoryHeader title="Update Inventory" onBack={() => router.back()} />

          <View className="mt-6 flex-1 px-5">
            <View className="rounded-[24px] border border-[#DEE4EA] bg-[#F7F9FB] p-4">
              <Text className="text-[17px] font-semibold text-[#2B2B2B]">
                Product details
              </Text>

              <View className="mt-4">
                <Text className="text-[14px] font-medium text-[#4D596A]">Project</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setProjectModalVisible(true)}
                  className="mt-2 flex-row items-center justify-between rounded-[12px] border border-[#D8DEE5] bg-white px-4 py-3.5"
                >
                  <Text className={`text-[16px] ${selectedProject ? "text-[#141A22]" : "text-[#A0AEC0]"}`}>
                    {selectedProject ? selectedProject.name : "Select a project"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#A0AEC0" />
                </TouchableOpacity>
              </View>

              <InventoryFormField
                label="Product Name"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Electrical Wire"
              />

              <DropdownField
                label="Category"
                value={category}
                placeholder="Select a category"
                onPress={() => setSelector("category")}
              />

              <DropdownField
                label="Unit"
                value={unit}
                placeholder="Select a unit"
                onPress={() => setSelector("unit")}
              />

              <DropdownField
                label="Location"
                value={location}
                placeholder="Select a location"
                onPress={() => setSelector("location")}
              />

              <InventoryFormField
                label="Current Quantity"
                value={quantity}
                onChangeText={setQuantity}
                placeholder="e.g. 500"
                keyboardType="number-pad"
              />

              <InventoryFormField
                label="Minimum Stock Quantity"
                value={minStockQty}
                onChangeText={setMinStockQty}
                placeholder="e.g. 50"
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
                <Text className="text-[16px] font-medium text-[#1F2937]">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSave}
                disabled={isPending}
                className="h-[56px] w-[48%] flex-row items-center justify-center rounded-[14px] bg-[#B9DBEE]"
              >
                {isPending ? (
                  <ActivityIndicator color="#1F2937" style={{ marginRight: 8 }} />
                ) : null}
                <Text className="text-[16px] font-medium text-[#1F2937]">
                  Update Item
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={isProjectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProjectModalVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 justify-end bg-black/40"
          activeOpacity={1}
          onPress={() => setProjectModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="h-[60%] rounded-t-[24px] bg-white p-5"
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-[18px] font-bold text-[#141A22]">Select Project</Text>
              <TouchableOpacity onPress={() => setProjectModalVisible(false)}>
                <Ionicons name="close" size={24} color="#697487" />
              </TouchableOpacity>
            </View>

            {isLoadingProjects ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#1F506D" />
              </View>
            ) : (
              <FlatList
                data={projects}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      setProjectId(item.id);
                      setProjectModalVisible(false);
                    }}
                    className={`mb-3 flex-row items-center justify-between rounded-[12px] border p-4 ${projectId === item.id
                      ? "border-[#2662F4] bg-[#F0F4FF]"
                      : "border-[#D8DEE5] bg-[#F7F9FB]"
                      }`}
                  >
                    <Text
                      className={`text-[16px] ${projectId === item.id ? "font-semibold text-[#2662F4]" : "text-[#141A22]"
                        }`}
                    >
                      {item.name}
                    </Text>
                    {projectId === item.id && (
                      <Ionicons name="checkmark-circle" size={20} color="#2662F4" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View className="mt-10 items-center">
                    <Text className="text-[#697487]">No projects found</Text>
                  </View>
                }
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {selectorConfig ? (
        <SelectorBottomSheet
          visible
          title={selectorConfig.title}
          options={selectorConfig.options}
          selectedValue={selectorConfig.value}
          placeholder={selectorConfig.placeholder}
          onClose={() => setSelector(null)}
          onSelect={selectorConfig.onSelect}
        />
      ) : null}
    </SafeAreaView>
  );
}

