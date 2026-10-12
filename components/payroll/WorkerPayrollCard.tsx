import React, { useState } from "react";
import { Image , Text, TouchableOpacity, View } from "react-native";

import { WorkerPayroll } from "./types";
import { formatCurrency } from "./utils";
const placeholderAvatar = require("../../assets/images/placeholder-person.png");

type WorkerPayrollCardProps = {
  worker: WorkerPayroll;
  onViewStub: () => void;
  onApprove?: () => void;
  onEdit?: () => void;
};

export default function WorkerPayrollCard({
  worker,
  onViewStub,
  onApprove,
  onEdit,
}: WorkerPayrollCardProps) {
  const isApproved = worker.status === "Approved";
  const primaryLabel = worker.showApproveButton ? "Edit" : "View Stub";
  const handlePrimaryPress = worker.showApproveButton ? onEdit : onViewStub;
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <View className="mt-3 rounded-[14px] border border-[#E3E6EA] bg-white px-4 py-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center">
          <View className="h-[42px] w-[42px] overflow-hidden rounded-full bg-[#EEF2F6]">
            <Image
              source={
                worker.avatarUrl && !imageFailed
                  ? { uri: worker.avatarUrl }
                  : placeholderAvatar
              }
              className="h-[42px] w-[42px]"
              onError={() => setImageFailed(true)}
            />
          </View>

          <View className="ml-3">
            <Text className="text-[14px] font-medium text-[#101828]">
              {worker.name}
            </Text>
            <Text className="text-[11px] text-[#667085]">{worker.role}</Text>
          </View>
        </View>

        <View
          className="rounded-[6px] px-3 py-1"
          style={{ backgroundColor: isApproved ? "#D8F2E3" : "#F6E8DB" }}
        >
          <Text
            className="text-[11px] font-medium"
            style={{ color: isApproved ? "#08974A" : "#FF6B00" }}
          >
            {worker.status}
          </Text>
        </View>
      </View>

      <View className="mt-3 flex-row">
        <View className="flex-1">
          <Text className="text-[11px] text-[#667085]">Hours</Text>
          <Text className="text-[12px] font-medium text-[#101828]">
            {worker.hoursDisplay ?? String(worker.hours)}
          </Text>
        </View>

        <View className="flex-1">
          <Text className="text-[11px] text-[#667085]">Rate</Text>
          <Text className="text-[12px] font-medium text-[#101828]">
            ${worker.rate}/hr
          </Text>
        </View>

        <View className="flex-1">
          <Text className="text-[11px] text-[#667085]">Total</Text>
          <Text className="text-[12px] font-medium text-[#1F5577]">
            {worker.totalDisplay ?? formatCurrency(worker.total)}
          </Text>
        </View>
      </View>

      <View className="mt-3 flex-row">
          <TouchableOpacity
          activeOpacity={0.85}
          onPress={handlePrimaryPress}
          className={
            worker.showApproveButton
              ? "mr-2 h-11 flex-1 items-center justify-center rounded-[8px] bg-[#B9DCF3]"
              : "h-11 flex-1 items-center justify-center rounded-[8px] border border-[#D0D7E2] bg-[#FCFCFD]"
          }
        >
          <Text className="text-[16px] font-medium text-[#1F2937]">
            {primaryLabel}
          </Text>
        </TouchableOpacity>

        {worker.showApproveButton ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onApprove}
            className="ml-2 h-11 flex-1 items-center justify-center rounded-[8px] bg-[#1F5577]"
          >
            <Text className="text-[16px] font-medium text-white">Approve</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
