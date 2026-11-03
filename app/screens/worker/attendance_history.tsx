import React from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

const THEME = {
  colors: {
    background: "#F8FAFC",
    white: "#FFFFFF",
    textMain: "#0F172A",
    textSecondary: "#64748B",
    bluePrimary: "#1f3d5c",
    border: "#E2E8F0",
    green: "#22C55E",
    red: "#EF4444",
  },
};

export default function AttendanceHistoryScreen() {
  const { data: attendanceData, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["worker", "attendance", "history"],
    queryFn: async () => {
      const { data } = await api.get("/worker/attendance/history?page=1&limit=50");
      if (!data.success) throw new Error(data.message);
      return data.data; // data.data.data has the array based on NestJS Pagination, let's assume data.data.data
    },
  });

  const attendances = attendanceData?.data || attendanceData || [];

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
        <Text style={{ fontSize: 20, fontWeight: "700", color: THEME.colors.textMain }}>Attendance History</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[THEME.colors.bluePrimary]} />}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={THEME.colors.bluePrimary} style={{ marginTop: 40 }} />
        ) : attendances.length > 0 ? (
          attendances.map((attendance: any) => {
            const date = new Date(attendance.date);
            const firstSession = attendance.sessions?.[0];
            const lastSession = attendance.sessions?.[attendance.sessions.length - 1];
            let computedHours = 0;
            if (attendance.sessions && attendance.sessions.length > 0) {
              attendance.sessions.forEach((s: any) => {
                if (s.checkInTime && s.checkOutTime) {
                  const diff = new Date(s.checkOutTime).getTime() - new Date(s.checkInTime).getTime();
                  computedHours += diff / (1000 * 60 * 60);
                }
              });
            }
            const displayHours = attendance.totalHours || computedHours;

            const formatHours = (hours: number) => {
              if (!hours || hours <= 0) return '--';
              const h = Math.floor(hours);
              const m = Math.round((hours - h) * 60);
              if (h > 0 && m > 0) return `${h}h ${m}m`;
              if (h > 0) return `${h}h`;
              if (m > 0) return `${m}m`;
              return '--';
            };

            return (
              <View
                key={attendance.id}
                style={{
                  backgroundColor: THEME.colors.white,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: THEME.colors.border,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <View style={{ backgroundColor: '#EEF2FF', padding: 12, borderRadius: 12, marginRight: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#4F46E5', textAlign: 'center' }}>
                    {date.getDate() || "--"}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#4F46E5', textAlign: 'center', textTransform: 'uppercase' }}>
                    {!isNaN(date.getTime()) ? date.toLocaleDateString('en-US', { month: 'short' }) : "ERR"}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  {/* Row 1: Day and Status Badge */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: THEME.colors.textMain }}>
                      {!isNaN(date.getTime()) ? date.toLocaleDateString('en-US', { weekday: 'long' }) : "Unknown Day"}
                    </Text>
                    <View style={{ minHeight: 24, justifyContent: 'center' }}>
                      {attendance.adjustmentStatus === 'pending' && (
                        <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                          <Text style={{ fontSize: 12, color: '#D97706', fontWeight: "700" }}>Pending</Text>
                        </View>
                      )}
                      {attendance.adjustmentStatus === 'approved' && (
                        <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                          <Text style={{ fontSize: 12, color: '#16A34A', fontWeight: "700" }}>Approved</Text>
                        </View>
                      )}
                      {attendance.adjustmentStatus === 'rejected' && (
                        <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                          <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: "700" }}>Rejected</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Row 2: In/Out Times and Work Time */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginRight: 12 }}>
                        <MaterialCommunityIcons name="clock-in" size={16} color={THEME.colors.green} />
                        <Text style={{ fontSize: 14, color: THEME.colors.textSecondary, marginLeft: 2 }}>
                          {firstSession?.checkInTime ? new Date(firstSession.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <MaterialCommunityIcons name="clock-out" size={16} color={THEME.colors.red} />
                        <Text style={{ fontSize: 14, color: THEME.colors.textSecondary, marginLeft: 2 }}>
                          {lastSession?.checkOutTime ? new Date(lastSession.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {/* <Text style={{ fontSize: 12, color: THEME.colors.textSecondary, marginBottom: 2 }}>Work Time</Text> */}
                      <Text style={{ fontSize: 16, fontWeight: "700", color: THEME.colors.textMain }}>
                        {formatHours(displayHours)}
                      </Text>
                    </View>
                  </View>

                  <AttendanceBreakdown calculation={attendance.calculation} date={attendance.date} />
                  {/* Row 3: Requested Time and Adjust Button */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <View style={{ flex: 1 }}>
                      {attendance.adjustmentRequestedTime ? (
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <MaterialCommunityIcons name="clock-edit-outline" size={14} color={THEME.colors.bluePrimary} />
                          <Text style={{ fontSize: 12, color: THEME.colors.textSecondary, marginLeft: 4 }}>
                            Req {attendance.adjustmentRequestType === 'check_in' ? 'in' : 'out'}: <Text style={{ fontWeight: '600', color: THEME.colors.bluePrimary }}>{new Date(attendance.adjustmentRequestedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                            <Text style={{ fontSize: 10, color: attendance.adjustmentStatus === 'pending' ? '#D97706' : attendance.adjustmentStatus === 'approved' ? '#16A34A' : '#DC2626' }}> ({attendance.adjustmentStatus})</Text>
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {attendance.adjustmentStatus !== 'pending' && (
                      <TouchableOpacity
                        onPress={() => router.push({
                          pathname: "/screens/worker/adjust-time",
                          params: { date: date.toISOString(), checkIn: firstSession?.checkInTime, checkOut: lastSession?.checkOutTime }
                        })}
                        style={{
                          backgroundColor: THEME.colors.bluePrimary,
                          paddingHorizontal: 4,
                          paddingVertical: 2,
                          borderRadius: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 12, color: THEME.colors.white, fontWeight: "600" }}>Adjust</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <MaterialCommunityIcons name="clipboard-text-clock-outline" size={64} color="#CBD5E1" />
            <Text style={{ fontSize: 16, color: THEME.colors.textSecondary, marginTop: 16 }}>No attendance history found.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
import AttendanceBreakdown from '@/components/worker/AttendanceBreakdown';
