import BackTitleHeader from "@/components/common/BackTitleHeader";
import GeofenceMapCard from "@/components/company/geofencing/GeofenceMapCard";
import GeofencingSummaryCard from "@/components/company/geofencing/GeofencingSummaryCard";
import LiveTrackerCard from "@/components/company/geofencing/LiveTrackerCard";
import LocationLogsCard from "@/components/company/geofencing/LocationLogsCard";
import MapLegend from "@/components/company/geofencing/MapLegend";
import ZoneConfigurationCard from "@/components/company/geofencing/ZoneConfigurationCard";
import ZoneViolationAlertCard from "@/components/company/geofencing/ZoneViolationAlertCard";
import { LocationLog } from "@/components/company/geofencing/types";
import {
  useCreateProjectGeofenceMutation,
  useProjectGeofenceLocationLogsQuery,
  useProjectGeofenceTimeSummaryQuery,
  useProjectGeofenceViolationsQuery,
  useProjectGeofencesQuery,
  useProjectProfileQuery,
  useUpdateProjectGeofenceMutation,
} from "@/hooks/company/company";
import { usePullToRefresh } from "@/hooks/common/usePullToRefresh";
import { API_BASE_URL } from "@/lib/config";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/auth.store";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { io, type Socket } from "socket.io-client";

export default function ManagerGeofencingRoute() {
  const { id: projectIdParam } = useLocalSearchParams<{ id?: string }>();
  const projectId = typeof projectIdParam === "string" ? projectIdParam : undefined;
  const [draftPoints, setDraftPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [liveWorkers, setLiveWorkers] = useState<{ workerId: string; workerName: string; lat: number; lng: number; isInsideZone?: boolean }[]>([]);
  const [isFullHistoryVisible, setIsFullHistoryVisible] = useState(false);
  const [mapReloadToken, setMapReloadToken] = useState(0);
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.user?.role);
  const isManager = role?.toLowerCase() === "manager";
  const socketRef = useRef<Socket | null>(null);
  const { data: project, isLoading: projectLoading } = useProjectProfileQuery(projectId);
  const geofencesQuery = useProjectGeofencesQuery(projectId);
  const logsQuery = useProjectGeofenceLocationLogsQuery(projectId);
  const violationsQuery = useProjectGeofenceViolationsQuery(projectId);
  const summaryQuery = useProjectGeofenceTimeSummaryQuery(projectId);
  const createGeofenceMutation = useCreateProjectGeofenceMutation(projectId);
  const updateGeofenceMutation = useUpdateProjectGeofenceMutation(projectId);

  const getLocationLogStatus = (eventType?: string) => {
    const normalized = (eventType ?? "").toLowerCase();
    return ["check_in", "enter"].some((type) => normalized.includes(type))
      ? "Login"
      : ["check_out", "exit"].some((type) => normalized.includes(type))
        ? "Logout"
        : normalized.includes("in_zone")
          ? "In Zone"
          : normalized.includes("out_of_zone")
            ? "Out of Zone"
        : "Out of Zone";
  };

  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await Promise.all([
      geofencesQuery.refetch(),
      logsQuery.refetch(),
      violationsQuery.refetch(),
      summaryQuery.refetch(),
      projectId
        ? queryClient.invalidateQueries({ queryKey: ["project", "profile", projectId] })
        : Promise.resolve(),
    ]);
    setMapReloadToken((current) => current + 1);
  });

  const logs: LocationLog[] = useMemo(() => {
    return (logsQuery.data?.data ?? []).map((log: any) => ({
      name: log.worker.fullName,
      time: new Date(log.loggedAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
      location: `${log.lat.toFixed(4)}, ${log.lng.toFixed(4)}`,
      status: getLocationLogStatus(log.eventType),
    }));
  }, [logsQuery.data]);

  const selectedGeofence = useMemo(() => {
    const geofences = geofencesQuery.data ?? [];
    return geofences.find((geofence) => geofence.isActive) ?? geofences[0];
  }, [geofencesQuery.data]);
  const isZoneEditable = !isManager && (!selectedGeofence || selectedGeofence.isActive);

  useEffect(() => {
    if (isZoneEditable) {
      return;
    }

    setDraftPoints([]);
  }, [isZoneEditable]);

  const liveTrackerStats = useMemo(() => {
    const onSite = liveWorkers.filter((worker) => worker.isInsideZone === true).length;
    const outsideZone = liveWorkers.filter((worker) => worker.isInsideZone === false).length;

    return {
      workersOnSite: onSite,
      outsideZone,
    };
  }, [liveWorkers]);

  const latestViolation = useMemo(() => {
    return violationsQuery.data?.data?.[0] ?? null;
  }, [violationsQuery.data]);

  const activePolygon = draftPoints.length >= 3 ? draftPoints : selectedGeofence?.polygonCoords ?? [];

  useEffect(() => {
    if (!token || !projectId) {
      return;
    }

    const socket = io(`${API_BASE_URL}/geofencing`, {
      transports: ["websocket", "polling"],
      auth: { token },
    });
    socketRef.current = socket;

    const joinProject = () => {
      console.log("[ManagerGeofencing] join_project emit", { projectId });
      socket.emit("join_project", { projectId });
      socket.emit("get_live_workers", { projectId });
    };

    const applyLiveWorkers = (payload: { workers?: { workerId: string; workerName: string; lat: number; lng: number; isInsideZone?: boolean }[] }) => {
      setLiveWorkers(payload.workers ?? []);
    };

    const handleActiveWorkers = (payload: { workers?: { workerId: string; workerName: string; lat: number; lng: number; isInsideZone?: boolean }[] }) => {
      console.log("[ManagerGeofencing] active_workers:", payload);
      applyLiveWorkers(payload);
    };

    const handleLiveWorkers = (payload: { workers?: { workerId: string; workerName: string; lat: number; lng: number; isInsideZone?: boolean }[] }) => {
      console.log("[ManagerGeofencing] live_workers:", payload);
      applyLiveWorkers(payload);
    };

    const handleWorkerLocation = (payload: { workerId: string; workerName: string; lat: number; lng: number; isInsideZone?: boolean }) => {
      console.log("[ManagerGeofencing] worker_location:", payload);
      setLiveWorkers((current) => {
        const next = current.filter((worker) => worker.workerId !== payload.workerId);
        next.push(payload);
        return next;
      });
    };

    const handleWorkerCheckIn = (payload: { worker: { id: string; fullName: string }; isInsideZone?: boolean }) => {
      console.log("[ManagerGeofencing] worker_checked_in:", payload);
      setLiveWorkers((current) => {
        const next = current.filter((worker) => worker.workerId !== payload.worker.id);
        next.push({
          workerId: payload.worker.id,
          workerName: payload.worker.fullName,
          lat: 0,
          lng: 0,
          isInsideZone: payload.isInsideZone,
        });
        return next;
      });
    };

    const handleWorkerCheckOut = (payload: { worker?: { id?: string; fullName?: string }; workerId?: string }) => {
      console.log("[ManagerGeofencing] worker_checked_out:", payload);
      const workerId = payload.workerId ?? payload.worker?.id;
      if (!workerId) {
        return;
      }
      setLiveWorkers((current) => current.filter((worker) => worker.workerId !== workerId));
    };

    const handleLocationSharingStopped = (payload: { workerId?: string; workerName?: string }) => {
      console.log("[ManagerGeofencing] location_sharing_stopped:", payload);
      const workerId = payload.workerId;
      if (!workerId) {
        return;
      }
      setLiveWorkers((current) => current.filter((worker) => worker.workerId !== workerId));
    };

    socket.on("connect", () => {
      console.log("[ManagerGeofencing] socket connected", { socketId: socket.id, projectId });
    });
    socket.on("connect_error", (error) => {
      console.log("[ManagerGeofencing] socket connect_error", error?.message ?? error);
    });
    socket.on("error", (error) => {
      console.log("[ManagerGeofencing] socket error:", error?.message ?? error);
    });
    socket.on("joined_project", (payload) => {
      console.log("[ManagerGeofencing] joined_project:", payload);
    });
    socket.on("connect", joinProject);
    socket.on("active_workers", handleActiveWorkers);
    socket.on("live_workers", handleLiveWorkers);
    socket.on("worker_location", handleWorkerLocation);
    socket.on("worker_checked_in", handleWorkerCheckIn);
    socket.on("worker_checked_out", handleWorkerCheckOut);
    socket.on("location_sharing_stopped", handleLocationSharingStopped);
    socket.on("worker_offline", handleLocationSharingStopped);

    if (socket.connected) {
      joinProject();
    }

    return () => {
      socket.off("connect", joinProject);
      socket.off("connect");
      socket.off("connect_error");
      socket.off("error");
      socket.off("joined_project");
      socket.off("active_workers", handleActiveWorkers);
      socket.off("live_workers", handleLiveWorkers);
      socket.off("worker_location", handleWorkerLocation);
      socket.off("worker_checked_in", handleWorkerCheckIn);
      socket.off("worker_checked_out", handleWorkerCheckOut);
      socket.off("location_sharing_stopped", handleLocationSharingStopped);
      socket.off("worker_offline", handleLocationSharingStopped);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId, token]);

  const polygonMetrics = useMemo(() => {
    if (activePolygon.length < 3) {
      return {
        totalAreaSqft: null,
        perimeterFt: null,
        centerPoint: null as { lat: number; lng: number } | null,
      };
    }

    const metersPerDegreeLat = 111_320;
    const avgLat = activePolygon.reduce((sum, point) => sum + point.lat, 0) / activePolygon.length;
    const metersPerDegreeLng = 111_320 * Math.cos((avgLat * Math.PI) / 180);

    const pointsInMeters = activePolygon.map((point) => ({
      x: point.lng * metersPerDegreeLng,
      y: point.lat * metersPerDegreeLat,
    }));

    let area = 0;
    let perimeter = 0;

    for (let index = 0; index < pointsInMeters.length; index += 1) {
      const current = pointsInMeters[index];
      const next = pointsInMeters[(index + 1) % pointsInMeters.length];
      area += current.x * next.y - next.x * current.y;
      perimeter += Math.hypot(next.x - current.x, next.y - current.y);
    }

    area = Math.abs(area) / 2;

    const centerPoint = activePolygon.reduce(
      (accumulator, point) => ({
        lat: accumulator.lat + point.lat,
        lng: accumulator.lng + point.lng,
      }),
      { lat: 0, lng: 0 },
    );

    return {
      totalAreaSqft: area * 10.7639,
      perimeterFt: perimeter * 3.28084,
      centerPoint: {
        lat: centerPoint.lat / activePolygon.length,
        lng: centerPoint.lng / activePolygon.length,
      },
    };
  }, [activePolygon]);

  const isSavingZone = createGeofenceMutation.isPending || updateGeofenceMutation.isPending;
  const canSaveZone = draftPoints.length >= 3 && !isSavingZone;

  if (!projectId) {
    return (
      <SafeAreaView key="geofencing-no-project" edges={['top','left',"right"]} className="flex-1 bg-[#E9EDF1]">
        <BackTitleHeader title="Geofencing" onBack={() => router.back()} />
        <View className="mt-10 items-center px-5">
          <Text className="text-[14px] text-[#66707B]">
            Project not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView key={`geofencing-project-${projectId}`} edges={['top','left',"right"]} className="flex-1 bg-[#E9EDF1]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 36 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1f3d5c"
            colors={["#1f3d5c"]}
          />
        }
      >
        <BackTitleHeader title="Geofencing" onBack={() => router.back()} />

        {projectLoading && !project ? (
          <View key="geofencing-loading" className="mt-10 items-center">
            <ActivityIndicator size="small" color="#1f3d5c" />
            <Text className="mt-2 text-xs text-slate-500">
              Loading project...
            </Text>
          </View>
        ) : null}

        <GeofencingSummaryCard
          key="geofencing-summary"
          onAddNewZonePress={() => {}}
          name={project?.name}
          hideProjectSelector
        />

        {!isManager ? (
          <View key="geofencing-manager-hint" className="px-5 pt-2">
            <Text className="text-[14px] text-[#66707B]">
              Tap on the map to draw your zone. Use Undo/Clear if needed.
            </Text>
          </View>
        ) : null}

        <GeofenceMapCard
          key="geofencing-map"
          projectName={project?.name}
          projectSite={project?.location}
          initialPolygonCoords={
            isManager
              ? selectedGeofence?.polygonCoords ?? []
              : isZoneEditable
                ? selectedGeofence?.polygonCoords ?? []
                : []
          }
          isEditingEnabled={isZoneEditable}
          liveWorkers={liveWorkers}
          onPolygonChange={setDraftPoints}
          onMapReady={() => {
            if (projectId && socketRef.current) {
              socketRef.current.emit("get_live_workers", { projectId });
            }
          }}
          reloadToken={mapReloadToken}
        />

        <View key="geofencing-legend" className="px-5 pt-3">
          <MapLegend />
        </View>

        {isZoneEditable && !isManager ? (
          <View key="geofencing-save-action" className="px-5 pt-3">
            <Text className="mb-2 text-[12px] text-[#66707B]">
              {draftPoints.length >= 3
                ? `${draftPoints.length} points selected.`
                : "Select at least 3 points to enable save."}
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!canSaveZone}
              onPress={() => {
                if (draftPoints.length < 3) {
                  return;
                }

                const zonePayload = {
                  zoneName: `${project?.name ?? "Selected Project"} Zone`,
                  polygonCoords: draftPoints,
                };

                if (selectedGeofence?.id) {
                  void updateGeofenceMutation.mutateAsync({
                    geofenceId: selectedGeofence.id,
                    payload: zonePayload,
                  }).then(() => setDraftPoints([]));
                  return;
                }

                void createGeofenceMutation.mutateAsync(zonePayload).then(() => setDraftPoints([]));
              }}
              className={`h-[48px] items-center justify-center rounded-[12px] ${
                canSaveZone ? "bg-[#1D5478]" : "bg-[#AAB7C2]"
              }`}
            >
              <Text className="text-[15px] font-semibold text-white">
                {isSavingZone ? "Saving..." : "Save Zone"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <ZoneConfigurationCard
          key="geofencing-zone-config"
          projectId={projectId}
          geofenceId={selectedGeofence?.id}
          zoneName={selectedGeofence?.zoneName ?? project?.name}
          isActive={selectedGeofence?.isActive ?? false}
          definedAt={selectedGeofence ? "Saved zone" : undefined}
          totalAreaSqft={selectedGeofence?.totalAreaSqft ?? polygonMetrics.totalAreaSqft}
          perimeterFt={selectedGeofence?.perimeterFt ?? polygonMetrics.perimeterFt}
          centerPoint={polygonMetrics.centerPoint}
          monitoringMode="Polygon"
          showActions={!isManager}
        />

        <LiveTrackerCard
          key="geofencing-live-tracker"
          workersOnSite={liveTrackerStats.workersOnSite}
          outsideZone={liveTrackerStats.outsideZone}
          liveStatus={selectedGeofence ? "Live" : "No Zone"}
        />

        <LocationLogsCard
          key="geofencing-location-logs"
          logs={logs}
          onViewFullHistory={() => setIsFullHistoryVisible(true)}
        />

        <ZoneViolationAlertCard
          key="geofencing-violation-alert"
          distanceM={latestViolation?.distanceM}
          occurredAt={latestViolation?.occurredAt}
          geofenceName={latestViolation?.geofenceName}
          description={latestViolation?.description}
          onViewDetails={() => setIsFullHistoryVisible(true)}
        />
      </ScrollView>

      {isFullHistoryVisible ? (
        <Modal
          visible={isFullHistoryVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsFullHistoryVisible(false)}
        >
        <Pressable
          className="flex-1 justify-end bg-black/35"
          onPress={() => setIsFullHistoryVisible(false)}
        >
          <Pressable
            className="max-h-[82%] flex-1 rounded-t-[24px] bg-white px-5 pb-6 pt-4"
            onPress={(event) => event.stopPropagation()}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-[18px] font-semibold text-[#1F2328]">
                Full Location History
              </Text>
              <TouchableOpacity onPress={() => setIsFullHistoryVisible(false)}>
                <Text className="text-[15px] font-medium text-[#66707B]">
                  Close
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {logs.length === 0 ? (
                <View className="items-center py-10">
                  <Text className="text-[14px] text-[#66707B]">
                    No location history found.
                  </Text>
                </View>
              ) : (
                logs.map((log, index) => (
                  <View
                    key={`${log.name}-${log.time}-${index}`}
                    className={`rounded-[14px] border border-[#E5EAF0] bg-[#F8FAFC] px-4 py-3 ${index !== logs.length - 1 ? "mb-3" : ""}`}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[16px] font-semibold text-[#111827]">
                        {log.name}
                      </Text>
                      <View className="rounded-full border border-[#D3DAE2] bg-white px-3 py-1">
                        <Text className="text-[11px] font-semibold text-[#111827]">
                          {log.status}
                        </Text>
                      </View>
                    </View>
                    <Text className="mt-1 text-[14px] text-[#6B7280]">
                      {log.time} {"\u2022"} {log.location}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      ) : null}
    </SafeAreaView>
  );
}
