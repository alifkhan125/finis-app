import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "sonner-native";

export type WorkItemTemplateSuggestion = {
  id: string;
  name: string;
  category?: { id: string; name: string } | null;
  measurementType?: string | null;
  unitCost?: number | null;
  estimatedHours?: number | null;
};

type AddCustomQuoteItemModalProps = {
  visible: boolean;
  plannedFloorNumbers?: number[];
  getPlannedUnitNames?: (floor: number) => string[];
  workItemSuggestions?: WorkItemTemplateSuggestion[];
  onClose: () => void;
  showFinancials?: boolean;
  onAddService: (service: {
    title: string;
    description: string;
    estimatedHours: string;
    unitPrice: string;
    unit: string;
    allowSubtasks: boolean;
    selectedFloorNumbers: number[];
    plannedLocationKeys: string[];
    quantity: number;
    subtotal: number;
  }) => void;
};

export default function AddCustomQuoteItemModal({
  visible,
  plannedFloorNumbers = [],
  getPlannedUnitNames = () => [],
  workItemSuggestions = [],
  onClose,
  onAddService,
  showFinancials = true,
}: AddCustomQuoteItemModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hoursPerUnit, setHoursPerUnit] = useState("");
  const [internalPrice, setInternalPrice] = useState("");
  const [allowSubtasks, setAllowSubtasks] = useState(false);
  const [selectedFloorNumbers, setSelectedFloorNumbers] = useState<number[]>([]);
  const [plannedLocationKeys, setPlannedLocationKeys] = useState<string[]>([]);

  // Reset form when modal opens or closes
  const handleReset = () => {
    setSelectedTemplateId("");
    setTemplateDropdownOpen(false);
    setTaskTitle("");
    setDescription("");
    setHoursPerUnit("");
    setInternalPrice("");
    setAllowSubtasks(false);
    setSelectedFloorNumbers([]);
    setPlannedLocationKeys([]);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const allFloorUnitKeys = useMemo(
    () =>
      plannedFloorNumbers.flatMap((floor) =>
        getPlannedUnitNames(floor).map(
          (unitName) => `floor_${floor}_unit_${unitName}`,
        ),
      ),
    [plannedFloorNumbers, getPlannedUnitNames],
  );

  const areAllFloorsSelected =
    plannedFloorNumbers.length > 0 &&
    plannedFloorNumbers.every((floor) => selectedFloorNumbers.includes(floor)) &&
    allFloorUnitKeys.every((key) => plannedLocationKeys.includes(key));

  const handleToggleSelectAllFloors = () => {
    if (areAllFloorsSelected) {
      setSelectedFloorNumbers([]);
      setPlannedLocationKeys([]);
    } else {
      setSelectedFloorNumbers([...plannedFloorNumbers]);
      setPlannedLocationKeys([...allFloorUnitKeys]);
    }
  };

  const handleToggleFloor = (floor: number) => {
    const isSelected = selectedFloorNumbers.includes(floor);
    const floorKeys = getPlannedUnitNames(floor).map(
      (unitName) => `floor_${floor}_unit_${unitName}`,
    );

    if (isSelected) {
      setSelectedFloorNumbers(selectedFloorNumbers.filter((f) => f !== floor));
      setPlannedLocationKeys(
        plannedLocationKeys.filter((k) => !floorKeys.includes(k)),
      );
    } else {
      setSelectedFloorNumbers([...selectedFloorNumbers, floor]);
      setPlannedLocationKeys(
        Array.from(new Set([...plannedLocationKeys, ...floorKeys])),
      );
    }
  };

  const handleToggleUnit = (floor: number, unitName: string) => {
    const targetKey = `floor_${floor}_unit_${unitName}`;
    const isSelected = plannedLocationKeys.includes(targetKey);

    if (isSelected) {
      setPlannedLocationKeys(plannedLocationKeys.filter((k) => k !== targetKey));
    } else {
      setPlannedLocationKeys([...plannedLocationKeys, targetKey]);
    }
  };

  const handleToggleSelectAllFloorUnits = (floor: number) => {
    const floorKeys = getPlannedUnitNames(floor).map(
      (unitName) => `floor_${floor}_unit_${unitName}`,
    );
    const allUnitsSelected = floorKeys.every((k) =>
      plannedLocationKeys.includes(k),
    );

    if (allUnitsSelected) {
      setPlannedLocationKeys(
        plannedLocationKeys.filter((k) => !floorKeys.includes(k)),
      );
    } else {
      setPlannedLocationKeys(
        Array.from(new Set([...plannedLocationKeys, ...floorKeys])),
      );
    }
  };

  const handleSelectTemplate = (template: WorkItemTemplateSuggestion | null) => {
    if (!template) {
      setSelectedTemplateId("");
      setTemplateDropdownOpen(false);
      return;
    }
    setSelectedTemplateId(template.id);
    setTaskTitle(template.name);
    if (showFinancials && template.unitCost) {
      setInternalPrice(String(template.unitCost));
    }
    if (template.estimatedHours) {
      setHoursPerUnit(String(template.estimatedHours));
    }
    setTemplateDropdownOpen(false);
  };

  // Subtotal Calculation matching dashboard exactly:
  // price * (selectedLocationKeys.length || 1)
  const priceNumber = Number(internalPrice) || 0;
  const locationCount = plannedLocationKeys.length || 1;
  const subtotalNumber = priceNumber * locationCount;

  const handleAdd = () => {
    if (!taskTitle.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    onAddService({
      title: taskTitle.trim(),
      description: description.trim(),
      estimatedHours: hoursPerUnit.trim(),
      unitPrice: String(priceNumber),
      unit: "each",
      allowSubtasks,
      selectedFloorNumbers,
      plannedLocationKeys,
      quantity: locationCount,
      subtotal: subtotalNumber,
    });

    handleClose();
  };

  const selectedTemplate = workItemSuggestions.find(
    (t) => t.id === selectedTemplateId,
  );

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-4">
          {/* Backdrop dismiss */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleClose}
            className="absolute inset-0"
          />

          <View className="w-full max-w-[420px] max-h-[85%] rounded-[24px] bg-white p-6 shadow-2xl">
            {/* Header: ADD SERVICE with [X] */}
            <View className="flex-row items-center justify-between border-b border-[#F1F5F9] pb-4">
              <Text className="text-[19px] font-black tracking-tight text-[#111827]">
                ADD SERVICE
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              className="mt-4"
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {/* Field 1: SELECT TEMPLATE (OPTIONAL) */}
              <View className="mb-4">
                <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  SELECT TEMPLATE (OPTIONAL)
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setTemplateDropdownOpen(!templateDropdownOpen)}
                  className="h-[46px] flex-row items-center justify-between rounded-[12px] border border-[#D1D5DB] bg-[#FAFAFA] px-3.5"
                >
                  <Text
                    numberOfLines={1}
                    className="flex-1 text-[13px] text-[#374151]"
                  >
                    {selectedTemplate
                      ? `${selectedTemplate.name}${
                          showFinancials && selectedTemplate.unitCost
                            ? ` ($${Number(selectedTemplate.unitCost).toFixed(2)})`
                            : ""
                        }`
                      : "-- Custom Service (Type Manually) --"}
                  </Text>
                  <Ionicons
                    name={templateDropdownOpen ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#6B7280"
                  />
                </TouchableOpacity>

                {/* Dropdown Options */}
                {templateDropdownOpen && (
                  <View className="mt-1.5 max-h-[160px] rounded-[12px] border border-[#E5E7EB] bg-white shadow-lg">
                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      <TouchableOpacity
                        onPress={() => handleSelectTemplate(null)}
                        className="border-b border-[#F3F4F6] px-3.5 py-2.5"
                      >
                        <Text className="text-[13px] font-semibold text-[#1F5577]">
                          -- Custom Service (Type Manually) --
                        </Text>
                      </TouchableOpacity>
                      {workItemSuggestions.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => handleSelectTemplate(item)}
                          className="border-b border-[#F3F4F6] px-3.5 py-2.5"
                        >
                          <Text className="text-[13px] text-[#374151]">
                            {item.name}
                            {showFinancials && item.unitCost ? ` ($${Number(item.unitCost).toFixed(2)})` : ""}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Field 2: TASK TITLE */}
              <View className="mb-4">
                <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  TASK TITLE
                </Text>
                <TextInput
                  value={taskTitle}
                  onChangeText={(val) => {
                    setSelectedTemplateId("");
                    setTaskTitle(val);
                  }}
                  placeholder="e.g. Install Kitchen Cabinets"
                  placeholderTextColor="#9CA3AF"
                  className="h-[46px] rounded-[12px] border border-[#D1D5DB] bg-white px-3.5 text-[14px] text-[#111827]"
                />
              </View>

              {/* Field 3: DESCRIPTION */}
              <View className="mb-4">
                <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  DESCRIPTION
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Task details..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  className="min-h-[75px] rounded-[12px] border border-[#D1D5DB] bg-white px-3.5 py-2.5 text-[13px] text-[#111827]"
                  textAlignVertical="top"
                />
              </View>

              {/* Field 4 & 5: HOURS / UNIT & INTERNAL PRICE */}
              <View className="mb-4 flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    HOURS / UNIT
                  </Text>
                  <TextInput
                    value={hoursPerUnit}
                    onChangeText={setHoursPerUnit}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 4"
                    placeholderTextColor="#9CA3AF"
                    className="h-[46px] rounded-[12px] border border-[#D1D5DB] bg-white px-3.5 text-[14px] text-[#111827]"
                  />
                </View>
                {showFinancials ? <View className="flex-1">
                  <Text className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    INTERNAL PRICE
                  </Text>
                  <TextInput
                    value={internalPrice}
                    onChangeText={setInternalPrice}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 150"
                    placeholderTextColor="#9CA3AF"
                    className="h-[46px] rounded-[12px] border border-[#D1D5DB] bg-white px-3.5 text-[14px] text-[#111827]"
                  />
                </View> : null}
              </View>

              {/* Card 6: SUBTOTAL */}
              {showFinancials ? <View className="mb-4 rounded-[14px] border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[11px] font-black uppercase tracking-wider text-[#6B7280]">
                    SUBTOTAL
                  </Text>
                  <Text className="text-[17px] font-black text-[#111827]">
                    ${subtotalNumber.toFixed(2)}
                  </Text>
                </View>
                <Text className="mt-0.5 text-[12px] text-[#6B7280]">
                  Per selected floor/unit: ${priceNumber.toFixed(2)} x {locationCount}
                </Text>
              </View> : null}

              {/* Checkbox 7: Allow Subtasks */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setAllowSubtasks(!allowSubtasks)}
                className="mb-4 flex-row items-center gap-2.5"
              >
                <View
                  className={`h-5 w-5 items-center justify-center rounded-[6px] border ${
                    allowSubtasks
                      ? "border-[#1F5577] bg-[#1F5577]"
                      : "border-[#9CA3AF] bg-white"
                  }`}
                >
                  {allowSubtasks && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
                <Text className="text-[13px] font-medium text-[#374151]">
                  Allow Subtasks
                </Text>
              </TouchableOpacity>

              {/* Section 8: FLOORS / SECTIONS */}
              {plannedFloorNumbers.length > 0 && (
                <View className="mb-4 rounded-[16px] border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[11px] font-black uppercase tracking-wider text-[#6B7280]">
                      FLOORS / SECTIONS
                    </Text>
                    <TouchableOpacity onPress={handleToggleSelectAllFloors}>
                      <Text className="text-[12px] font-bold text-[#2563EB]">
                        {areAllFloorsSelected ? "Deselect All" : "Select All"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Floor pills */}
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {plannedFloorNumbers.map((floor) => {
                      const isSelected = selectedFloorNumbers.includes(floor);
                      return (
                        <TouchableOpacity
                          key={floor}
                          activeOpacity={0.8}
                          onPress={() => handleToggleFloor(floor)}
                          className={`rounded-full px-3.5 py-1.5 border ${
                            isSelected
                              ? "bg-[#DBEAFE] border-[#93C5FD]"
                              : "bg-white border-[#E5E7EB]"
                          }`}
                        >
                          <Text
                            className={`text-[12px] font-semibold ${
                              isSelected ? "text-[#1D4ED8]" : "text-[#4B5563]"
                            }`}
                          >
                            Floor {floor}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Units under selected floors */}
                  {selectedFloorNumbers.map((floor) => {
                    const unitNames = getPlannedUnitNames(floor);
                    if (unitNames.length === 0) return null;
                    const allFloorUnitsSelected = unitNames.every((unitName) =>
                      plannedLocationKeys.includes(`floor_${floor}_unit_${unitName}`),
                    );

                    return (
                      <View
                        key={`units-floor-${floor}`}
                        className="mt-3 border-t border-[#E5E7EB] pt-3"
                      >
                        <View className="flex-row items-center justify-between">
                          <Text className="text-[11px] font-black uppercase tracking-wider text-[#6B7280]">
                            Floor {floor} Units / Rooms
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleToggleSelectAllFloorUnits(floor)}
                          >
                            <Text className="text-[11px] font-bold text-[#2563EB]">
                              {allFloorUnitsSelected ? "Deselect All" : "Select All"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View className="mt-2 flex-row flex-wrap gap-1.5">
                          {unitNames.map((unitName) => {
                            const unitKey = `floor_${floor}_unit_${unitName}`;
                            const isUnitSelected =
                              plannedLocationKeys.includes(unitKey);

                            return (
                              <TouchableOpacity
                                key={unitKey}
                                activeOpacity={0.8}
                                onPress={() => handleToggleUnit(floor, unitName)}
                                className={`rounded-full px-3 py-1 border ${
                                  isUnitSelected
                                    ? "bg-[#DBEAFE] border-[#93C5FD]"
                                    : "bg-white border-[#E5E7EB]"
                                }`}
                              >
                                <Text
                                  className={`text-[11px] font-semibold ${
                                    isUnitSelected
                                      ? "text-[#1D4ED8]"
                                      : "text-[#4B5563]"
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
              )}

              {/* Action Buttons: Cancel and Add Service */}
              <View className="mt-5 flex-row gap-3 pb-2">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleClose}
                  className="h-[48px] flex-1 items-center justify-center rounded-[12px] border border-[#D1D5DB] bg-white"
                >
                  <Text className="text-[14px] font-semibold text-[#374151]">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleAdd}
                  className={`h-[48px] flex-1 items-center justify-center rounded-[12px] shadow-sm ${
                    taskTitle.trim()
                      ? "bg-[#1F5577] active:bg-[#153D57]"
                      : "bg-[#CBD5E1]"
                  }`}
                >
                  <Text className="text-[14px] font-bold text-white">
                    Add Service
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
