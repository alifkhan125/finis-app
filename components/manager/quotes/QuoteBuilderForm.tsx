import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import QuoteChoiceCard from "./QuoteChoiceCard";
import QuoteField from "./QuoteField";
import QuoteSectionCard from "./QuoteSectionCard";
import type {
  QuoteProjectType,
  QuotePropertyType,
  QuoteUnitType,
} from "./quoteTypes";

type QuoteBuilderFormProps = {
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
  estimatedTime: string;
  setEstimatedTime: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  floorsCount: string;
  setFloorsCount: (value: string) => void;
  unitsPerFloor: string;
  setUnitsPerFloor: (value: string) => void;
  projectType: QuoteProjectType;
  setProjectType: (value: QuoteProjectType) => void;
  propertyType: QuotePropertyType;
  setPropertyType: (value: QuotePropertyType) => void;
  unitType: QuoteUnitType;
  setUnitType: (value: QuoteUnitType) => void;
  onNext: () => void;
};

export default function QuoteBuilderForm({
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
  estimatedTime,
  setEstimatedTime,
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
}: QuoteBuilderFormProps) {
  const [fallbackPickerField, setFallbackPickerField] = React.useState<"start" | "end" | null>(null);

  const handlePickStartDate = () => {
    try {
      const initialDate = startDate && !isNaN(Date.parse(startDate)) ? new Date(startDate) : new Date();
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
      const initialDate = endDate && !isNaN(Date.parse(endDate)) ? new Date(endDate) : new Date();
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

  return (
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
        <QuoteField
          label="Estimated Hours"
          placeholder="Enter estimated hours (e.g. 40)"
          value={estimatedTime}
          onChangeText={setEstimatedTime}
          keyboardType="numeric"
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

        <Text className="mb-3 text-[14px] font-medium text-[#2B2B2B]">
          Unit Type *
        </Text>
        <View className="flex-row gap-3">
          <View className="w-[48%]">
            <QuoteChoiceCard
              label="Apartment"
              selected={unitType === "Apartment"}
              onPress={() => setUnitType("Apartment")}
            />
          </View>
          <View className="w-[48%]">
            <QuoteChoiceCard
              label="House"
              selected={unitType === "House"}
              onPress={() => setUnitType("House")}
            />
          </View>
        </View>

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

        <View className="flex-row gap-3">
          <View className="flex-1">
            <QuoteField
              label="Floors Count"
              placeholder="Enter floors count (e.g. 3)"
              value={floorsCount}
              onChangeText={setFloorsCount}
              keyboardType="number-pad"
            />
          </View>
          <View className="flex-1">
            <QuoteField
              label="Units Per Floor"
              placeholder="Enter units per floor (e.g. 4)"
              value={unitsPerFloor}
              onChangeText={setUnitsPerFloor}
              keyboardType="number-pad"
            />
          </View>
        </View>
      </QuoteSectionCard>

      {fallbackPickerField && (
        <DateTimePicker
          value={
            fallbackPickerField === "start"
              ? startDate && !isNaN(Date.parse(startDate)) ? new Date(startDate) : new Date()
              : endDate && !isNaN(Date.parse(endDate)) ? new Date(endDate) : new Date()
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

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onNext}
        className="mt-5 h-[56px] items-center justify-center rounded-[14px] bg-[#1F5577]"
      >
        <Text className="text-[16px] font-medium text-white">Next</Text>
      </TouchableOpacity>
    </>
  );
}
