import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import DateTimePicker from "@react-native-community/datetimepicker";

const THEME = {
  colors: {
    background: "#F8FAFC",
    white: "#FFFFFF",
    textMain: "#0F172A",
    textSecondary: "#64748B",
    bluePrimary: "#1f3d5c",
    border: "#E2E8F0",
    red: "#EF4444",
  },
};

export default function AdjustTimeScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();
  const { date, checkIn, checkOut, sessionId } = params;

  const [requestType, setRequestType] = useState<"check_in" | "check_out">("check_in");
  const [adjustedTime, setAdjustedTime] = useState<Date>(
    requestType === "check_in" && checkIn ? new Date(checkIn as string) :
    requestType === "check_out" && checkOut ? new Date(checkOut as string) :
    new Date()
  );
  const [showPicker, setShowPicker] = useState(false);
  const [reason, setReason] = useState("");

  const originalTimeStr = requestType === "check_in" ? checkIn : checkOut;

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/time-adjustments/request", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker", "attendance", "history"] });
      Alert.alert("Success", "Time adjustment request submitted to your admin.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.response?.data?.message || err.message || "Failed to submit request");
    }
  });

  const handleSubmit = () => {
    if (!originalTimeStr) {
      Alert.alert("Error", `No existing ${requestType.replace('_', ' ')} record found to adjust.`);
      return;
    }
    submitMutation.mutate({
      date: date as string,
      kind: 'correction',
      scope: 'single_day',
      sessionId: sessionId || undefined,
      requestType,
      originalTime: originalTimeStr,
      adjustedTime: adjustedTime.toISOString(),
      reason
    });
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) setAdjustedTime(selectedDate);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top','left','right']}>
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
        <Text style={{ fontSize: 20, fontWeight: "700", color: THEME.colors.textMain }}>Adjust Time</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontSize: 14, color: THEME.colors.textSecondary, marginBottom: 20 }}>
          Submit a request to change your recorded work time. This requires manager approval.
        </Text>

        <Text style={{ fontSize: 16, fontWeight: "600", color: THEME.colors.textMain, marginBottom: 8 }}>Which time needs adjustment?</Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
          <TouchableOpacity
            style={{
              flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, alignItems: "center",
              borderColor: requestType === "check_in" ? THEME.colors.bluePrimary : THEME.colors.border,
              backgroundColor: requestType === "check_in" ? "#EFF6FF" : THEME.colors.white
            }}
            onPress={() => {
              setRequestType("check_in");
              if (checkIn) setAdjustedTime(new Date(checkIn as string));
            }}
          >
            <Text style={{ fontWeight: "600", color: requestType === "check_in" ? THEME.colors.bluePrimary : THEME.colors.textSecondary }}>Check-In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, alignItems: "center",
              borderColor: requestType === "check_out" ? THEME.colors.bluePrimary : THEME.colors.border,
              backgroundColor: requestType === "check_out" ? "#EFF6FF" : THEME.colors.white
            }}
            onPress={() => {
              setRequestType("check_out");
              if (checkOut) setAdjustedTime(new Date(checkOut as string));
            }}
          >
            <Text style={{ fontWeight: "600", color: requestType === "check_out" ? THEME.colors.bluePrimary : THEME.colors.textSecondary }}>Check-Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 16, fontWeight: "600", color: THEME.colors.textMain, marginBottom: 8 }}>Original Time Recorded</Text>
        <View style={{ backgroundColor: THEME.colors.white, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: THEME.colors.border, marginBottom: 24 }}>
          <Text style={{ fontSize: 16, color: THEME.colors.textMain }}>
            {originalTimeStr ? new Date(originalTimeStr as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "No record found"}
          </Text>
        </View>

        <Text style={{ fontSize: 16, fontWeight: "600", color: THEME.colors.textMain, marginBottom: 8 }}>New Requested Time</Text>
        <TouchableOpacity
          style={{ backgroundColor: THEME.colors.white, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: THEME.colors.border, marginBottom: 24 }}
          onPress={() => setShowPicker(true)}
        >
          <Text style={{ fontSize: 16, color: THEME.colors.textMain }}>
            {adjustedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

        <Text style={{ fontSize: 16, fontWeight: "600", color: THEME.colors.textMain, marginBottom: 8 }}>Reason for Change (Required)</Text>
        <TextInput
          style={{
            backgroundColor: THEME.colors.white,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: THEME.colors.border,
            padding: 12,
            fontSize: 16,
            color: THEME.colors.textMain,
            minHeight: 100,
            textAlignVertical: "top",
            marginBottom: 32,
          }}
          placeholder="I forgot to clock out..."
          placeholderTextColor={THEME.colors.textSecondary}
          multiline
          value={reason}
          onChangeText={setReason}
        />

        <TouchableOpacity
          style={{
            backgroundColor: !reason.trim() || !originalTimeStr ? THEME.colors.border : THEME.colors.bluePrimary,
            padding: 16,
            borderRadius: 12,
            alignItems: "center",
          }}
          disabled={!reason.trim() || !originalTimeStr || submitMutation.isPending}
          onPress={handleSubmit}
        >
          {submitMutation.isPending ? (
            <ActivityIndicator color={THEME.colors.white} />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "700", color: !reason.trim() || !originalTimeStr ? THEME.colors.textSecondary : THEME.colors.white }}>
              Submit Request
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
