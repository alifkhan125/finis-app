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
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { toast } from "sonner-native";
import QuoteChoiceCard from "./QuoteChoiceCard";
import QuoteField from "./QuoteField";
import QuoteSectionCard from "./QuoteSectionCard";
import type {
  QuoteProjectType,
  QuotePropertyType,
  QuoteUnitType,
} from "./quoteTypes";

type QuoteBuilderFormProps = {
  mode?: "project" | "building";
  companyName: string;
  companyId: string;
  isCompaniesLoading?: boolean;
  onOpenCompanyPicker: () => void;
  projectName: string;
  setProjectName: (value: string) => void;
  clientName: string;
  setClientName: (value: string) => void;
  defaultClientName?: string;
  projectAddress: string;
  setProjectAddress: (value: string) => void;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  defaultPhone?: string;
  email: string;
  setEmail: (value: string) => void;
  defaultEmail?: string;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  floorsCount: string;
  setFloorsCount: (value: string) => void;
  unitsPerFloor: string;
  setUnitsPerFloor: (value: string) => void;
  floorStart: string;
  setFloorStart: (value: string) => void;
  floorEnd: string;
  setFloorEnd: (value: string) => void;
  unitStart: string;
  setUnitStart: (value: string) => void;
  unitEnd: string;
  setUnitEnd: (value: string) => void;
  projectType: QuoteProjectType;
  setProjectType: (value: QuoteProjectType) => void;
  propertyType: QuotePropertyType;
  setPropertyType: (value: QuotePropertyType) => void;
  unitType: QuoteUnitType;
  setUnitType: (value: QuoteUnitType) => void;
  onNext: () => void;
  onBack?: () => void;
};

export default function QuoteBuilderForm({
  mode = "project",
  companyName,
  companyId,
  isCompaniesLoading = false,
  onOpenCompanyPicker,
  projectName,
  setProjectName,
  clientName,
  setClientName,
  projectAddress,
  setProjectAddress,
  phoneNumber,
  setPhoneNumber,
  email,
  setEmail,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  floorsCount,
  setFloorsCount,
  unitsPerFloor,
  setUnitsPerFloor,
  projectType,
  setProjectType,
  propertyType,
  setPropertyType,
  unitType,
  setUnitType,
  onNext,
  onBack,
}: QuoteBuilderFormProps) {
  const [fallbackPickerField, setFallbackPickerField] = useState<
    "start" | "end" | null
  >(null);

  // Building details state (dashboard-parity)
  const [buildingType, setBuildingType] = useState<string>(
    unitType === "House" ? "House" : "Apartment Building",
  );
  const [buildingTypeDropdownOpen, setBuildingTypeDropdownOpen] = useState(false);
  const [floorMode, setFloorMode] = useState<
    "Standard" | "Ground + Floors" | "Custom Labels"
  >("Standard");
  const [customFloorLabelsText, setCustomFloorLabelsText] = useState("");
  const [buildingModalOpen, setBuildingModalOpen] = useState(false);
  const [draftFloors, setDraftFloors] = useState(floorsCount || "4");
  const [draftCapacity, setDraftCapacity] = useState(unitsPerFloor || "6");
  const [draftFloorMode, setDraftFloorMode] = useState<
    "Standard" | "Ground + Floors" | "Custom Labels"
  >("Standard");
  const [floorModeDropdownOpen, setFloorModeDropdownOpen] = useState(false);
  const [draftCustomLabels, setDraftCustomLabels] = useState("");

  // Customize units modal state
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [selectedFloorForUnits, setSelectedFloorForUnits] = useState<
    number | null
  >(null);
  const [customUnitInput, setCustomUnitInput] = useState("");
  const [customFloorUnits, setCustomFloorUnits] = useState<
    Record<number, string[]>
  >({});

  // Computed floor list matching dashboard QuoteLibraryV2
  const computedFloors = useMemo(() => {
    const count = Math.max(0, parseInt(floorsCount, 10) || 0);
    const maxUnits = Math.max(0, parseInt(unitsPerFloor, 10) || 0);
    if (count === 0) return [];

    let labels: string[] = [];
    if (floorMode === "Custom Labels" && customFloorLabelsText.trim()) {
      labels = customFloorLabelsText
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);
    } else if (floorMode === "Ground + Floors") {
      labels = Array.from({ length: count }, (_, i) =>
        i === 0 ? "Ground Floor (G)" : `Floor ${i}`,
      );
    } else {
      labels = Array.from({ length: count }, (_, i) => `Floor ${i + 1}`);
    }

    return Array.from({ length: count }, (_, i) => {
      const floorNumber = i + 1;
      const label = labels[i] || `Floor ${floorNumber}`;

      let units: string[] = [];
      if (customFloorUnits[floorNumber] && customFloorUnits[floorNumber].length > 0) {
        units = customFloorUnits[floorNumber];
      } else {
        const numMatch = label.match(/\d+/);
        const prefix = numMatch ? numMatch[0] : String(floorNumber);
        units = Array.from({ length: maxUnits }, (_, uIdx) => {
          const suffix = String(uIdx + 1).padStart(2, "0");
          return `${prefix}${suffix}`;
        });
      }

      return {
        floorNumber,
        label,
        units,
      };
    });
  }, [floorsCount, unitsPerFloor, floorMode, customFloorLabelsText, customFloorUnits]);

  const totalFloors = computedFloors.length;
  const totalUnits = computedFloors.reduce(
    (total, floor) => total + floor.units.length,
    0,
  );

  const handlePickStartDate = () => {
    try {
      const initialDate =
        startDate && !isNaN(Date.parse(startDate))
          ? new Date(startDate)
          : new Date();
      if (Platform.OS === "android" && DateTimePickerAndroid?.open) {
        DateTimePickerAndroid.open({
          value: initialDate,
          mode: "date",
          onChange: (event, selectedDate) => {
            if (event.type === "set" && selectedDate) {
              const yyyy = selectedDate.getFullYear();
              const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
              const dd = String(selectedDate.getDate()).padStart(2, "0");
              setStartDate(`${yyyy}-${mm}-${dd}`);
            }
          },
        });
      } else {
        setFallbackPickerField("start");
      }
    } catch {
      setFallbackPickerField("start");
    }
  };

  const handlePickEndDate = () => {
    try {
      const initialDate =
        endDate && !isNaN(Date.parse(endDate)) ? new Date(endDate) : new Date();
      if (Platform.OS === "android" && DateTimePickerAndroid?.open) {
        DateTimePickerAndroid.open({
          value: initialDate,
          mode: "date",
          onChange: (event, selectedDate) => {
            if (event.type === "set" && selectedDate) {
              const yyyy = selectedDate.getFullYear();
              const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
              const dd = String(selectedDate.getDate()).padStart(2, "0");
              setEndDate(`${yyyy}-${mm}-${dd}`);
            }
          },
        });
      } else {
        setFallbackPickerField("end");
      }
    } catch {
      setFallbackPickerField("end");
    }
  };

  const handleOpenBuildingModal = () => {
    setDraftFloors(floorsCount || "4");
    setDraftCapacity(unitsPerFloor || "6");
    setDraftFloorMode(floorMode);
    setDraftCustomLabels(customFloorLabelsText);
    setFloorModeDropdownOpen(false);
    setBuildingModalOpen(true);
  };

  const handleSaveBuildingSetup = () => {
    const fCount = parseInt(draftFloors, 10);
    const uCount = parseInt(draftCapacity, 10);
    if (isNaN(fCount) || fCount < 1) {
      toast.error("Total floors must be at least 1");
      return;
    }
    if (isNaN(uCount) || uCount < 1) {
      toast.error("Maximum units per floor must be at least 1");
      return;
    }

    if (draftFloorMode === "Custom Labels") {
      const labels = draftCustomLabels
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);
      if (labels.length !== fCount) {
        toast.error(`Please provide exactly ${fCount} comma-separated floor labels.`);
        return;
      }
    }

    setFloorsCount(String(fCount));
    setUnitsPerFloor(String(uCount));
    setFloorMode(draftFloorMode);
    setCustomFloorLabelsText(draftCustomLabels);
    setBuildingModalOpen(false);
    toast.success("Building floors updated successfully!");
  };

  const handleOpenCustomizeUnits = (floorNumber: number | null) => {
    setSelectedFloorForUnits(floorNumber);
    if (floorNumber && customFloorUnits[floorNumber]) {
      setCustomUnitInput(customFloorUnits[floorNumber].join(", "));
    } else if (floorNumber) {
      const floorObj = computedFloors.find((f) => f.floorNumber === floorNumber);
      setCustomUnitInput(floorObj ? floorObj.units.join(", ") : "");
    } else {
      setCustomUnitInput("");
    }
    setUnitModalOpen(true);
  };

  const handleSaveCustomizeUnits = () => {
    const parsed = customUnitInput
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);

    if (parsed.length === 0) {
      toast.error("Please enter at least one unit label.");
      return;
    }

    if (selectedFloorForUnits) {
      setCustomFloorUnits((prev) => ({
        ...prev,
        [selectedFloorForUnits]: parsed,
      }));
    } else {
      // Apply to all floors
      const updated: Record<number, string[]> = {};
      computedFloors.forEach((f) => {
        updated[f.floorNumber] = parsed;
      });
      setCustomFloorUnits(updated);
    }

    setUnitModalOpen(false);
    toast.success("Units customized successfully!");
  };

  return (
    <>
      {mode === "project" ? (
        <>
          <QuoteSectionCard title="Client Information" icon="business-outline">
            <View className="mb-4">
              <Text className="mb-2 text-[14px] font-medium text-[#2B2B2B]">
                Under Company *
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onOpenCompanyPicker}
                className="min-h-[56px] flex-row items-center justify-between rounded-[14px] border border-[#D7E0E8] bg-white px-4"
              >
                <Text
                  className={`flex-1 text-[14px] ${
                    companyId ? "font-medium text-[#1F2937]" : "text-[#8A97A8]"
                  }`}
                  numberOfLines={1}
                >
                  {isCompaniesLoading
                    ? "Loading companies..."
                    : companyName || "Select company"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <QuoteField
              label="Project Name *"
              placeholder="Enter project name"
              value={projectName}
              onChangeText={setProjectName}
            />
            <QuoteField
              label="Client Name *"
              placeholder="Enter client name"
              value={clientName}
              onChangeText={setClientName}
            />
            <QuoteField
              label="Project Address *"
              placeholder="Enter full project address"
              value={projectAddress}
              onChangeText={setProjectAddress}
              leftIcon="location-outline"
            />
            <QuoteField
              label="Phone Number"
              placeholder="Enter phone number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
            <QuoteField
              label="Email"
              placeholder="Enter email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
          </QuoteSectionCard>

          <QuoteSectionCard title="Project Details" icon="home-outline">
            <Text className="mb-3 text-[14px] font-medium text-[#2B2B2B]">
              Project Type *
            </Text>
            <View className="mb-5 flex-row gap-3">
              <QuoteChoiceCard
                label="New Build"
                selected={projectType === "New Build"}
                onPress={() => setProjectType("New Build")}
              />
              <QuoteChoiceCard
                label="Renovations"
                selected={projectType === "Renovations"}
                onPress={() => setProjectType("Renovations")}
              />
            </View>

            <Text className="mb-3 text-[14px] font-medium text-[#2B2B2B]">
              Property Type *
            </Text>
            <View className="mb-5 flex-row gap-3">
              <QuoteChoiceCard
                label="Residential"
                selected={propertyType === "Residential"}
                onPress={() => setPropertyType("Residential")}
              />
              <QuoteChoiceCard
                label="Commercial"
                selected={propertyType === "Commercial"}
                onPress={() => setPropertyType("Commercial")}
              />
            </View>
          </QuoteSectionCard>
        </>
      ) : (
        <>
          {/* Dashboard-Parity Information Banner */}
          <View className="mt-3 flex-row items-start gap-3 rounded-[16px] border border-[#93C5FD] border-l-[4px] border-l-[#2563EB] bg-[#EFF6FF] p-4 shadow-sm">
            <Ionicons
              name="information-circle"
              size={22}
              color="#2563EB"
              style={{ marginTop: 1 }}
            />
            <Text className="flex-1 text-[13px] leading-5 text-[#1E40AF]">
              Add the full building layout for this project, including all floors
              and units. In the next step, Workable Area, you can select the
              floors and units where work will take place.
            </Text>
          </View>

          {/* Building Details Section */}
          <QuoteSectionCard title="Building details" icon="business-outline">
            <Text className="mb-2 text-[13px] font-semibold text-[#374151]">
              Building Type *
            </Text>
            <View className="relative">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setBuildingTypeDropdownOpen(!buildingTypeDropdownOpen)}
                className="h-[52px] flex-row items-center justify-between rounded-[14px] border border-[#D7E0E8] bg-[#F8FAFC] px-4"
              >
                <View className="flex-row items-center gap-2.5">
                  <Ionicons name="business-outline" size={18} color="#1F5577" />
                  <Text className="text-[14px] font-medium text-[#1F2937]">
                    {buildingType || "Select Building Type"}
                  </Text>
                </View>
                <Ionicons
                  name={buildingTypeDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#64748B"
                />
              </TouchableOpacity>

              {buildingTypeDropdownOpen && (
                <View className="mt-2 rounded-[14px] border border-[#E2E8F0] bg-white p-1.5 shadow-lg">
                  {[
                    { label: "Apartment Building", isHouse: false },
                    { label: "Office Building", isHouse: false },
                    { label: "House", isHouse: true },
                    { label: "Other", isHouse: false },
                  ].map((item) => {
                    const isSelected = buildingType === item.label;
                    return (
                      <TouchableOpacity
                        key={item.label}
                        activeOpacity={0.8}
                        onPress={() => {
                          setBuildingType(item.label);
                          setUnitType(item.isHouse ? "House" : "Apartment");
                          setBuildingTypeDropdownOpen(false);
                        }}
                        className={`flex-row items-center justify-between rounded-[10px] px-3.5 py-3 ${
                          isSelected ? "bg-[#F0F7FA]" : "bg-white"
                        }`}
                      >
                        <Text
                          className={`text-[13px] ${
                            isSelected
                              ? "font-bold text-[#1F5577]"
                              : "font-medium text-[#334155]"
                          }`}
                        >
                          {item.label}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark" size={17} color="#1F5577" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Dates */}
            <View className="mt-5 flex-row gap-3">
              <View className="flex-1">
                <QuoteField
                  label="Start Date"
                  placeholder="YYYY-MM-DD"
                  value={startDate}
                  onChangeText={setStartDate}
                  rightIcon="calendar-outline"
                  onPress={handlePickStartDate}
                  onPressRightIcon={handlePickStartDate}
                />
              </View>
              <View className="flex-1">
                <QuoteField
                  label="End Date"
                  placeholder="YYYY-MM-DD"
                  value={endDate}
                  onChangeText={setEndDate}
                  rightIcon="calendar-outline"
                  onPress={handlePickEndDate}
                  onPressRightIcon={handlePickEndDate}
                />
              </View>
            </View>
          </QuoteSectionCard>

          {/* Building Totals KPI Cards (Grid) */}
          <View className="mt-4 flex-row gap-3">
            <View className="flex-1 rounded-[16px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="business-outline" size={17} color="#64748B" />
                <Text className="text-[12px] font-medium text-[#64748B]">
                  Total Floors
                </Text>
              </View>
              <Text className="mt-2 text-[26px] font-bold text-[#1F2937]">
                {totalFloors}
              </Text>
            </View>

            <View className="flex-1 rounded-[16px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="layers-outline" size={17} color="#64748B" />
                <Text className="text-[12px] font-medium text-[#64748B]">
                  Total Units
                </Text>
              </View>
              <Text className="mt-2 text-[26px] font-bold text-[#1F2937]">
                {totalUnits}
              </Text>
            </View>
          </View>

          {/* Building Setup Card */}
          <QuoteSectionCard
            title="Building setup"
            icon="construct-outline"
            action={
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleOpenBuildingModal}
                className="h-[36px] flex-row items-center justify-center rounded-[10px] bg-[#1F5577] px-3.5 shadow-sm"
              >
                <Ionicons
                  name={totalFloors > 0 ? "pencil-outline" : "add"}
                  size={15}
                  color="#FFFFFF"
                  style={{ marginRight: 4 }}
                />
                <Text className="text-[13px] font-semibold text-white">
                  {totalFloors > 0 ? "Edit Floors" : "Add Floors"}
                </Text>
              </TouchableOpacity>
            }
          >
            {computedFloors.length > 0 ? (
              <View className="flex-row flex-wrap gap-2 pt-1">
                {computedFloors.map((floor) => (
                  <View
                    key={floor.floorNumber}
                    className="flex-row items-center gap-1.5 rounded-full border border-[#BAE6FD] bg-[#F0F9FF] px-3.5 py-1.5"
                  >
                    <Ionicons name="business-outline" size={14} color="#0369A1" />
                    <Text className="text-[13px] font-medium text-[#0369A1]">
                      {floor.label}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleOpenBuildingModal}
                className="items-center justify-center rounded-[14px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] py-6"
              >
                <Ionicons name="business-outline" size={26} color="#94A3B8" />
                <Text className="mt-2 text-[13px] font-medium text-[#64748B]">
                  No floors added yet. Tap Add Floors to set up layout.
                </Text>
              </TouchableOpacity>
            )}
          </QuoteSectionCard>

          {/* Floor Units Card */}
          {computedFloors.length > 0 && (
            <QuoteSectionCard
              title="Floor units"
              icon="layers-outline"
              action={
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleOpenCustomizeUnits(null)}
                  className="h-[34px] flex-row items-center justify-center rounded-[10px] border border-[#1F5577] bg-white px-3"
                >
                  <Text className="text-[12px] font-semibold text-[#1F5577]">
                    Customize All
                  </Text>
                </TouchableOpacity>
              }
            >
              <View className="divide-y divide-[#F1F5F9]">
                {computedFloors.map((floor) => (
                  <View
                    key={floor.floorNumber}
                    className="py-3 first:pt-1 last:pb-1"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[14px] font-bold text-[#1F2937]">
                        {floor.label}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleOpenCustomizeUnits(floor.floorNumber)}
                        className="rounded-[8px] bg-[#F1F5F9] px-2.5 py-1"
                      >
                        <Text className="text-[11px] font-medium text-[#1F5577]">
                          Customize
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View className="mt-2 flex-row flex-wrap gap-1.5">
                      {floor.units.map((unit) => (
                        <View
                          key={unit}
                          className="rounded-full border border-[#E0F2FE] bg-[#F0F9FF] px-2.5 py-1"
                        >
                          <Text className="text-[12px] font-semibold text-[#0369A1]">
                            {unit}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </QuoteSectionCard>
          )}

          {/* Add / Edit Floors Modal */}
          <Modal
            visible={buildingModalOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setBuildingModalOpen(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              className="flex-1 items-center justify-center bg-black/50 p-4"
            >
              <View className="w-full max-w-[480px] rounded-[24px] bg-white p-6 shadow-2xl">
                <View className="mb-5 flex-row items-center justify-between border-b border-[#F1F5F9] pb-4">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="business" size={20} color="#1F5577" />
                    <Text className="text-[17px] font-bold text-[#1F2937]">
                      {totalFloors > 0 ? "Edit Floors" : "Create Floors"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setBuildingModalOpen(false)}
                    className="h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9]"
                  >
                    <Ionicons name="close" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <View className="mb-4">
                    <Text className="mb-1.5 text-[13px] font-semibold text-[#374151]">
                      Total Floors
                    </Text>
                    <TextInput
                      keyboardType="number-pad"
                      value={draftFloors}
                      onChangeText={setDraftFloors}
                      placeholder="e.g. 4"
                      className="h-[48px] rounded-[12px] border border-[#D1D5DB] bg-[#F9FAFB] px-3.5 text-[14px] text-[#1F2937]"
                    />
                  </View>

                  <View className="mb-4">
                    <Text className="mb-1.5 text-[13px] font-semibold text-[#374151]">
                      Maximum Units per Floor
                    </Text>
                    <TextInput
                      keyboardType="number-pad"
                      value={draftCapacity}
                      onChangeText={setDraftCapacity}
                      placeholder="e.g. 6"
                      className="h-[48px] rounded-[12px] border border-[#D1D5DB] bg-[#F9FAFB] px-3.5 text-[14px] text-[#1F2937]"
                    />
                  </View>

                  <View className="mb-4 relative">
                    <Text className="mb-1.5 text-[13px] font-semibold text-[#374151]">
                      Floor Labels Mode
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setFloorModeDropdownOpen(!floorModeDropdownOpen)}
                      className="h-[48px] flex-row items-center justify-between rounded-[12px] border border-[#D1D5DB] bg-[#F9FAFB] px-3.5"
                    >
                      <Text className="text-[14px] font-medium text-[#1F2937]">
                        {draftFloorMode}
                      </Text>
                      <Ionicons
                        name={floorModeDropdownOpen ? "chevron-up" : "chevron-down"}
                        size={18}
                        color="#64748B"
                      />
                    </TouchableOpacity>

                    {floorModeDropdownOpen && (
                      <View className="mt-1.5 rounded-[12px] border border-[#E2E8F0] bg-white p-1.5 shadow-lg">
                        {[
                          "Standard",
                          "Ground + Floors",
                          "Custom Labels",
                        ].map((modeOption) => {
                          const isSelected = draftFloorMode === modeOption;
                          return (
                            <TouchableOpacity
                              key={modeOption}
                              activeOpacity={0.8}
                              onPress={() => {
                                setDraftFloorMode(modeOption as any);
                                setFloorModeDropdownOpen(false);
                              }}
                              className={`flex-row items-center justify-between rounded-[8px] px-3 py-2.5 ${
                                isSelected ? "bg-[#F0F7FA]" : "bg-white"
                              }`}
                            >
                              <Text
                                className={`text-[13px] ${
                                  isSelected
                                    ? "font-bold text-[#1F5577]"
                                    : "font-medium text-[#334155]"
                                }`}
                              >
                                {modeOption}
                              </Text>
                              {isSelected && (
                                <Ionicons name="checkmark" size={16} color="#1F5577" />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>

                  {draftFloorMode === "Custom Labels" && (
                    <View className="mb-4">
                      <Text className="mb-1.5 text-[13px] font-semibold text-[#374151]">
                        Custom Floor Labels (comma-separated)
                      </Text>
                      <TextInput
                        value={draftCustomLabels}
                        onChangeText={setDraftCustomLabels}
                        placeholder="e.g. B1, Ground, Floor 1, PH"
                        placeholderTextColor="#94A3B8"
                        className="min-h-[48px] rounded-[12px] border border-[#D1D5DB] bg-[#F9FAFB] px-3.5 py-2.5 text-[14px] text-[#1F2937]"
                      />
                      <Text className="mt-1 text-[11px] text-[#64748B]">
                        Provide exactly {draftFloors || "N"} labels separated by
                        commas.
                      </Text>
                    </View>
                  )}
                </ScrollView>

                <View className="mt-4 flex-row gap-3 pt-3 border-t border-[#F1F5F9]">
                  <TouchableOpacity
                    onPress={() => setBuildingModalOpen(false)}
                    className="h-[48px] flex-1 items-center justify-center rounded-[12px] border border-[#CBD5E1] bg-white"
                  >
                    <Text className="font-semibold text-[#475569]">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveBuildingSetup}
                    className="h-[48px] flex-1 items-center justify-center rounded-[12px] bg-[#1F5577]"
                  >
                    <Text className="font-semibold text-white">Save Floors</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* Customize Units Modal */}
          <Modal
            visible={unitModalOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setUnitModalOpen(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              className="flex-1 items-center justify-center bg-black/50 p-4"
            >
              <View className="w-full max-w-[480px] rounded-[24px] bg-white p-6 shadow-2xl">
                <View className="mb-4 flex-row items-center justify-between border-b border-[#F1F5F9] pb-4">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="layers" size={20} color="#1F5577" />
                    <Text className="text-[17px] font-bold text-[#1F2937]">
                      {selectedFloorForUnits
                        ? `Customize Floor ${selectedFloorForUnits} Units`
                        : "Customize All Units"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setUnitModalOpen(false)}
                    className="h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9]"
                  >
                    <Ionicons name="close" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <Text className="mb-2 text-[13px] leading-5 text-[#64748B]">
                  Enter comma-separated unit labels for this layout (e.g. 101,
                  102, 103, 104, PH):
                </Text>

                <TextInput
                  value={customUnitInput}
                  onChangeText={setCustomUnitInput}
                  placeholder="e.g. 101, 102, 103, 104"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  className="min-h-[80px] rounded-[14px] border border-[#CBD5E1] bg-[#F8FAFC] p-3 text-[14px] leading-5 text-[#1F2937]"
                />

                <View className="mt-5 flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => setUnitModalOpen(false)}
                    className="h-[48px] flex-1 items-center justify-center rounded-[12px] border border-[#CBD5E1] bg-white"
                  >
                    <Text className="font-semibold text-[#475569]">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveCustomizeUnits}
                    className="h-[48px] flex-1 items-center justify-center rounded-[12px] bg-[#1F5577]"
                  >
                    <Text className="font-semibold text-white">Save Units</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </>
      )}

      {fallbackPickerField && (
        <DateTimePicker
          value={
            fallbackPickerField === "start"
              ? startDate && !isNaN(Date.parse(startDate))
                ? new Date(startDate)
                : new Date()
              : endDate && !isNaN(Date.parse(endDate))
                ? new Date(endDate)
                : new Date()
          }
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            const currentField = fallbackPickerField;
            setFallbackPickerField(null);
            if (event.type === "set" && selectedDate) {
              const yyyy = selectedDate.getFullYear();
              const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
              const dd = String(selectedDate.getDate()).padStart(2, "0");
              if (currentField === "start") {
                setStartDate(`${yyyy}-${mm}-${dd}`);
              } else {
                setEndDate(`${yyyy}-${mm}-${dd}`);
              }
            }
          }}
        />
      )}

      <View className="mt-5 flex-row gap-3">
        {onBack ? (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onBack}
            className="h-[56px] flex-1 items-center justify-center rounded-[14px] border border-[#CBD5E1] bg-white"
          >
            <Text className="text-[16px] font-medium text-[#475569]">Back</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onNext}
          className="h-[56px] flex-1 items-center justify-center rounded-[14px] bg-[#1F5577]"
        >
          <Text className="text-[16px] font-medium text-white">Next</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
