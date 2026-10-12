import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Platform, Alert, KeyboardAvoidingView, RefreshControl } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useWorkerProfileQuery } from "@/hooks/profile/profile";
import { useSubmitTimeAdjustmentMutation } from "@/hooks/manager/time-adjustments";

const THEME = {
  colors: {
    background: "#F8FAFC",
    white: "#FFFFFF",
    textMain: "#0F172A",
    textSecondary: "#64748B",
    bluePrimary: "#1f3d5c",
    border: "#E2E8F0",
  },
};

function formatDisplayTime(timeStr?: string): string {
  if (!timeStr) return '--:--';
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    let hrs = parseInt(parts[0], 10);
    const mins = parts[1];
    const ampm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12 || 12;
    return `${hrs.toString().padStart(2, '0')}:${mins} ${ampm}`;
  }
  return timeStr;
}

function getScheduleDisplayName(rawName?: string): string {
  if (!rawName) return "Regular Shift";
  const cleaned = rawName.replace(/ \(Adjusted\)/g, '').trim();
  // If the admin named it after the time like "08:00 - 17:00", replace with friendly name
  if (/^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/.test(cleaned)) {
    return "Regular Shift";
  }
  return cleaned || "Regular Shift";
}

export default function WorkScheduleScreen() {
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading, refetch } = useWorkerProfileQuery();
  const schedules = profile?.workScheduleAssignments || [];
  const allRequests: any[] = (profile as any)?.timeAdjustments || [];
  const pendingRequests = allRequests.filter((r: any) => r.status === 'pending');
  const hasPending = pendingRequests.length > 0;
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);

  const submitMutation = useSubmitTimeAdjustmentMutation();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [requestType, setRequestType] = useState<"check_in" | "check_out">("check_in");
  const [adjustedTime, setAdjustedTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [reason, setReason] = useState("");

  // Single Day vs Regular Schedule Scope
  const [adjustmentScope, setAdjustmentScope] = useState<'single_day' | 'regular'>('single_day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const openAdjustmentModal = (assignment: any) => {
    setSelectedSchedule(assignment);
    setRequestType("check_in");
    setAdjustedTime(new Date());
    setAdjustmentScope('single_day');
    setSelectedDate(new Date());
    setReason("");
    setModalVisible(true);
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedTime) setAdjustedTime(selectedTime);
  };

  const handleDateChange = (event: any, dateVal?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (dateVal) setSelectedDate(dateVal);
  };

  const handleSubmit = () => {
    if (!selectedSchedule) return;

    const originalTimeStr = requestType === "check_in" 
      ? selectedSchedule.schedule?.startTime 
      : selectedSchedule.schedule?.endTime;

    // Convert "08:00 AM" or "08:00" to full ISO date
    const parseTime = (timeStr: string) => {
      if (!timeStr) return new Date().toISOString();
      const [time, modifier] = timeStr.split(' ');
      let [hours, minutes] = time.split(':');
      if (hours === '12') hours = '00';
      if (modifier?.toLowerCase() === 'pm') hours = (parseInt(hours, 10) + 12).toString();
      const d = new Date();
      d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      return d.toISOString();
    };

    const timeFormatted = adjustedTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateFormatted = selectedDate.toISOString().split('T')[0];

    const taggedReason = adjustmentScope === 'single_day'
      ? `[Scope: single_day] [Date: ${dateFormatted}] [Time: ${timeFormatted}] ${reason.trim() || 'Single day adjustment'}`
      : `[Scope: regular] [Time: ${timeFormatted}] ${reason.trim() || 'Regular shift schedule change'}`;

    submitMutation.mutate(
      {
        date: adjustmentScope === 'single_day' ? selectedDate.toISOString() : new Date().toISOString(),
        requestType,
        originalTime: parseTime(originalTimeStr),
        adjustedTime: adjustedTime.toISOString(),
        reason: taggedReason,
      },
      {
        onSuccess: () => {
          Alert.alert(
            "Success",
            adjustmentScope === 'single_day'
              ? `Time adjustment request for ${selectedDate.toLocaleDateString()} submitted.`
              : "Regular schedule change request submitted."
          );
          setModalVisible(false);
          refetch();
        },
        onError: (err: any) => {
          Alert.alert("Error", err.message || "Failed to submit request.");
        }
      }
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          backgroundColor: THEME.colors.white,
          borderBottomWidth: 1,
          borderBottomColor: THEME.colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 8 }}>
          <Feather name="arrow-left" size={24} color={THEME.colors.textMain} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "700", color: THEME.colors.textMain }}>Work Schedule</Text>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.colors.bluePrimary]} tintColor={THEME.colors.bluePrimary} />
        }
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={THEME.colors.bluePrimary} style={{ marginTop: 40 }} />
        ) : schedules.length > 0 ? (
          schedules.map((assignment: any) => {
            const isAdjusted = assignment.schedule?.name?.includes('(Adjusted)');
            const formattedStart = formatDisplayTime(assignment.schedule?.startTime);
            const formattedEnd = formatDisplayTime(assignment.schedule?.endTime);

            return (
              <View
                key={assignment.id}
                style={{
                  backgroundColor: THEME.colors.white,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: THEME.colors.border,
                }}
              >
                {/* Header: Friendly Title & Adjusted Badge */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: THEME.colors.textMain }}>
                    {getScheduleDisplayName(assignment.schedule?.name)}
                  </Text>
                  {isAdjusted && (
                    <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ fontSize: 12, color: '#4F46E5', fontWeight: '700' }}>Adjusted</Text>
                    </View>
                  )}
                </View>
                
                {/* Working Hours */}
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10 }}>
                  <Ionicons name="time-outline" size={22} color={THEME.colors.bluePrimary} />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={{ fontSize: 12, color: THEME.colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' }}>
                      Working Hours
                    </Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: THEME.colors.textMain, marginTop: 2 }}>
                      {formattedStart} - {formattedEnd}
                    </Text>
                  </View>
                </View>

                {/* Days */}
                <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 4 }}>
                  <Ionicons name="calendar-outline" size={20} color={THEME.colors.bluePrimary} style={{ marginTop: 2 }} />
                  <View style={{ marginLeft: 8, flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {assignment.schedule?.days?.map((day: string) => (
                      <View key={day} style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ color: '#4F46E5', fontSize: 13, fontWeight: '600' }}>{day}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Pending Request Alert on Card */}
                {hasPending && (
                  <View style={{ marginTop: 14, backgroundColor: '#FEF3C7', padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
                    <Feather name="clock" size={16} color="#D97706" />
                    <Text style={{ marginLeft: 8, fontSize: 13, color: '#B45309', fontWeight: '600', flex: 1 }}>
                      A time adjustment request is pending approval.
                    </Text>
                  </View>
                )}

                {/* Request Button */}
                <TouchableOpacity 
                  disabled={hasPending}
                  onPress={() => openAdjustmentModal(assignment)}
                  style={{ 
                    marginTop: 16, 
                    backgroundColor: hasPending ? '#94A3B8' : THEME.colors.bluePrimary, 
                    padding: 14, 
                    borderRadius: 10, 
                    alignItems: "center" 
                  }}
                >
                  <Text style={{ color: THEME.colors.white, fontWeight: "700", fontSize: 14 }}>
                    {hasPending ? "Adjustment Request Pending" : "Request Time Adjustment"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        ) : (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Ionicons name="calendar-clear-outline" size={64} color="#CBD5E1" />
            <Text style={{ fontSize: 16, color: THEME.colors.textSecondary, marginTop: 16 }}>No schedule assigned.</Text>
          </View>
        )}

        {/* Adjustment Requests Status Section */}
        {allRequests.length > 0 && (
          <View style={{ marginTop: 24, marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: THEME.colors.textMain, marginBottom: 12 }}>
              Adjustment Requests ({allRequests.length})
            </Text>
            {allRequests.map((req: any) => {
              const isPending = req.status === 'pending';
              const isApproved = req.status === 'approved';
              const isDenied = req.status === 'denied';
              const isSingleDay = req.reason?.includes('Scope: single_day');
              const dateMatch = req.reason?.match(/\[Date:\s*([^\]]+)\]/);
              const targetDateStr = dateMatch ? dateMatch[1] : new Date(req.date).toLocaleDateString();

              const match = req.reason?.match(/\[Time:\s*([^\]]+)\]/);
              const displayTime = match 
                ? match[1] 
                : new Date(req.adjustedTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
              const cleanReason = (req.reason || '')
                .replace(/\[Scope:\s*[^\]]+\]\s*/gi, '')
                .replace(/\[Date:\s*[^\]]+\]\s*/gi, '')
                .replace(/\[Time:\s*[^\]]+\]\s*/gi, '')
                .trim();

              return (
                <View
                  key={req.id}
                  style={{
                    backgroundColor: THEME.colors.white,
                    borderRadius: 14,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: isPending ? '#FDE68A' : isApproved ? '#BBF7D0' : '#FECACA',
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.colors.textMain }}>
                        {req.requestType === 'check_in' ? 'Check-In Correction' : 'Check-Out Correction'}
                      </Text>
                      <View style={{ backgroundColor: isSingleDay ? '#F3E8FF' : '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: isSingleDay ? '#7E22CE' : '#1D4ED8' }}>
                          {isSingleDay ? `1 Day (${targetDateStr})` : 'Regular'}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                        backgroundColor: isPending ? '#FEF3C7' : isApproved ? '#DCFCE7' : '#FEE2E2',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: isPending ? '#D97706' : isApproved ? '#16A34A' : '#DC2626',
                          textTransform: 'capitalize',
                        }}
                      >
                        {req.status}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Feather name="clock" size={15} color={THEME.colors.textSecondary} />
                    <Text style={{ marginLeft: 6, fontSize: 14, color: THEME.colors.textSecondary }}>
                      Requested Time: <Text style={{ fontWeight: '700', color: THEME.colors.textMain }}>{displayTime}</Text>
                    </Text>
                  </View>

                  {cleanReason ? (
                    <Text style={{ fontSize: 13, color: THEME.colors.textSecondary, marginTop: 4, fontStyle: 'italic' }}>
                      {`Reason: "${cleanReason}"`}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Time Adjustment Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
            <View style={{ backgroundColor: THEME.colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: THEME.colors.textMain }}>Request Adjustment</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={THEME.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Scope Selection: 1 Day vs Regular */}
            <Text style={{ fontSize: 13, fontWeight: "700", color: THEME.colors.textMain, marginBottom: 8, textTransform: 'uppercase' }}>Scope of Adjustment</Text>
            <View style={{ flexDirection: "row", marginBottom: 16, gap: 10 }}>
              <TouchableOpacity 
                style={{ 
                  flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5, 
                  borderColor: adjustmentScope === "single_day" ? THEME.colors.bluePrimary : THEME.colors.border, 
                  backgroundColor: adjustmentScope === "single_day" ? "#EEF2FF" : THEME.colors.white, 
                  alignItems: "center" 
                }}
                onPress={() => setAdjustmentScope("single_day")}
              >
                <Text style={{ fontWeight: "700", fontSize: 13, color: adjustmentScope === "single_day" ? THEME.colors.bluePrimary : THEME.colors.textMain }}>1 Day Only</Text>
                <Text style={{ fontSize: 11, color: THEME.colors.textSecondary, marginTop: 2 }}>Only for selected date</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ 
                  flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5, 
                  borderColor: adjustmentScope === "regular" ? THEME.colors.bluePrimary : THEME.colors.border, 
                  backgroundColor: adjustmentScope === "regular" ? "#EEF2FF" : THEME.colors.white, 
                  alignItems: "center" 
                }}
                onPress={() => setAdjustmentScope("regular")}
              >
                <Text style={{ fontWeight: "700", fontSize: 13, color: adjustmentScope === "regular" ? THEME.colors.bluePrimary : THEME.colors.textMain }}>Regular Schedule</Text>
                <Text style={{ fontSize: 11, color: THEME.colors.textSecondary, marginTop: 2 }}>Upcoming shifts</Text>
              </TouchableOpacity>
            </View>

            {/* Date Picker if Single Day */}
            {adjustmentScope === "single_day" && (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: THEME.colors.textMain, marginBottom: 6, textTransform: 'uppercase' }}>Select Date</Text>
                <TouchableOpacity 
                  style={{ padding: 12, borderWidth: 1, borderColor: THEME.colors.border, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: THEME.colors.textMain, fontWeight: '600', fontSize: 14 }}>
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                  <Feather name="calendar" size={18} color={THEME.colors.bluePrimary} />
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                  />
                )}
              </View>
            )}

            {/* Request Type Check-In vs Check-Out */}
            <Text style={{ fontSize: 13, fontWeight: "700", color: THEME.colors.textMain, marginBottom: 6, textTransform: 'uppercase' }}>Which Time to Adjust</Text>
            <View style={{ flexDirection: "row", marginBottom: 16, gap: 10 }}>
              <TouchableOpacity 
                style={{ flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: requestType === "check_in" ? THEME.colors.bluePrimary : THEME.colors.border, backgroundColor: requestType === "check_in" ? "#EEF2FF" : THEME.colors.white, alignItems: "center" }}
                onPress={() => setRequestType("check_in")}
              >
                <Text style={{ fontWeight: "600", color: requestType === "check_in" ? THEME.colors.bluePrimary : THEME.colors.textSecondary }}>Check In</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: requestType === "check_out" ? THEME.colors.bluePrimary : THEME.colors.border, backgroundColor: requestType === "check_out" ? "#EEF2FF" : THEME.colors.white, alignItems: "center" }}
                onPress={() => setRequestType("check_out")}
              >
                <Text style={{ fontWeight: "600", color: requestType === "check_out" ? THEME.colors.bluePrimary : THEME.colors.textSecondary }}>Check Out</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, fontWeight: "700", color: THEME.colors.textMain, marginBottom: 6, textTransform: 'uppercase' }}>New Adjusted Time</Text>
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={adjustedTime}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={handleTimeChange}
                style={{ marginBottom: 16 }}
              />
            ) : (
              <>
                <TouchableOpacity 
                  style={{ padding: 12, borderWidth: 1, borderColor: THEME.colors.border, borderRadius: 8, marginBottom: 16, alignItems: "center", backgroundColor: '#F8FAFC' }}
                  onPress={() => setShowPicker(true)}
                >
                  <Text style={{ color: THEME.colors.textMain, fontWeight: '700', fontSize: 16 }}>
                    {adjustedTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </Text>
                </TouchableOpacity>
                {showPicker && (
                  <DateTimePicker
                    value={adjustedTime}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    onChange={handleTimeChange}
                  />
                )}
              </>
            )}

            <Text style={{ fontSize: 13, fontWeight: "700", color: THEME.colors.textMain, marginBottom: 6, textTransform: 'uppercase' }}>Reason</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: THEME.colors.border, borderRadius: 8, padding: 12, color: THEME.colors.textMain, marginBottom: 20, textAlignVertical: 'top' }}
              placeholder="Why do you need this adjustment?"
              placeholderTextColor="#94A3B8"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={2}
            />

            <TouchableOpacity 
              onPress={handleSubmit}
              disabled={submitMutation.isPending}
              style={{ backgroundColor: THEME.colors.bluePrimary, padding: 15, borderRadius: 10, alignItems: "center" }}
            >
              {submitMutation.isPending ? (
                <ActivityIndicator color={THEME.colors.white} />
              ) : (
                <Text style={{ color: THEME.colors.white, fontWeight: "700", fontSize: 15 }}>Submit Request</Text>
              )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
