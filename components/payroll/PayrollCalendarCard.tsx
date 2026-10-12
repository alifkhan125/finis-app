import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PayrollCalendarCardProps = {
  monthDate: Date;
  selectedDate: Date | null;
  periodMode?: PayrollCalendarMode;
  selectedRangeEnd?: Date | null;
  onSelectDate: (date: Date) => void;
  onSelectRangeEnd?: (date: Date | null) => void;
  onMonthDateChange: (date: Date) => void;
  onPeriodModeChange?: (mode: PayrollCalendarMode) => void;
};

export type PayrollCalendarMode =
  | "custom"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "bimonthly";

const PERIOD_OPTIONS: {
  label: string;
  value: PayrollCalendarMode;
}[] = [
  { label: "Custom", value: "custom" },
  { label: "Weekly", value: "weekly" },
  { label: "Biweekly", value: "biweekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Bimonthly", value: "bimonthly" },
];

function startOfWeek(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function normalizeDate(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(value: Date, amount: number) {
  const next = new Date(value);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function endOfWeek(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + 6);
  return next;
}

function endOfBiweekly(value: Date) {
  return addDays(startOfWeek(value), 13);
}

function endOfBimonthly(value: Date) {
  const next = addMonths(value, 2);
  next.setDate(next.getDate() - 1);
  return next;
}

function getPeriodEnd(start: Date, mode: PayrollCalendarMode) {
  if (mode === "weekly") return endOfWeek(start);
  if (mode === "biweekly") return endOfBiweekly(start);
  if (mode === "monthly") {
    const next = addMonths(start, 1);
    next.setDate(next.getDate() - 1);
    return next;
  }
  if (mode === "bimonthly") return endOfBimonthly(start);
  return start;
}

function getPeriodStartFromEnd(end: Date, mode: PayrollCalendarMode) {
  const start = normalizeDate(end);
  if (mode === "weekly") {
    start.setDate(start.getDate() - 6);
  } else if (mode === "biweekly") {
    start.setDate(start.getDate() - 13);
  } else if (mode === "monthly") {
    start.setMonth(start.getMonth() - 1);
    start.setDate(start.getDate() + 1);
  } else if (mode === "bimonthly") {
    start.setMonth(start.getMonth() - 2);
    start.setDate(start.getDate() + 1);
  }
  return start;
}

function moveFixedRange(
  anchor: Date,
  currentStart: Date | null | undefined,
  currentEnd: Date | null | undefined,
  mode: PayrollCalendarMode,
) {
  const selected = normalizeDate(anchor);

  if (!currentStart || !currentEnd) {
    return { start: selected, end: getPeriodEnd(selected, mode) };
  }

  const start = normalizeDate(currentStart);
  const end = normalizeDate(currentEnd);
  const startDistance = Math.abs(selected.getTime() - start.getTime());
  const endDistance = Math.abs(selected.getTime() - end.getTime());

  if (startDistance <= endDistance) {
    return { start: selected, end: getPeriodEnd(selected, mode) };
  }

  return { start: getPeriodStartFromEnd(selected, mode), end: selected };
}

function isSameDay(first: Date | null | undefined, second: Date | null | undefined) {
  if (!first || !second) return false;
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function isBetween(value: Date, start: Date | null | undefined, end: Date | null | undefined) {
  if (!start || !end) return false;
  const dateTime = normalizeDate(value).getTime();
  return dateTime >= normalizeDate(start).getTime() && dateTime <= normalizeDate(end).getTime();
}

function buildCalendarDays(monthDate: Date) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export default function PayrollCalendarCard({
  monthDate,
  selectedDate,
  periodMode = "custom",
  selectedRangeEnd,
  onSelectDate,
  onSelectRangeEnd,
  onMonthDateChange,
  onPeriodModeChange = () => {},
}: PayrollCalendarCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const selectedLabel =
    PERIOD_OPTIONS.find((item) => item.value === periodMode)?.label ?? "Custom";

  const selectedRange =
    periodMode === "custom"
      ? {
          start: selectedDate,
          end: selectedRangeEnd ?? selectedDate,
        }
      : selectedDate
        ? {
          start: selectedDate,
          end: selectedRangeEnd ?? getPeriodEnd(selectedDate, periodMode),
          }
        : undefined;

  const calendarDays = useMemo(() => buildCalendarDays(monthDate), [monthDate]);
  const monthLabel = monthDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const handlePressDate = (date: Date) => {
    const anchor = normalizeDate(date);

    if (periodMode === "custom") {
      const currentStart = selectedDate ? normalizeDate(selectedDate) : null;
      const currentEnd = selectedRangeEnd ? normalizeDate(selectedRangeEnd) : null;

      if (!currentStart) {
        onSelectDate(anchor);
        onSelectRangeEnd?.(null);
      } else if (!currentEnd) {
        if (anchor < currentStart) {
          onSelectDate(anchor);
          onSelectRangeEnd?.(currentStart);
        } else {
          onSelectRangeEnd?.(anchor);
        }
      } else if (anchor <= currentStart) {
        onSelectDate(anchor);
        onSelectRangeEnd?.(currentEnd);
      } else if (anchor >= currentEnd) {
        onSelectRangeEnd?.(anchor);
      } else {
        const startDistance = Math.abs(anchor.getTime() - currentStart.getTime());
        const endDistance = Math.abs(currentEnd.getTime() - anchor.getTime());

        if (startDistance <= endDistance) {
          onSelectDate(anchor);
        } else {
          onSelectRangeEnd?.(anchor);
        }
      }
      onMonthDateChange(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
      return;
    }

    const movedRange = moveFixedRange(
      anchor,
      selectedRange?.start,
      selectedRange?.end,
      periodMode,
    );

    onSelectDate(movedRange.start);
    onSelectRangeEnd?.(movedRange.end);
    onMonthDateChange(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  };

  const handleMonthMove = (amount: number) => {
    onMonthDateChange(new Date(monthDate.getFullYear(), monthDate.getMonth() + amount, 1));
  };

  return (
    <View className="rounded-[18px] border border-[#D8DDE3] bg-white px-3 py-3">
      <View className="mb-3">
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setMenuOpen((prev) => !prev)}
          className="h-11 flex-row items-center justify-between rounded-[12px] border border-[#D8DDE3] bg-[#F8FAFC] px-3"
        >
          <Text className="text-[14px] font-medium text-[#111827]">
            {selectedLabel}
          </Text>
          <Ionicons
            name={menuOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color="#475467"
          />
        </TouchableOpacity>

        <Modal
          transparent
          visible={menuOpen}
          animationType="slide"
          onRequestClose={() => setMenuOpen(false)}
        >
          <View className="flex-1 justify-end">
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setMenuOpen(false)}
              className="absolute inset-0 bg-black/35"
            />
            <View
              className="max-h-[70%] rounded-t-[24px] bg-white px-4 pt-3"
              style={{ paddingBottom: Math.max(insets.bottom, 24) }}
            >
              <View className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-[#D0D5DD]" />
              <Text className="mb-4 text-[16px] font-semibold text-[#101828]">
                Select Payroll Period
              </Text>

              {PERIOD_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.85}
                  onPress={() => {
                    onPeriodModeChange(option.value);
                    setMenuOpen(false);
                  }}
                  className={`mb-2 h-12 flex-row items-center justify-between rounded-[14px] px-4 ${
                    option.value === periodMode ? "bg-[#EAF3F8]" : "bg-[#F8FAFC]"
                  }`}
                >
                  <Text
                    className={`text-[15px] ${
                      option.value === periodMode
                        ? "font-semibold text-[#1F5577]"
                        : "text-[#344054]"
                    }`}
                  >
                    {option.label}
                  </Text>
                  {option.value === periodMode ? (
                    <Ionicons name="checkmark-circle" size={18} color="#1F5577" />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </View>

      <View className="px-1 pb-1">
        <View className="mb-4 flex-row items-center justify-between">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleMonthMove(-1)}
            className="h-9 w-9 items-center justify-center"
          >
            <Ionicons name="chevron-back" size={20} color="#111827" />
          </TouchableOpacity>

          <Text className="text-[18px] font-bold text-[#111827]">{monthLabel}</Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleMonthMove(1)}
            className="h-9 w-9 items-center justify-center"
          >
            <Ionicons name="chevron-forward" size={20} color="#111827" />
          </TouchableOpacity>
        </View>

        <View className="mb-2 flex-row justify-between">
          {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
            <View key={day} className="h-7 w-[13.2%] items-center justify-center">
              <Text className="text-[11px] font-semibold text-[#1F5577]">{day}</Text>
            </View>
          ))}
        </View>

        <View className="flex-row flex-wrap justify-between">
          {calendarDays.map((date) => {
            const isCurrentMonth = date.getMonth() === monthDate.getMonth();
            const inRange = isBetween(date, selectedRange?.start, selectedRange?.end);
            const isEdge =
              isSameDay(date, selectedRange?.start) || isSameDay(date, selectedRange?.end);

            return (
              <TouchableOpacity
                key={date.toISOString()}
                activeOpacity={0.8}
                onPress={() => handlePressDate(date)}
                className="mb-2 h-[38px] w-[13.2%] items-center justify-center"
              >
                <View

                  className={`h-[34px] w-full items-center justify-center ${inRange ? "bg-[#1F5577] rounded-lg" : "bg-transparent"}`}
                >
                  <Text
                    className={`text-[15px] ${
                      inRange || isEdge
                        ? "font-semibold text-white"
                        : isCurrentMonth
                          ? "font-medium text-[#111827]"
                          : "font-medium text-[#D1D5DB]"
                    }`}
                  >
                    {date.getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}
