import { DEFAULT_AVATAR_URL } from "@/api/auth/auth.constants";
import { getWorkerProjects } from "@/api/worker/attendance.api";
import WorkerGroupedTaskList from "@/components/worker/WorkerGroupedTaskList";
import {
  useCheckInWorkerMutation,
  useCheckOutWorkerMutation,
  useTodayAttendanceQuery,
  useWorkerWeeklyAttendanceSummaryQuery,
} from "@/hooks/worker/attendance";
import { useWorkerProfileQuery } from "@/hooks/profile/profile";
import { useWorkerDashboardQuery } from "@/hooks/worker/dashboard";
import { emitGeofenceCheckIn, emitGeofenceCheckOut, emitGeofenceLocation, useWorkerGeofenceSocket } from "@/lib/worker-geofence-socket";
import { startWorkerLocationTracking, stopWorkerLocationTracking } from "@/lib/worker-location-task";
import { API_BASE_URL } from "@/lib/config";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import HomeHeader from "../../components/home/HomeHeader";
import SectionHeader from "../../components/home/SectionHeader";
import StatCard from "../../components/home/StatCard";
import WeeklyActivityItem from "../../components/home/WeeklyActivityItem";
import WorkerStatusCard from "../../components/home/WorkerStatusCard";

function resolveAvatarUrl(avatarUrl?: string | null) {
  if (!avatarUrl) {
    return DEFAULT_AVATAR_URL;
  }
  return avatarUrl;
}

function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function WorkerHome() {
  const insets = useSafeAreaInsets();
  useWorkerGeofenceSocket();
  const { data: profile } = useWorkerProfileQuery();
  const {
    data: dashboard,
    isLoading,
    refetch,
    isRefetching,
  } = useWorkerDashboardQuery();
  const { data: attendance, isLoading: isAttendanceLoading } = useTodayAttendanceQuery();
  const {
    data: weeklySummary,
    isLoading: isWeeklySummaryLoading,
    refetch: refetchWeeklySummary,
  } = useWorkerWeeklyAttendanceSummaryQuery();
  const checkInMutation = useCheckInWorkerMutation();
  const checkOutMutation = useCheckOutWorkerMutation();
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveTrackingRef = useRef(false);
  const attendanceProjectIdRef = useRef<string | null>(null);
  const [attendanceAction, setAttendanceAction] = React.useState<"check-in" | "check-out" | null>(null);
  const [isCheckInSheetVisible, setIsCheckInSheetVisible] = React.useState(false);
  const [selectedCheckInProjectId, setSelectedCheckInProjectId] = React.useState<string | null>(null);

  const {
    data: workerProjects = [],
    isLoading: isWorkerProjectsLoading,
  } = useQuery({
    queryKey: ["worker", "projects"],
    queryFn: getWorkerProjects,
    enabled: isCheckInSheetVisible,
    staleTime: 60 * 1000,
  });

  const avatarUrl = resolveAvatarUrl(profile?.avatarUrl);
  const displayName = profile?.fullName?.trim().split(" ")[0] || "Welcome Back";
  const subtitle = profile?.role ? `${profile.role}!` : "Worker!";
  const activeProjectId = dashboard?.todayTasks?.[0]?.project?.id;

  React.useEffect(() => {
    // console.log("[WorkerHome] dashboard API:", dashboard);
  }, [dashboard]);

  React.useEffect(() => {
    //  console.log("[WorkerHome] attendance API:", JSON.stringify(attendance,null,2));
  }, [attendance]);

  const todayTasksCount = dashboard?.stats?.todayTasksCount ?? 0;
  const completedToday = dashboard?.stats?.completedToday ?? 0;
  const isClockedIn = attendance?.status === "clocked_in";
  const resolvedProjectId = activeProjectId ?? profile?.companyMembers?.[0]?.projectId;
  const weeklyActivity = React.useMemo(
    () =>
      weeklySummary?.days?.map((day) => ({
        day: day.dayLabel,
        date: day.date,
        status: day.totalHoursDisplay,
        type:
          day.totalHours > 0
            ? day.date === formatLocalDateKey(new Date())
              ? ("in-progress" as const)
              : ("completed" as const)
            : ("scheduled" as const),
      })) ?? [],
    [weeklySummary],
  );

  const getClockInTime = () => {
    if (!isClockedIn || !attendance?.currentSessionStart) return undefined;
    return new Date(attendance.currentSessionStart).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const stopLiveUpdates = () => {
    console.log("[WorkerHome] stopLiveUpdates");
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  };

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const sendLocationUpdate = async (coords?: { latitude: number; longitude: number }) => {
    if (!liveTrackingRef.current) {
      console.log("[WorkerHome] sendLocationUpdate skipped: tracking not active");
      return;
    }

    const startedAt = Date.now();
    console.log("[WorkerHome] sendLocationUpdate start", {
      projectId: attendanceProjectIdRef.current ?? resolvedProjectId,
      hasCoords: Boolean(coords),
    });

    try {
      const current = coords
        ? { coords }
        : await (async () => {
            const Location = await import("expo-location");
            return Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
          })();

      console.log("[WorkerHome] sendLocationUpdate GPS ready", {
        elapsedMs: Date.now() - startedAt,
        lat: current.coords.latitude,
        lng: current.coords.longitude,
      });

      const projectId = attendanceProjectIdRef.current ?? resolvedProjectId;
      const payload = {
        lat: current.coords.latitude,
        lng: current.coords.longitude,
        ...(projectId ? { projectId } : {}),
      };

      console.log("[WorkerHome] emitGeofenceLocation", payload);
      emitGeofenceLocation(payload);
    } catch (error) {
      console.log("[WorkerHome] sendLocationUpdate error", error);
    }
  };

  const startLiveUpdates = () => {
    console.log("[WorkerHome] startLiveUpdates");
    stopLiveUpdates();
    locationIntervalRef.current = setInterval(() => {
      void sendLocationUpdate();
    }, 1000);
  };

  const handleCheckIn = async () => {
    if (checkInMutation.isPending || attendanceAction) return;
    setSelectedCheckInProjectId(null);
    setIsCheckInSheetVisible(true);
  };

  const handleConfirmCheckIn = async () => {
    if (checkInMutation.isPending || attendanceAction || !selectedCheckInProjectId) {
      if (!selectedCheckInProjectId) {
        Alert.alert("Select a project", "Please choose a project before checking in.");
      }
      return;
    }

    setAttendanceAction("check-in");

    try {
      const startedAt = Date.now();
      console.log("[WorkerHome] check-in start", {
        projectId: selectedCheckInProjectId,
        activeProjectId,
      });

      const Location = await import("expo-location");
      console.log("[WorkerHome] requestForegroundPermissionsAsync...");
      const permission = await Location.requestForegroundPermissionsAsync();
      console.log("[WorkerHome] location permission result", permission.status);
      if (permission.status !== "granted") {
        Alert.alert("Location permission required", "Please allow location access to check in.");
        return;
      }

      let backgroundPermission: any = null;
      try {
        console.log("[WorkerHome] requestBackgroundPermissionsAsync...");
        backgroundPermission = await Location.requestBackgroundPermissionsAsync();
        console.log("[WorkerHome] background location permission result", backgroundPermission?.status);
        if (backgroundPermission?.status !== "granted") {
          Alert.alert(
            "Background location disabled",
            "Allow background location to keep live tracking active when the app is closed.",
          );
        }
      } catch (bgError) {
        console.warn("[WorkerHome] background location permission not available in current build:", bgError);
      }

      console.log("[WorkerHome] getCurrentPositionAsync...");
      let current: any = null;
      try {
        current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      } catch (locErr) {
        console.warn("[WorkerHome] getCurrentPositionAsync failed, falling back to last known:", locErr);
        current = await Location.getLastKnownPositionAsync({});
      }

      const lat = current?.coords?.latitude ?? 0;
      const lng = current?.coords?.longitude ?? 0;

      console.log("[WorkerHome] GPS resolved for check-in", {
        elapsedMs: Date.now() - startedAt,
        lat,
        lng,
      });

      console.log("[WorkerHome] attendance.checkIn mutateAsync start");
      await checkInMutation.mutateAsync({
        projectId: selectedCheckInProjectId,
        lat,
        lng,
      });
      console.log("[WorkerHome] attendance.checkIn mutateAsync success");
      attendanceProjectIdRef.current = selectedCheckInProjectId;
      liveTrackingRef.current = true;

      const geofencePayload = {
        lat,
        lng,
        projectId: selectedCheckInProjectId,
      };

      console.log("[WorkerHome] emitGeofenceCheckIn", geofencePayload);
      emitGeofenceCheckIn(geofencePayload);

      await wait(800);

      console.log("[WorkerHome] sendLocationUpdate after check-in");
      await sendLocationUpdate({
        latitude: lat,
        longitude: lng,
      });
      if (backgroundPermission?.status === "granted") {
        try {
          await startWorkerLocationTracking();
          console.log("[WorkerHome] background location tracking started");
        } catch (trackingError) {
          console.log("[WorkerHome] startWorkerLocationTracking error", trackingError);
        }
      }
      setIsCheckInSheetVisible(false);
      startLiveUpdates();
    } catch (error: any) {
      console.error("[WorkerHome] handleCheckIn error", error);
      Alert.alert(
        "Check-in Failed",
        error?.message || "An error occurred during check-in. Please try again."
      );
    } finally {
      setAttendanceAction(null);
    }
  };

  const handleCheckOut = async () => {
    if (checkOutMutation.isPending || !isClockedIn || attendanceAction) return;
    setAttendanceAction("check-out");
    liveTrackingRef.current = false;
    stopLiveUpdates();

    try {
      const startedAt = Date.now();
      console.log("[WorkerHome] check-out start", {
        resolvedProjectId,
        activeProjectId,
      });

      const Location = await import("expo-location");
      console.log("[WorkerHome] getLastKnownPositionAsync...");
      const lastKnown = await Location.getLastKnownPositionAsync({});
      let currentLocation =
        lastKnown?.coords ?? null;

      if (!currentLocation) {
        console.log("[WorkerHome] getCurrentPositionAsync...");
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        currentLocation = current.coords;
      }

      if (!currentLocation) {
        console.log("[WorkerHome] checkout location unavailable, using fallback");
      }

      const lat = currentLocation?.latitude ?? 0;
      const lng = currentLocation?.longitude ?? 0;
      console.log("[WorkerHome] GPS resolved for check-out", {
        elapsedMs: Date.now() - startedAt,
        lat,
        lng,
      });

      console.log("[WorkerHome] attendance.checkOut mutateAsync start");
      await checkOutMutation.mutateAsync({
        lat,
        lng,
      });
      console.log("[WorkerHome] attendance.checkOut mutateAsync success");

      const projectId = attendanceProjectIdRef.current ?? resolvedProjectId;
      const geofencePayload = {
        lat,
        lng,
        ...(projectId ? { projectId } : {}),
      };

      console.log("[WorkerHome] emitGeofenceCheckOut", geofencePayload);
      emitGeofenceCheckOut(geofencePayload);
      await stopWorkerLocationTracking();
    } catch (error: any) {
      console.error("[WorkerHome] handleCheckOut error", error);
      Alert.alert(
        "Check-out Failed",
        error?.message || "An error occurred during check-out. Please try again."
      );
    } finally {
      setAttendanceAction(null);
    }
  };

  useEffect(() => {
    if (isAttendanceLoading || !attendance) {
      return;
    }

    if (isClockedIn) {
      void startWorkerLocationTracking().catch((error) => {
        console.log("[WorkerHome] ensureWorkerLocationTracking error", error);
      });
    } else {
      void stopWorkerLocationTracking().catch((error) => {
        console.log("[WorkerHome] stopWorkerLocationTracking error", error);
      });
    }
  }, [attendance, isAttendanceLoading, isClockedIn]);

  useEffect(() => {
    return () => {
      stopLiveUpdates();
      void stopWorkerLocationTracking().catch((error) => {
        console.log("[WorkerHome] cleanup stopWorkerLocationTracking error", error);
      });
    };
  }, []);

  return (
    <SafeAreaView edges={['top','left',"right"]} className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
              void refetchWeeklySummary();
            }}
            tintColor="#1f3d5c"
            colors={["#1f3d5c"]}
          />
        }
      >
        <HomeHeader
          name={displayName}
          subtitle={subtitle}
          avatarUrl={avatarUrl}
          onPressBell={() => router.push("/screens/notifications")}
          onPressAvatar={() => router.push("/worker/profile")}
        />

        {isLoading ? (
          <View className="mt-10 items-center">
            <ActivityIndicator size="small" color="#1f3d5c" />
            <Text className="mt-2 text-xs text-slate-500">
              Loading dashboard...
            </Text>
          </View>
        ) : (
          <>
            <View className="flex-row justify-between px-5 mt-6">
              <StatCard
                icon="trending-up"
                value={String(todayTasksCount)}
                label="Today`s Tasks"
              />
              <StatCard
                icon="people"
                value={String(completedToday)}
                label="Completed"
              />
            </View>

            <View className="mt-4">
              <WorkerStatusCard
                isClockedIn={isClockedIn}
                time={getClockInTime()}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                isCheckingIn={checkInMutation.isPending || attendanceAction === "check-in"}
                isCheckingOut={checkOutMutation.isPending || attendanceAction === "check-out"}
              />
            </View>

            <View className="mt-16">
              <SectionHeader
                title="Today`s Tasks "
                actionLabel="View All"
                onPressAction={() => router.push("/worker/tasks")}
              />
              <View className="mt-2 px-4">
                {(dashboard?.todayTasks?.length ?? 0) > 0 ? (
                  <WorkerGroupedTaskList
                    tasks={dashboard?.todayTasks ?? []}
                    onPressTask={(task) => {
                      const normalizedStatus = (task.status ?? "").toLowerCase().trim();
                      const normalizedApproval = (task.approvalDecision ?? "")
                        .toLowerCase()
                        .trim();
                      const shouldOpenDetails =
                        normalizedStatus === "in_progress" ||
                        normalizedStatus === "review" ||
                        normalizedStatus === "revision" ||
                        normalizedStatus === "completed" ||
                        (normalizedStatus === "completed" && normalizedApproval === "pending");

                      if (shouldOpenDetails) {
                        router.push({
                          pathname: "/screens/worker/taskdetails",
                          params: {
                            id: task.id,
                            taskType: task.taskType ?? "subtask",
                          },
                        });
                        return;
                      }

                      router.push({
                        pathname: "/screens/worker/viewtask",
                        params: {
                          id: task.id,
                          taskType: task.taskType ?? "subtask",
                          taskTitle: task.title || "",
                          taskDescription: task.description || "",
                          projectName: task.project?.name || "",
                          floorName: task.floor?.name || "",
                          roomName: task.room?.name || "",
                          dueDate: task.dueDate || "",
                        },
                      });
                    }}
                    onPressCreateSubtask={(task, context) => {
                      router.push({
                        pathname: "/screens/worker/createsubtask",
                        params: {
                          taskId: task.id,
                          taskTitle: task.title || "Task",
                          floorsJson: JSON.stringify(task.floors ?? []),
                          selectedFloorId: context.floorId,
                          selectedUnitId: context.unitId,
                        },
                      });
                    }}
                  />
                ) : (
                  <View className="items-center py-4">
                    <Text className="text-slate-500 text-sm">
                      No tasks for today.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </>
        )}

        <View className="mt-4 pb-10">
          <SectionHeader
            title="This Week"
            actionLabel="View All"
            onPressAction={() => {}}
          />
          <View className="mx-5 mt-2 rounded-3xl bg-white p-5 border border-slate-100 shadow-sm">
            {isWeeklySummaryLoading && !weeklySummary ? (
              <View className="items-center py-4">
                <ActivityIndicator size="small" color="#1f3d5c" />
                <Text className="mt-2 text-xs text-slate-500">
                  Loading weekly summary...
                </Text>
              </View>
            ) : weeklyActivity.length > 0 ? (
              weeklyActivity.map((item, index) => (
                <WeeklyActivityItem
                  key={`${item.day}-${index}`}
                  day={item.day}
                  date={item.date}
                  status={item.status}
                  type={item.type}
                />
              ))
            ) : (
              <View className="items-center py-4">
                <Text className="text-slate-500 text-sm">
                  No weekly attendance data.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={isCheckInSheetVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setIsCheckInSheetVisible(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setIsCheckInSheetVisible(false)}
        >
          <Pressable
            className="max-h-[78%] rounded-t-[24px] bg-white px-5 pt-4"
            style={{ paddingBottom: Math.max(insets.bottom, 24) + 16 }}
            onPress={() => {}}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-[18px] font-semibold text-[#101828]">
                Select Project
              </Text>
              <Pressable onPress={() => setIsCheckInSheetVisible(false)}>
                <Text className="text-[22px] leading-6 text-[#667085]">×</Text>
              </Pressable>
            </View>

            <Text className="mb-3 text-[13px] text-[#667085]">
              Choose the project you want to check in for.
            </Text>

            {isWorkerProjectsLoading ? (
              <View className="min-h-[140px] items-center justify-center">
                <ActivityIndicator size="small" color="#1f3d5c" />
              </View>
            ) : workerProjects.length > 0 ? (
              <FlatList
                data={workerProjects}
                keyExtractor={(item) => item.projectId}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 12 }}
                renderItem={({ item }) => {
                  const isSelected = selectedCheckInProjectId === item.projectId;
                  return (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setSelectedCheckInProjectId(item.projectId)}
                      style={{
                        borderWidth: 1,
                        borderColor: isSelected ? "#1F5577" : "#E2E8F0",
                        backgroundColor: isSelected ? "#F0F7FB" : "#FFFFFF",
                        borderRadius: 16,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        marginBottom: 12,
                      }}
                    >
                      <Text style={{ fontSize: 16, fontWeight: "600", color: "#101828" }}>
                        {item.projectName}
                      </Text>
                      <Text style={{ marginTop: 4, fontSize: 12, color: "#667085" }}>
                        {item.location || "No location"} • {item.status}
                      </Text>
                      <Text style={{ marginTop: 4, fontSize: 12, color: "#667085" }}>
                        {item.hasZone ? item.zoneName || "Zone available" : "No zone"}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            ) : (
              <View className="min-h-[140px] items-center justify-center">
                <Text className="text-[13px] text-[#667085]">
                  No projects found.
                </Text>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.88}
              disabled={!selectedCheckInProjectId || attendanceAction === "check-in"}
              onPress={handleConfirmCheckIn}
              className="mt-2 rounded-[10px] bg-[#1F5577] px-4 py-4 disabled:opacity-50"
            >
              {attendanceAction === "check-in" ? (
                <ActivityIndicator color="#EAF1F5" />
              ) : (
                <Text className="text-center text-[16px] text-[#EAF1F5]">
                  Confirm Login
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => setIsCheckInSheetVisible(false)}
              className="mt-3 rounded-[10px] border border-[#D0D5DD] bg-white px-4 py-4"
            >
              <Text className="text-center text-[16px] text-[#344054]">
                Cancel
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
