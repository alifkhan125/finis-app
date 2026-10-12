import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type OptionItem = {
  id: string;
  name: string;
  value?: string;
};

type WorkItemSuggestion = {
  id: string;
  name: string;
  category?: { id: string; name: string } | null;
  measurementType?: string | null;
  unitCost?: number | null;
};

type SelectorType = "service" | "category" | "measurement";

type AddCustomQuoteItemModalProps = {
  visible: boolean;
  title: string;
  quantity: string;
  categoryId: string;
  measurementType: string;
  unitPrice: string;
  categories: OptionItem[];
  measurementTypes: OptionItem[];
  workItemSuggestions: WorkItemSuggestion[];
  onChangeTitle: (value: string) => void;
  onChangeQuantity: (value: string) => void;
  onChangeCategoryId: (value: string) => void;
  onChangeMeasurementType: (value: string) => void;
  onChangeUnitPrice: (value: string) => void;
  onSelectWorkItem: (item: WorkItemSuggestion) => void;
  onClose: () => void;
  onAdd: () => void;
  isEditMode?: boolean;
};

type SelectorSheetProps = {
  visible: boolean;
  title: string;
  options: OptionItem[];
  selectedValue: string;
  searchValue: string;
  searchPlaceholder: string;
  allowCustomValue?: boolean;
  customValueLabel?: string;
  onChangeSearch: (value: string) => void;
  onSelect: (item: OptionItem) => void;
  onClose: () => void;
};

function SelectorSheet({
  visible,
  title,
  options,
  selectedValue,
  searchValue,
  searchPlaceholder,
  allowCustomValue = false,
  customValueLabel,
  onChangeSearch,
  onSelect,
  onClose,
}: SelectorSheetProps) {
  const insets = useSafeAreaInsets();
  const safeSearchValue = searchValue ?? "";
  const normalizedSearch = safeSearchValue.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (!normalizedSearch) {
      return options;
    }
    return options.filter((item) =>
      (item.name ?? "").toLowerCase().includes(normalizedSearch),
    );
  }, [normalizedSearch, options]);

  const canUseCustomValue =
    allowCustomValue &&
    safeSearchValue.trim().length > 0 &&
    !options.some(
      (item) => (item.name ?? "").toLowerCase() === safeSearchValue.trim().toLowerCase(),
    );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior="padding"
        className="flex-1"
      >
        <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
          <Pressable
            className="max-h-[72%] rounded-t-[24px] bg-white px-5 pb-7 pt-4"
            style={{ paddingBottom: Math.max(insets.bottom, 28) }}
            onPress={(event) => event.stopPropagation()}
          >
            <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-[#D8DEE5]" />
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-[18px] font-bold text-[#141A22]">Select {title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#697487" />
              </TouchableOpacity>
            </View>

            <TextInput
              value={safeSearchValue}
              onChangeText={onChangeSearch}
              placeholder={searchPlaceholder}
              placeholderTextColor="#A0AEC0"
              className="mb-4 h-[52px] rounded-[12px] border border-[#D8DEE5] bg-[#F7F9FB] px-4 text-[16px] text-[#141A22]"
            />

            {canUseCustomValue ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() =>
                  onSelect({
                    id: `custom-${safeSearchValue.trim().toLowerCase()}`,
                    name: safeSearchValue.trim(),
                    value: safeSearchValue.trim(),
                  })
                }
                className="mb-3 rounded-[12px] border border-[#1F5577] bg-[#EEF6FB] px-4 py-3"
              >
                <Text className="text-[14px] font-medium text-[#1F5577]">
                  {customValueLabel ?? `Use "${safeSearchValue.trim()}"`}
                </Text>
              </TouchableOpacity>
            ) : null}

            <FlatList
              data={filteredOptions}
              keyExtractor={(item, index) => `${title}-${index}-${item.id}-${item.value ?? item.name}`}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const optionValue = item.value ?? item.name;
                const selected = selectedValue === optionValue || selectedValue === item.id;
                return (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => onSelect(item)}
                    className="mb-2 flex-row items-center justify-between rounded-[12px] border border-[#E3E8EE] bg-[#F8FAFC] px-4 py-3"
                  >
                    <Text className={`text-[15px] ${selected ? "font-semibold text-[#1F5577]" : "text-[#2B2B2B]"}`}>
                      {item.name ?? item.value ?? "Unnamed"}
                    </Text>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={20} color="#1F5577" />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View className="mt-8 items-center">
                  <Text className="text-[14px] text-[#697487]">No options found</Text>
                </View>
              }
            />
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SelectorField({
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
    <View className="mt-3">
      <Text className="mb-2 text-[12px] text-[#66707B]">{label}</Text>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        className="h-[42px] flex-row items-center justify-between rounded-[10px] border border-[#D9E1E8] bg-[#F7F9FB] px-3"
      >
        <Text className={`text-[13px] ${value ? "text-[#1F2937]" : "text-[#98A2B3]"}`}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#66707B" />
      </TouchableOpacity>
    </View>
  );
}

export default function AddCustomQuoteItemModal({
  visible,
  title,
  quantity,
  categoryId,
  measurementType,
  unitPrice,
  categories,
  measurementTypes,
  workItemSuggestions,
  onChangeTitle,
  onChangeQuantity,
  onChangeCategoryId,
  onChangeMeasurementType,
  onChangeUnitPrice,
  onSelectWorkItem,
  onClose,
  onAdd,
  isEditMode = false,
}: AddCustomQuoteItemModalProps) {
  const [activeSelector, setActiveSelector] = useState<SelectorType | null>(null);
  const [serviceSearch, setServiceSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [measurementSearch, setMeasurementSearch] = useState("");

  const selectedCategoryLabel =
    categories.find((item) => item.id === categoryId)?.name ?? "";
  const selectedMeasurementLabel =
    measurementTypes.find(
      (item) => (item.value ?? item.name) === measurementType,
    )?.name ?? "";

  const serviceOptions = useMemo(
    () =>
      workItemSuggestions.map((item, index) => ({
        id: item.id || `service-${index}`,
        name: item.name,
        value: item.name,
      })),
    [workItemSuggestions],
  );

  const handleSelectService = (option: OptionItem) => {
    const matchedItem = workItemSuggestions.find(
      (item) => item.id === option.id || item.name === option.name,
    );

    if (matchedItem) {
      onSelectWorkItem(matchedItem);
    } else {
      onChangeTitle(option.name);
    }

    setServiceSearch(option.name);
    setActiveSelector(null);
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
        <KeyboardAvoidingView
          behavior="padding"
          className="flex-1"
        >
          <Pressable
            className="flex-1 items-center justify-center bg-black/30 px-6"
            onPress={onClose}
          >
            <Pressable
              onPress={(event) => event.stopPropagation()}
              className="w-full max-w-[340px] max-h-[100%] self-center rounded-[16px] bg-white p-4 shadow-lg"
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
              >
                <Text className="text-[16px] font-semibold text-[#1F2937]">
                  {isEditMode ? "Edit Item" : "Add Custom Item"}
                </Text>
                <Text className="mt-1 text-[13px] leading-5 text-[#66707B]">
                  {isEditMode
                    ? "Update the item details using the current values."
                    : "Add a manual service if it does not exist in the selected catalog."}
                </Text>

                <SelectorField
                  label="Service Name"
                  value={title}
                  placeholder="Select or type service name"
                  onPress={() => {
                    setServiceSearch(title);
                    setActiveSelector("service");
                  }}
                />

                <View className="mt-3">
                  <Text className="mb-2 text-[12px] text-[#66707B]">Quantity</Text>
                  <TextInput
                    value={quantity}
                    onChangeText={onChangeQuantity}
                    keyboardType="decimal-pad"
                    placeholder="1"
                    placeholderTextColor="#98A2B3"
                    className="h-[42px] rounded-[10px] border border-[#D9E1E8] bg-[#F7F9FB] px-3 text-[13px] text-[#1F2937]"
                  />
                </View>

                {!isEditMode && (
                  <SelectorField
                    label="Category"
                    value={selectedCategoryLabel}
                    placeholder="Select category"
                    onPress={() => {
                      setCategorySearch("");
                      setActiveSelector("category");
                    }}
                  />
                )}

                <SelectorField
                  label="Unit of Measurement"
                  value={selectedMeasurementLabel}
                  placeholder="Select unit of measurement"
                  onPress={() => {
                    setMeasurementSearch("");
                    setActiveSelector("measurement");
                  }}
                />

                <View className="mt-3">
                  <Text className="mb-2 text-[12px] text-[#66707B]">Unit Price</Text>
                  <View className="h-[42px] flex-row items-center rounded-[10px] border border-[#D9E1E8] bg-[#F7F9FB] px-3">
                    <Text className="mr-2 text-[13px] text-[#98A2B3]">$</Text>
                    <TextInput
                      value={unitPrice}
                      onChangeText={onChangeUnitPrice}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#98A2B3"
                      className="flex-1 text-[13px] text-[#1F2937]"
                    />
                  </View>
                </View>

                <View className="mt-4 flex-row gap-3">
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={onClose}
                    className="h-[42px] flex-1 items-center justify-center rounded-[10px] border border-[#D5DDE6] bg-white"
                  >
                    <Text className="text-[13px] font-medium text-[#344054]">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={onAdd}
                    className="h-[42px] flex-1 items-center justify-center rounded-[10px] bg-[#1F5577]"
                  >
                    <Text className="text-[13px] font-medium text-white">
                      {isEditMode ? "Save" : "Add Item"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <SelectorSheet
        visible={activeSelector === "service"}
        title="Service Name"
        options={serviceOptions}
        selectedValue={title}
        searchValue={serviceSearch}
        searchPlaceholder="Search service name"
        allowCustomValue
        customValueLabel={(serviceSearch ?? "").trim() ? `Use "${(serviceSearch ?? "").trim()}"` : undefined}
        onChangeSearch={(value) => {
          setServiceSearch(value);
          onChangeTitle(value);
        }}
        onSelect={handleSelectService}
        onClose={() => setActiveSelector(null)}
      />

      <SelectorSheet
        visible={activeSelector === "category"}
        title="Category"
        options={categories}
        selectedValue={categoryId}
        searchValue={categorySearch}
        searchPlaceholder="Search category"
        onChangeSearch={setCategorySearch}
        onSelect={(item) => {
          onChangeCategoryId(item.id);
          setCategorySearch(item.name);
          setActiveSelector(null);
        }}
        onClose={() => setActiveSelector(null)}
      />

      <SelectorSheet
        visible={activeSelector === "measurement"}
        title="Unit of Measurement"
        options={measurementTypes}
        selectedValue={measurementType}
        searchValue={measurementSearch}
        searchPlaceholder="Search measurement"
        allowCustomValue
        customValueLabel={(measurementSearch ?? "").trim() ? `Use "${(measurementSearch ?? "").trim()}"` : undefined}
        onChangeSearch={setMeasurementSearch}
        onSelect={(item) => {
          onChangeMeasurementType(item.value ?? item.name);
          setMeasurementSearch(item.name);
          setActiveSelector(null);
        }}
        onClose={() => setActiveSelector(null)}
      />
    </>
  );
}


