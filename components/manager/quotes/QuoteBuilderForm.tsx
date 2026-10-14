import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  defaultClientName: string;
  projectAddress: string;
  setProjectAddress: (value: string) => void;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  defaultPhone: string;
  email: string;
  setEmail: (value: string) => void;
  defaultEmail: string;
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
  defaultClientName,
  projectAddress,
  setProjectAddress,
  phoneNumber,
  setPhoneNumber,
  defaultPhone,
  email,
  setEmail,
  defaultEmail,
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
          placeholder="Roky Islam"
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
          placeholder="+880123456789"
          value={phoneNumber || defaultPhone}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />
        <QuoteField
          label="Email"
          placeholder="Enter your mail"
          value={email }
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <QuoteField
          label="Time Hours"
          placeholder="Enter hours"
          value={estimatedTime}
          onChangeText={setEstimatedTime}
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
              label="House"
              selected={unitType === "House"}
              onPress={() => setUnitType("House")}
            />
          </View>
          <View className="w-[48%]">
            <QuoteChoiceCard
              label="Apartment"
              selected={unitType === "Apartment"}
              onPress={() => setUnitType("Apartment")}
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
            />
          </View>
          <View className="flex-1">
            <QuoteField
              label="End Date"
              placeholder="YYYY-MM-DD"
              value={endDate}
              onChangeText={setEndDate}
            />
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <QuoteField
              label="Floors Count"
              placeholder="e.g. 3"
              value={floorsCount}
              onChangeText={setFloorsCount}
              keyboardType="number-pad"
            />
          </View>
          <View className="flex-1">
            <QuoteField
              label="Units / Floor"
              placeholder="e.g. 4"
              value={unitsPerFloor}
              onChangeText={setUnitsPerFloor}
              keyboardType="number-pad"
            />
          </View>
        </View>
      </QuoteSectionCard>

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
