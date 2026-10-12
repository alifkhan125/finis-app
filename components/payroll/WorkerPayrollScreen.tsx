import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackTitleHeader from "../common/BackTitleHeader";
import PayrollCalendarCard from "./PayrollCalendarCard";
import { useWorkerPayrollQuery } from "@/hooks/worker/payroll";
import { formatCurrency } from "./utils";

import { type PayrollCalendarMode } from "./PayrollCalendarCard";

function parseHourlyRate(value: string | number | null | undefined) {
  const numericRate = Number(value);
  return Number.isFinite(numericRate) ? numericRate : 0;
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value?: string | null) {
  if (!value) return "This week";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "This week";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function WorkerPayrollScreen() {
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [periodMode, setPeriodMode] = useState<PayrollCalendarMode>("custom");
  const [selectedRangeEnd, setSelectedRangeEnd] = useState<Date | null>(null);

  const selectedDateKey = useMemo(() => formatLocalDate(selectedDate), [selectedDate]);
  const queryParams = useMemo(() => {
    if (periodMode !== "custom" && selectedRangeEnd) {
      return {
        startDate: formatLocalDate(selectedDate),
        endDate: formatLocalDate(selectedRangeEnd),
      };
    }
    return { date: selectedDateKey };
  }, [periodMode, selectedDate, selectedRangeEnd, selectedDateKey]);

  const { data: payroll, isLoading } = useWorkerPayrollQuery(queryParams);

  const periodSummary = payroll?.periodSummary ?? payroll?.lifetimeSummary;
  const projects = payroll?.projects ?? [];
  const totalBalance = periodSummary?.totalPay ?? 0;
  const workerName = payroll?.worker?.fullName || "Worker";
  const workerRole = payroll?.worker?.department || payroll?.worker?.role || "Worker";
  const hourlyRate = useMemo(
    () => parseHourlyRate(periodSummary?.averageHourlyRate ?? 0),
    [periodSummary?.averageHourlyRate],
  );

  const handleSeeTransactions = () => {
    router.push({
      pathname: "/screens/payroll/paystub",
      params: { 
        mode: "worker", 
        ...(queryParams.startDate ? { startDate: queryParams.startDate, endDate: queryParams.endDate } : { date: queryParams.date })
      },
    });
  };

  return (
    <SafeAreaView edges={['top','left',"right"]} className="flex-1 bg-[#E9EDF1]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 96 }}>
        <BackTitleHeader title="Payroll" onBack={() => router.back()} />

        <View className="mt-4 px-4">
          <View className="rounded-[24px] border border-[#1F5577] bg-[#C9E7FB] px-4 py-4">
            <Text className="text-[16px] font-semibold text-[#101828]">
              Total Palance
            </Text>
            <View className="mt-4 rounded-[20px] bg-white px-4 py-5">
              <Text className="text-center text-[32px] font-semibold text-[#101828]">
                {formatCurrency(totalBalance)}
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleSeeTransactions}
                className="mt-4"
              >
                <Text className="text-center text-[16px] font-medium text-[#1F5577]">
                  See Transactions
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="mt-4 overflow-hidden rounded-[20px] border border-[#E1E5EA] bg-white px-3 py-3">
            <PayrollCalendarCard
              monthDate={monthDate}
              selectedDate={selectedDate}
              periodMode={periodMode}
              selectedRangeEnd={selectedRangeEnd}
              onSelectDate={setSelectedDate}
              onSelectRangeEnd={setSelectedRangeEnd}
              onMonthDateChange={setMonthDate}
              onPeriodModeChange={setPeriodMode}
            />
          </View>

          <View className="mt-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-[18px] font-medium text-[#101828]">
                Project List
              </Text>
              <Text className="text-[12px] text-[#667085]">
                {periodMode !== "custom" && selectedRangeEnd
                  ? `${formatDateLabel(queryParams.startDate)} - ${formatDateLabel(queryParams.endDate)}`
                  : formatDateLabel(payroll?.date)}
              </Text>
            </View>

            {isLoading ? (
              <View className="min-h-[120px] items-center justify-center rounded-[14px] border border-[#E9EDF1] bg-white">
                <ActivityIndicator size="small" color="#1F5577" />
              </View>
            ) : projects.length > 0 ? (
              projects.map((project) => {
                const periodHours = periodSummary?.totalHours ?? 0;
                const progress =
                  periodHours > 0
                    ? Math.min(100, Math.round((project.totalHours / periodHours) * 100))
                    : 0;

                return (
                  <View
                    key={project.projectId}
                    className="mb-3 rounded-[16px] border border-[#E9EDF1] bg-white px-4 py-4"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-3">
                        <Text className="text-[18px] font-semibold text-[#101828]">
                          {project.projectName}
                        </Text>
                        <Text className="mt-1 text-[13px] text-[#667085]">
                          {project.companyName}
                        </Text>
                        <Text className="mt-1 text-[12px] text-[#98A2B3]">
                          {project.totalHoursDisplay} worked
                        </Text>
                      </View>
                      <View className="rounded-full bg-[#EAF7EF] px-3 py-1">
                        <Text className="text-[12px] font-medium text-[#14803C]">
                          {project.totalPay > 0 ? "Paid" : "Pending"}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-4 h-2 rounded-full bg-[#EAF2FF]">
                      <View
                        className="h-2 rounded-full bg-[#1F5577]"
                        style={{ width: `${progress}%` }}
                      />
                    </View>

                    <View className="mt-4 flex-row justify-between">
                      <View>
                        <Text className="text-[12px] text-[#667085]">Gross Pay</Text>
                        <Text className="mt-1 text-[15px] font-semibold text-[#101828]">
                          {formatCurrency(project.grossPay)}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-[12px] text-[#667085]">Deductions</Text>
                        <Text className="mt-1 text-[15px] font-semibold text-[#101828]">
                          {formatCurrency(project.totalDeductions)}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-[12px] text-[#667085]">Total Pay</Text>
                        <Text className="mt-1 text-[15px] font-semibold text-[#1F5577]">
                          {formatCurrency(project.totalPay)}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-4 flex-row items-center justify-between">
                      <Text className="text-[13px] text-[#667085]">
                        Avg Rate
                      </Text>
                      <Text className="text-[13px] font-medium text-[#101828]">
                        {formatCurrency(project.averageHourlyRate)}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View className="rounded-[14px] border border-[#E9EDF1] bg-white px-4 py-5">
                <Text className="text-center text-[14px] text-[#667085]">
                  No payroll data found for this date.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
