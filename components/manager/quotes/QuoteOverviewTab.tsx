import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { QuoteSelectorsResponse } from "@/api/manager/quotes.api";

type QuoteOverviewTabProps = {
  selectors?: QuoteSelectorsResponse;
};

export default function QuoteOverviewTab({ selectors }: QuoteOverviewTabProps) {
  const projectTypes = selectors?.projectTypes || [
    { value: "new_build", label: "New Build" },
    { value: "renovation", label: "Renovation" },
  ];
  const propertyTypes = selectors?.propertyTypes || [
    { value: "residential", label: "Residential" },
    { value: "commercial", label: "Commercial" },
  ];
  const unitTypes = selectors?.unitTypes || [
    { value: "house", label: "House" },
    { value: "apartment", label: "Apartment" },
  ];
  const measurementTypes = selectors?.measurementTypes || [];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
      className="mt-5 px-5"
    >
      {/* Header Banner */}
      <View className="rounded-[20px] border border-[#D7E0E8] bg-white p-5 shadow-sm">
        <View className="flex-row items-center gap-2">
          <Ionicons name="sparkles" size={20} color="#1F5577" />
          <Text className="text-[18px] font-bold text-[#1F2937]">
            Project Selector Flow
          </Text>
        </View>
        <Text className="mt-1 text-[13px] leading-5 text-[#64748B]">
          The quotation module uses these three project criteria to filter and match services from your work items catalog.
        </Text>
      </View>

      {/* Selectors Grid */}
      <View className="mt-4 gap-4">
        {/* Project Types */}
        <View className="rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="construct-outline" size={16} color="#1F5577" />
            <Text className="text-[12px] font-bold uppercase tracking-wider text-[#64748B]">
              Project Types
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {projectTypes.map((pt, idx) => (
              <View
                key={pt.value || idx}
                className="rounded-full bg-slate-100 border border-slate-200 px-3.5 py-1.5"
              >
                <Text className="text-[13px] font-semibold text-[#334155]">
                  {pt.label || pt.name || pt.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Property Types */}
        <View className="rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="business-outline" size={16} color="#1F5577" />
            <Text className="text-[12px] font-bold uppercase tracking-wider text-[#64748B]">
              Property Types
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {propertyTypes.map((pt, idx) => (
              <View
                key={pt.value || idx}
                className="rounded-full bg-slate-100 border border-slate-200 px-3.5 py-1.5"
              >
                <Text className="text-[13px] font-semibold text-[#334155]">
                  {pt.label || pt.name || pt.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Unit Types */}
        <View className="rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <View className="flex-row items-center gap-2 mb-2">
            <Ionicons name="home-outline" size={16} color="#1F5577" />
            <Text className="text-[12px] font-bold uppercase tracking-wider text-[#64748B]">
              Unit Types
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {unitTypes.map((ut, idx) => (
              <View
                key={ut.value || idx}
                className="rounded-full bg-slate-100 border border-slate-200 px-3.5 py-1.5"
              >
                <Text className="text-[13px] font-semibold text-[#334155]">
                  {ut.label || ut.name || ut.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Measurement Types */}
        {measurementTypes.length > 0 && (
          <View className="rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <View className="flex-row items-center gap-2 mb-2">
              <Ionicons name="speedometer-outline" size={16} color="#1F5577" />
              <Text className="text-[12px] font-bold uppercase tracking-wider text-[#64748B]">
                Available Measurement Units
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {measurementTypes.map((mt, idx) => (
                <View
                  key={mt.value || idx}
                  className="rounded-full bg-blue-50 border border-blue-200 px-3.5 py-1.5"
                >
                  <Text className="text-[13px] font-semibold text-[#1F5577]">
                    {mt.label || mt.name || mt.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Workflow Guide Card */}
        <View className="rounded-[18px] border border-blue-200 bg-blue-50/60 p-4 shadow-sm">
          <Text className="text-[15px] font-bold text-[#1F5577]">
            How Quotations Convert into Projects
          </Text>
          <View className="mt-3 gap-2.5">
            <View className="flex-row items-start gap-2">
              <Ionicons name="checkmark-circle" size={16} color="#1F5577" style={{ marginTop: 2 }} />
              <Text className="text-[13px] leading-5 text-[#334155] flex-1">
                <Text className="font-bold">1. Build Estimate:</Text> Enter client info and planned building floor & unit structure.
              </Text>
            </View>
            <View className="flex-row items-start gap-2">
              <Ionicons name="checkmark-circle" size={16} color="#1F5577" style={{ marginTop: 2 }} />
              <Text className="text-[13px] leading-5 text-[#334155] flex-1">
                <Text className="font-bold">2. Assign Locations:</Text> In Step 2, edit tasks to select exact floors and units.
              </Text>
            </View>
            <View className="flex-row items-start gap-2">
              <Ionicons name="checkmark-circle" size={16} color="#1F5577" style={{ marginTop: 2 }} />
              <Text className="text-[13px] leading-5 text-[#334155] flex-1">
                <Text className="font-bold">3. Convert to Project:</Text> Once approved, click "Convert to Project" to auto-generate the project hierarchy with all assigned tasks!
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
