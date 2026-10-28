import React, { useState } from "react";
import {
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
import { Ionicons } from "@expo/vector-icons";

type EditQuoteItemModalProps = {
  visible: boolean;
  title: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  estimatedHours?: string;
  description?: string;
  plannedFloorNumbers?: number[];
  getPlannedUnitNames?: (floor: number) => string[];
  selectedFloorNumbers?: number[];
  plannedLocationKeys?: string[];
  scopeChecklist?: string[];
  onChangeTitle: (value: string) => void;
  onChangeQuantity: (value: string) => void;
  onChangeUnit: (value: string) => void;
  onChangeUnitPrice: (value: string) => void;
  onChangeEstimatedHours?: (value: string) => void;
  onChangeDescription?: (value: string) => void;
  onChangeSelectedFloors?: (floors: number[], locationKeys: string[]) => void;
  onChangePlannedLocationKeys?: (keys: string[]) => void;
  onChangeScopeChecklist?: (items: string[]) => void;
  onClose: () => void;
  onSave: () => void;
  showFinancials?: boolean;
};

export default function EditQuoteItemModal({
  visible,
  title,
  quantity,
  unit,
  unitPrice,
  estimatedHours = "",
  description = "",
  plannedFloorNumbers = [],
  getPlannedUnitNames = () => [],
  selectedFloorNumbers = [],
  plannedLocationKeys = [],
  scopeChecklist = [],
  onChangeTitle,
  onChangeQuantity,
  onChangeUnit,
  onChangeUnitPrice,
  onChangeEstimatedHours,
  onChangeDescription,
  onChangeSelectedFloors,
  onChangePlannedLocationKeys,
  onChangeScopeChecklist,
  onClose,
  onSave,
  showFinancials = true,
}: EditQuoteItemModalProps) {
  const [newChecklistText, setNewChecklistText] = useState("");

  const allFloorUnitKeys = plannedFloorNumbers.flatMap((floor) =>
    getPlannedUnitNames(floor).map((unitName) => `floor_${floor}_unit_${unitName}`),
  );

  const areAllFloorsSelected =
    plannedFloorNumbers.length > 0 &&
    plannedFloorNumbers.every((floor) => selectedFloorNumbers.includes(floor)) &&
    allFloorUnitKeys.every((key) => plannedLocationKeys.includes(key));

  const handleToggleSelectAllFloors = () => {
    if (!onChangeSelectedFloors) return;
    if (areAllFloorsSelected) {
      onChangeSelectedFloors([], []);
    } else {
      onChangeSelectedFloors([...plannedFloorNumbers], [...allFloorUnitKeys]);
    }
  };

  const handleToggleFloor = (floor: number) => {
    if (!onChangeSelectedFloors) return;
    const isSelected = selectedFloorNumbers.includes(floor);
    const floorKeys = getPlannedUnitNames(floor).map(
      (unitName) => `floor_${floor}_unit_${unitName}`,
    );

    if (isSelected) {
      const nextFloors = selectedFloorNumbers.filter((f) => f !== floor);
      const nextKeys = plannedLocationKeys.filter((k) => !floorKeys.includes(k));
      onChangeSelectedFloors(nextFloors, nextKeys);
    } else {
      const nextFloors = [...selectedFloorNumbers, floor];
      const nextKeys = Array.from(new Set([...plannedLocationKeys, ...floorKeys]));
      onChangeSelectedFloors(nextFloors, nextKeys);
    }
  };

  const handleToggleUnit = (floor: number, unitName: string) => {
    if (!onChangePlannedLocationKeys) return;
    const targetKey = `floor_${floor}_unit_${unitName}`;
    const isSelected = plannedLocationKeys.includes(targetKey);

    if (isSelected) {
      onChangePlannedLocationKeys(plannedLocationKeys.filter((k) => k !== targetKey));
    } else {
      onChangePlannedLocationKeys([...plannedLocationKeys, targetKey]);
    }
  };

  const handleToggleSelectAllFloorUnits = (floor: number) => {
    if (!onChangePlannedLocationKeys) return;
    const floorKeys = getPlannedUnitNames(floor).map(
      (unitName) => `floor_${floor}_unit_${unitName}`,
    );
    const allUnitsSelected = floorKeys.every((k) => plannedLocationKeys.includes(k));

    if (allUnitsSelected) {
      onChangePlannedLocationKeys(
        plannedLocationKeys.filter((k) => !floorKeys.includes(k)),
      );
    } else {
      onChangePlannedLocationKeys(
        Array.from(new Set([...plannedLocationKeys, ...floorKeys])),
      );
    }
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim() || !onChangeScopeChecklist) return;
    onChangeScopeChecklist([...scopeChecklist, newChecklistText.trim()]);
    setNewChecklistText("");
  };

  const handleRemoveChecklistItem = (index: number) => {
    if (!onChangeScopeChecklist) return;
    onChangeScopeChecklist(scopeChecklist.filter((_, i) => i !== index));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/40 px-5"
          onPress={onClose}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            className="w-full max-w-[390px] max-h-[88%] self-center rounded-[20px] bg-white p-5 shadow-2xl"
          >
            <View className="mb-3 flex-row items-center justify-between border-b border-[#EDF2F7] pb-3">
              <View>
                <Text className="text-[17px] font-bold text-[#1F2937]">
                  Edit Service & Location Scope
                </Text>
                <Text className="mt-0.5 text-[12px] text-[#66707B]">
                  Configure task details and floor/unit assignment
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* Service Name */}
              <View className="mt-2">
                <Text className="mb-1.5 text-[12px] font-semibold text-[#475467]">
                  Service Name *
                </Text>
                <TextInput
                  value={title}
                  onChangeText={onChangeTitle}
                  placeholder="Service name"
                  placeholderTextColor="#98A2B3"
                  className="h-[44px] rounded-[12px] border border-[#D9E1E8] bg-[#F7F9FB] px-3.5 text-[14px] text-[#1F2937]"
                />
              </View>

              {/* Description */}
              <View className="mt-3">
                <Text className="mb-1.5 text-[12px] font-semibold text-[#475467]">
                  Description (Optional)
                </Text>
                <TextInput
                  value={description}
                  onChangeText={(val) => onChangeDescription && onChangeDescription(val)}
                  placeholder="Task details..."
                  placeholderTextColor="#98A2B3"
                  multiline
                  numberOfLines={2}
                  className="min-h-[50px] rounded-[12px] border border-[#D9E1E8] bg-[#F7F9FB] px-3.5 py-2 text-[13px] text-[#1F2937]"
                />
              </View>

              {/* Quantity & Unit in 2 columns */}
              <View className="mt-3 flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-1.5 text-[12px] font-semibold text-[#475467]">
                    Quantity
                  </Text>
                  <TextInput
                    value={quantity}
                    onChangeText={onChangeQuantity}
                    keyboardType="decimal-pad"
                    placeholder="1"
                    placeholderTextColor="#98A2B3"
                    className="h-[44px] rounded-[12px] border border-[#D9E1E8] bg-[#F7F9FB] px-3.5 text-[14px] text-[#1F2937]"
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-1.5 text-[12px] font-semibold text-[#475467]">
                    Unit
                  </Text>
                  <TextInput
                    value={unit}
                    onChangeText={onChangeUnit}
                    placeholder="pcs / sqft / each"
                    placeholderTextColor="#98A2B3"
                    className="h-[44px] rounded-[12px] border border-[#D9E1E8] bg-[#F7F9FB] px-3.5 text-[14px] text-[#1F2937]"
                  />
                </View>
              </View>

              {/* Unit Price & Hours in 2 columns */}
              <View className="mt-3 flex-row gap-3">
                {showFinancials ? <View className="flex-1">
                  <Text className="mb-1.5 text-[12px] font-semibold text-[#475467]">
                    Unit Price ($)
                  </Text>
                  <View className="h-[44px] flex-row items-center rounded-[12px] border border-[#D9E1E8] bg-[#F7F9FB] px-3.5">
                    <Text className="mr-1.5 text-[14px] text-[#98A2B3]">$</Text>
                    <TextInput
                      value={unitPrice}
                      onChangeText={onChangeUnitPrice}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#98A2B3"
                      className="flex-1 text-[14px] text-[#1F2937]"
                    />
                  </View>
                </View> : null}
                <View className="flex-1">
                  <Text className="mb-1.5 text-[12px] font-semibold text-[#475467]">
                    Hours / Unit
                  </Text>
                  <TextInput
                    value={estimatedHours}
                    onChangeText={(val) =>
                      onChangeEstimatedHours && onChangeEstimatedHours(val)
                    }
                    keyboardType="decimal-pad"
                    placeholder="e.g. 4"
                    placeholderTextColor="#98A2B3"
                    className="h-[44px] rounded-[12px] border border-[#D9E1E8] bg-[#F7F9FB] px-3.5 text-[14px] text-[#1F2937]"
                  />
                </View>
              </View>

              {/* Floors & Units Scoping Section */}
              {plannedFloorNumbers.length > 0 ? (
                <View className="mt-4 rounded-[14px] border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="business-outline" size={16} color="#1F5577" />
                      <Text className="text-[13px] font-bold text-[#1E293B]">
                        Floors & Units Assignment
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleToggleSelectAllFloors}
                      className="rounded-full bg-blue-50 px-2.5 py-1"
                    >
                      <Text className="text-[11px] font-bold text-[#1F5577]">
                        {areAllFloorsSelected ? "Deselect All" : "Select All Floors"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Floor chips */}
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {plannedFloorNumbers.map((floor) => {
                      const isSelected = selectedFloorNumbers.includes(floor);
                      return (
                        <TouchableOpacity
                          key={floor}
                          activeOpacity={0.8}
                          onPress={() => handleToggleFloor(floor)}
                          className={`rounded-full px-3 py-1.5 border ${
                            isSelected
                              ? "bg-[#1F5577] border-[#1F5577]"
                              : "bg-white border-[#CBD5E1]"
                          }`}
                        >
                          <Text
                            className={`text-[12px] font-semibold ${
                              isSelected ? "text-white" : "text-[#475569]"
                            }`}
                          >
                            Floor {floor}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Units for selected floors */}
                  {selectedFloorNumbers.map((floor) => {
                    const unitNames = getPlannedUnitNames(floor);
                    if (unitNames.length === 0) return null;
                    const allFloorUnitsSelected = unitNames.every((unitName) =>
                      plannedLocationKeys.includes(`floor_${floor}_unit_${unitName}`),
                    );

                    return (
                      <View
                        key={`units-floor-${floor}`}
                        className="mt-3 border-t border-[#E2E8F0] pt-2.5"
                      >
                        <View className="flex-row items-center justify-between">
                          <Text className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                            Floor {floor} Units
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleToggleSelectAllFloorUnits(floor)}
                          >
                            <Text className="text-[11px] font-bold text-[#1F5577]">
                              {allFloorUnitsSelected ? "Deselect All" : "Select All"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View className="mt-2 flex-row flex-wrap gap-1.5">
                          {unitNames.map((unitName) => {
                            const unitKey = `floor_${floor}_unit_${unitName}`;
                            const isUnitSelected = plannedLocationKeys.includes(unitKey);

                            return (
                              <TouchableOpacity
                                key={unitKey}
                                activeOpacity={0.8}
                                onPress={() => handleToggleUnit(floor, unitName)}
                                className={`rounded-lg px-2.5 py-1 border ${
                                  isUnitSelected
                                    ? "bg-blue-100 border-blue-400"
                                    : "bg-white border-[#CBD5E1]"
                                }`}
                              >
                                <Text
                                  className={`text-[11px] font-bold ${
                                    isUnitSelected ? "text-[#1F5577]" : "text-[#64748B]"
                                  }`}
                                >
                                  {unitName}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              {/* Subtasks / Checklist */}
              <View className="mt-4 rounded-[14px] border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="checkbox-outline" size={16} color="#1F5577" />
                  <Text className="text-[13px] font-bold text-[#1E293B]">
                    Scope Checklist / Subtasks
                  </Text>
                </View>

                {/* Input for adding new item */}
                <View className="mt-2.5 flex-row gap-2">
                  <TextInput
                    value={newChecklistText}
                    onChangeText={setNewChecklistText}
                    placeholder="Add subtask / step..."
                    placeholderTextColor="#98A2B3"
                    className="h-[38px] flex-1 rounded-[10px] border border-[#CBD5E1] bg-white px-3 text-[12px] text-[#1F2937]"
                  />
                  <TouchableOpacity
                    onPress={handleAddChecklistItem}
                    className="h-[38px] items-center justify-center rounded-[10px] bg-[#1F5577] px-3"
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Checklist items list */}
                {scopeChecklist.length > 0 ? (
                  <View className="mt-2 gap-1.5">
                    {scopeChecklist.map((item, index) => (
                      <View
                        key={index}
                        className="flex-row items-center justify-between rounded-lg bg-white px-3 py-1.5 border border-[#E2E8F0]"
                      >
                        <Text className="text-[12px] text-[#334155] flex-1 pr-2">
                          • {item}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveChecklistItem(index)}
                        >
                          <Ionicons name="close-circle" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>

              {/* Save & Cancel Buttons */}
              <View className="mt-5 flex-row gap-3">
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={onClose}
                  className="h-[44px] flex-1 items-center justify-center rounded-[12px] border border-[#D5DDE6] bg-white"
                >
                  <Text className="text-[14px] font-semibold text-[#344054]">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={onSave}
                  className="h-[44px] flex-1 items-center justify-center rounded-[12px] bg-[#1F5577]"
                >
                  <Text className="text-[14px] font-semibold text-white">
                    Save Changes
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
