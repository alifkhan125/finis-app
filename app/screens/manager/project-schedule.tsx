import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { usePendingTimeAdjustmentsQuery, useUpdateTimeAdjustmentStatusMutation } from "@/hooks/manager/time-adjustments";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAssignedWorkersQuery, useProjectTeamQuery, useAssignProjectScheduleMutation } from "@/hooks/company/company";
import { useAuthStore } from "@/store/auth.store";
import { usePullToRefresh } from "@/hooks/common/usePullToRefresh";
import { queryClient } from "@/lib/query-client";
import DateTimePicker from "@react-native-community/datetimepicker";

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

export default function ProjectScheduleScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const projectId = params.id as string;
  const [activeTab, setActiveTab] = useState<"assign" | "requests">("assign");
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  
  const [startTime, setStartTime] = useState(new Date(new Date().setHours(8, 0, 0, 0)));
  const [endTime, setEndTime] = useState(new Date(new Date().setHours(17, 0, 0, 0)));
  const [showTimePicker, setShowTimePicker] = useState<"start" | "end" | null>(null);

  const currentUser = useAuthStore((state) => state.user);
  const isManager = currentUser?.role === "manager";

  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    if (!projectId) return;
    if (isManager && currentUser?.id) {
      await queryClient.invalidateQueries({ queryKey: ["project", "assigned-workers", projectId, currentUser.id] });
    } else {
      await queryClient.invalidateQueries({ queryKey: ["project", "team", projectId] });
    }
    await queryClient.invalidateQueries({ queryKey: ["time-adjustments", "pending"] });
  });

  // Fetch all workers for admin, or assigned workers for manager
  const { data: projectTeamData, isLoading: isProjectTeamLoading } = useProjectTeamQuery(isManager ? undefined : projectId);
  const { data: assignedWorkers = [], isLoading: isAssignedWorkersLoading } = useAssignedWorkersQuery(
    isManager ? projectId : undefined,
    isManager ? currentUser?.id : null
  );

  let workers: any[] = [];
  if (isManager) {
    workers = assignedWorkers.map((u: any) => ({
      ...u,
      schedule: u.workScheduleAssignments?.[0]?.schedule,
    }));
  } else if (projectTeamData?.workers) {
    // team API returns workers with user data
    workers = projectTeamData.workers.map((w: any) => {
      const u = w.user || w;
      return {
        id: u.id,
        fullName: u.fullName,
        role: u.role,
        avatarUrl: u.avatarUrl,
        schedule: u.workScheduleAssignments?.[0]?.schedule,
      };
    });
  }
  const isProjectLoading = isManager ? isAssignedWorkersLoading : isProjectTeamLoading;

  const toggleWorkerSelection = (workerId: string) => {
    setSelectedWorkerIds(prev => 
      prev.includes(workerId) 
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  // Fetch requests
  const { data: requests, isLoading: isRequestsLoading } = usePendingTimeAdjustmentsQuery();
  const updateMutation = useUpdateTimeAdjustmentStatusMutation();
  const assignMutation = useAssignProjectScheduleMutation(projectId);

  const handleAction = (id: string, status: "approved" | "denied") => {
    Alert.alert(
      "Confirm Action",
      `Are you sure you want to ${status} this request?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          style: status === "denied" ? "destructive" : "default",
          onPress: () => updateMutation.mutate({ id, status }),
        },
      ]
    );
  };

  const handleAssignSchedule = () => {
    if (selectedWorkerIds.length === 0) {
      Alert.alert("Error", "Please select at least one worker to assign the schedule.");
      return;
    }
    
    const formattedStartTime = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedEndTime = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    assignMutation.mutate({
      userIds: selectedWorkerIds,
      startTime: formattedStartTime,
      endTime: formattedEndTime
    }, {
      onSuccess: () => {
        setSelectedWorkerIds([]);
      }
    });
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
        <Text style={{ fontSize: 20, fontWeight: "700", color: THEME.colors.textMain }}>Time & Schedule</Text>
      </View>

      <View style={{ flexDirection: "row", backgroundColor: THEME.colors.white, borderBottomWidth: 1, borderBottomColor: THEME.colors.border }}>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 16, borderBottomWidth: 2, borderBottomColor: activeTab === "assign" ? THEME.colors.bluePrimary : "transparent", alignItems: "center" }}
          onPress={() => setActiveTab("assign")}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: activeTab === "assign" ? THEME.colors.bluePrimary : THEME.colors.textSecondary }}>Assign Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 16, borderBottomWidth: 2, borderBottomColor: activeTab === "requests" ? THEME.colors.bluePrimary : "transparent", alignItems: "center" }}
          onPress={() => setActiveTab("requests")}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: activeTab === "requests" ? THEME.colors.bluePrimary : THEME.colors.textSecondary }}>Pending Requests</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
            colors={["#3B82F6"]}
          />
        }
      >
        {activeTab === "requests" && (
          isRequestsLoading ? (
            <ActivityIndicator size="large" color={THEME.colors.bluePrimary} style={{ marginTop: 40 }} />
          ) : (console.log("REQUESTS FRONTEND:", requests), requests && requests.length > 0) ? (
            requests.map((req: any) => (
              <View key={req.id} style={{ backgroundColor: THEME.colors.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: THEME.colors.border }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: THEME.colors.textMain }}>{req.worker?.fullName || "Worker"}</Text>
                    <Text style={{ fontSize: 12, color: THEME.colors.textSecondary }}>
                      {new Date(req.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#D97706", textTransform: 'capitalize' }}>{req.requestType.replace('_', ' ')}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color={THEME.colors.textSecondary} />
                  <Text style={{ fontSize: 14, color: THEME.colors.textSecondary, marginLeft: 4, textDecorationLine: 'line-through' }}>
                    {new Date(req.originalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Feather name="arrow-right" size={16} color={THEME.colors.textSecondary} style={{ marginHorizontal: 8 }} />
                  <Text style={{ fontSize: 14, fontWeight: "600", color: THEME.colors.bluePrimary }}>
                    {new Date(req.adjustedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {req.reason && (
                  <View style={{ backgroundColor: "#F1F5F9", padding: 10, borderRadius: 8, marginBottom: 12 }}>
                    <Text style={{ fontSize: 13, color: THEME.colors.textMain }}>{`"${req.reason}"`}</Text>
                  </View>
                )}

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => handleAction(req.id, "denied")}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: THEME.colors.border, alignItems: 'center' }}
                    disabled={updateMutation.isPending}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "600", color: THEME.colors.textMain }}>Deny</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleAction(req.id, "approved")}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: THEME.colors.bluePrimary, alignItems: 'center' }}
                    disabled={updateMutation.isPending}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "600", color: THEME.colors.white }}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Feather name="inbox" size={48} color="#CBD5E1" />
              <Text style={{ fontSize: 16, color: THEME.colors.textSecondary, marginTop: 16 }}>No pending requests.</Text>
            </View>
          )
        )}

        {activeTab === "assign" && (
          <View>
            {isProjectLoading ? (
              <ActivityIndicator size="large" color={THEME.colors.bluePrimary} style={{ marginTop: 40 }} />
            ) : workers && workers.length > 0 ? (
              <View>
                <Text style={{ fontSize: 16, fontWeight: "600", color: THEME.colors.textMain, marginBottom: 12 }}>
                  Select Workers to Assign
                </Text>
                {workers.map((member: any) => (
                  <View key={member.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: THEME.colors.border }}>
                    <TouchableOpacity
                      style={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: 4, 
                        borderWidth: 1, 
                        borderColor: selectedWorkerIds.includes(member.id) ? THEME.colors.bluePrimary : THEME.colors.border, 
                        backgroundColor: selectedWorkerIds.includes(member.id) ? THEME.colors.bluePrimary : THEME.colors.white, 
                        marginRight: 12,
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      onPress={() => toggleWorkerSelection(member.id)}
                    >
                      {selectedWorkerIds.includes(member.id) && (
                        <Feather name="check" size={16} color={THEME.colors.white} />
                      )}
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: "500", color: THEME.colors.textMain }}>{member.fullName || "Worker"}</Text>
                      <Text style={{ fontSize: 12, color: THEME.colors.textSecondary }}>{member.role || "Role"}</Text>
                    </View>
                    <View style={{ backgroundColor: "#F1F5F9", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: "500", color: THEME.colors.bluePrimary }}>
                        {member.schedule ? `${member.schedule.startTime} - ${member.schedule.endTime}` : "8:00 AM - 5:00 PM"}
                      </Text>
                    </View>
                  </View>
                ))}

                <Text style={{ fontSize: 16, fontWeight: "600", color: THEME.colors.textMain, marginTop: 24, marginBottom: 8 }}>Schedule Details</Text>
                
                <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
                  <TouchableOpacity 
                    onPress={() => setShowTimePicker("start")}
                    style={{ flex: 1, backgroundColor: THEME.colors.white, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: THEME.colors.border }}
                  >
                    <Text style={{ fontSize: 12, color: THEME.colors.textSecondary, marginBottom: 4 }}>Start Time</Text>
                    <Text style={{ fontSize: 16, color: THEME.colors.textMain }}>
                      {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setShowTimePicker("end")}
                    style={{ flex: 1, backgroundColor: THEME.colors.white, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: THEME.colors.border }}
                  >
                    <Text style={{ fontSize: 12, color: THEME.colors.textSecondary, marginBottom: 4 }}>End Time</Text>
                    <Text style={{ fontSize: 16, color: THEME.colors.textMain }}>
                      {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showTimePicker && (
                  <DateTimePicker
                    value={showTimePicker === "start" ? startTime : endTime}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowTimePicker(null);
                      if (selectedDate) {
                        if (showTimePicker === "start") setStartTime(selectedDate);
                        else setEndTime(selectedDate);
                      }
                    }}
                  />
                )}

                <TouchableOpacity
                  onPress={handleAssignSchedule}
                  disabled={assignMutation.isPending}
                  style={{
                    backgroundColor: THEME.colors.bluePrimary,
                    padding: 16,
                    borderRadius: 12,
                    alignItems: "center",
                    opacity: assignMutation.isPending ? 0.7 : 1
                  }}
                >
                  {assignMutation.isPending ? (
                    <ActivityIndicator color={THEME.colors.white} />
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: "700", color: THEME.colors.white }}>
                      Assign Schedule
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ alignItems: "center", marginTop: 60 }}>
                <Feather name="users" size={48} color="#CBD5E1" />
                <Text style={{ fontSize: 16, color: THEME.colors.textSecondary, marginTop: 16 }}>No workers found in this project.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
