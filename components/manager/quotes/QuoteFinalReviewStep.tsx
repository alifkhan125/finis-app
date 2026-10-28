import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import {
  formatCurrency,
  type QuoteProjectType,
  type QuotePropertyType,
  type QuoteUnitType,
} from "./quoteTypes";
import QuoteReviewCard from "./QuoteReviewCard";
import type { QuoteSelectedWorkGroup } from "./QuoteWorkGroupCard";

type QuoteFinalReviewStepProps = {
  companyName?: string;
  projectName?: string;
  clientName: string;
  email: string;
  phoneNumber?: string;
  projectAddress: string;
  projectType: QuoteProjectType;
  propertyType: QuotePropertyType;
  unitType: QuoteUnitType;
  estimatedTime: string;
  startDate?: string;
  endDate?: string;
  floorsCount?: string;
  unitsPerFloor?: string;
  floorStart?: string;
  floorEnd?: string;
  unitStart?: string;
  unitEnd?: string;
  workGroups: QuoteSelectedWorkGroup[];
  subtotal: number;
  itemsSelected: number;
  discountAmount: number;
  finalTotal: number;
  validUntilLabel: string;
  projectDetailsLabel: string;
  projectMetaLabel: string;
  onEditSummary: () => void;
  onEditWorkItems: () => void;
  onOpenDiscount: () => void;
  onGeneratePdf: () => void;
  onEmailQuote: () => void;
  isGenerating?: boolean;
  showFinancials?: boolean;
};

function DetailRow({
  icon,
  label,
  value,
  subvalue,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  subvalue?: string;
}) {
  return (
    <View className="mb-4 flex-row items-start">
      <Ionicons
        name={icon}
        size={22}
        color="#255779"
        style={{ marginTop: 2 }}
      />
      <View className="ml-3 flex-1">
        <Text className="text-[13px] text-[#66707B]">{label}</Text>
        <Text className="mt-1 text-[14px] font-medium leading-6 text-[#1F2937]">
          {value}
        </Text>
        {subvalue ? (
          <Text className="mt-1 text-[14px] text-[#66707B]">{subvalue}</Text>
        ) : null}
      </View>
    </View>
  );
}

export default function QuoteFinalReviewStep({
  companyName,
  projectName,
  clientName,
  email,
  phoneNumber,
  projectAddress,
  projectType,
  propertyType,
  unitType,
  estimatedTime,
  startDate,
  endDate,
  floorsCount,
  unitsPerFloor,
  floorStart,
  floorEnd,
  unitStart,
  unitEnd,
  workGroups,
  subtotal,
  itemsSelected,
  discountAmount,
  finalTotal,
  validUntilLabel,
  projectDetailsLabel,
  projectMetaLabel,
  onEditSummary,
  onEditWorkItems,
  onOpenDiscount,
  onGeneratePdf,
  onEmailQuote,
  isGenerating = false,
  showFinancials = true,
}: QuoteFinalReviewStepProps) {
  const selectedGroups = workGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.selected),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <QuoteReviewCard title="Quote Summary" onEdit={onEditSummary}>
     
        <View className="mt-1">
          {companyName ? (
            <DetailRow
              icon="business-outline"
              label="Company"
              value={companyName}
            />
          ) : null}
          <DetailRow
            icon="folder-outline"
            label="Project"
            value={projectName || "N/A"}
          />
          <DetailRow
            icon="business-outline"
            label="Client"
            value={clientName }
          />
          <DetailRow
            icon="location-outline"
            label="Project Address"
            value={
              projectAddress
            }
          />
          <DetailRow
            icon="document-text-outline"
            label="Project Details"
              value={`${projectType} • ${propertyType} • ${unitType}`}
          />
          <DetailRow
            icon="calendar-outline"
            label="Estimated Timeline"
            value={estimatedTime }
          />
          <DetailRow
            icon="mail-outline"
            label="Client Email"
            value={email} 
          />
          <DetailRow
            icon="call-outline"
            label="Phone Number"
            value={phoneNumber || "N/A"}
          />
        </View>
      </QuoteReviewCard>

      <QuoteReviewCard title="Selected Work Items" onEdit={onEditWorkItems}>
        {selectedGroups.length ? (
          <>
            {selectedGroups.map((group) => {
              const groupTotal = group.items.reduce(
                (sum, item) =>
                  sum + (Number(item.quantity) || 0) * item.selectedUnitPrice,
                0,
              );
              return (
                <View
                  key={group.id}
                  className="mb-4 rounded-[16px] border border-[#E2E8F0] bg-white px-4 py-4"
                >
            
                  {group.items.map((item, itemIndex) => (
                    <View
                      key={`${group.id}-${item.id}-${itemIndex}`}
                      className="flex-row items-start justify-between"
                    >
                      <View className="flex-1 pr-3">
                        <Text className="text-[13px] font-medium text-[#344054]">
                          {item.title}
                        </Text>
                        <Text className="mt-1 text-[13px] text-[#66707B]">
                          {item.quantity} {item.selectedUnit}
                          {showFinancials ? ` × ${formatCurrency(item.selectedUnitPrice)}` : ""}
                        </Text>
                      </View>
                      {showFinancials ? (
                        <Text className="text-[13px] font-medium text-[#1F2937]">
                          {formatCurrency((Number(item.quantity) || 0) * item.selectedUnitPrice)}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              );
            })}
            {showFinancials ? <View className="mt-1 border-t border-[#E5EAF0] pt-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-[16px] font-medium text-[#1F2937]">
                  Work Items Subtotal
                </Text>
                <Text className="text-[16px] font-semibold text-[#1F2937]">
                  {formatCurrency(subtotal)}
                </Text>
              </View>
            </View> : null}
            {showFinancials && discountAmount > 0 ? (
              <View className="mt-3 flex-row items-center justify-between rounded-[12px] bg-[#ECFDF3] px-3 py-3">
                <Text className="text-[13px] font-medium text-[#15803D]">
                  Discount Applied
                </Text>
                <Text className="text-[13px] font-semibold text-[#15803D]">
                  -{formatCurrency(discountAmount)}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <Text className="text-[14px] text-[#66707B]">
            No work items selected.
          </Text>
        )}
      </QuoteReviewCard>

      <QuoteReviewCard title="Quote Details">
        <DetailRow
          icon="checkmark-circle-outline"
          label="Quote Valid Until"
          value={validUntilLabel}
        />
        <DetailRow
          icon="calendar-outline"
          label="Schedule"
          value={`${startDate || "N/A"} - ${endDate || "N/A"}`}
          subvalue={estimatedTime ? `Estimated hours: ${estimatedTime}` : undefined}
        />
        <DetailRow
          icon="business-outline"
          label="Structure"
          value={
            floorEnd && unitEnd
              ? `Floors ${floorStart || "1"}-${floorEnd} • Units ${unitStart || "1"}-${unitEnd}`
              : `${floorsCount || "0"} floors • ${unitsPerFloor || "0"} units/floor`
          }
        />
        <DetailRow
          icon="document-text-outline"
          label="Total Work Items"
          value={`${itemsSelected} items selected`}
        />
        <DetailRow
          icon="layers-outline"
          label="Quote Type"
          value={`${projectType} • ${propertyType} • ${unitType}`}
        />
        {showFinancials ? (
          <DetailRow icon="cash-outline" label="Final Total" value={formatCurrency(finalTotal)} />
        ) : null}
      </QuoteReviewCard>

      {showFinancials ? <QuoteReviewCard title=" ">
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onOpenDiscount}
          className="h-[58px] items-center justify-center rounded-[16px] border border-[#1F5577] bg-white"
        >
          <Text className="text-[16px] font-medium text-[#1F5577]">
            Apply Discount
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onGeneratePdf}
          disabled={isGenerating}
          className={`mt-4 h-[58px] flex-row items-center justify-center rounded-[16px] bg-[#1F5577] ${isGenerating ? "opacity-70" : ""}`}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="share-outline" size={22} color="#FFFFFF" />
          )}
          <Text className="ml-2 text-[16px] font-medium text-white">
            {isGenerating ? "Generating..." : "Generate Quote and Send"}
          </Text>
        </TouchableOpacity>
      </QuoteReviewCard> : (
        <View className="rounded-[16px] border border-[#D7E0E8] bg-[#F8FAFC] px-4 py-4">
          <Text className="text-[14px] font-semibold text-[#344054]">Ready for admin review</Text>
          <Text className="mt-1 text-[13px] leading-5 text-[#667085]">
            Save this draft. Your admin will add pricing and send the final quotation.
          </Text>
        </View>
      )}
    </>
  );
}

