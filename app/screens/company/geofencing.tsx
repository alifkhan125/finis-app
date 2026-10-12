import BackTitleHeader from "@/components/common/BackTitleHeader";
import GeofenceMapCard from "@/components/company/geofencing/GeofenceMapCard";
import GeofencingSummaryCard from "@/components/company/geofencing/GeofencingSummaryCard";
import LiveTrackerCard from "@/components/company/geofencing/LiveTrackerCard";
import LocationLogsCard from "@/components/company/geofencing/LocationLogsCard";
import MapLegend from "@/components/company/geofencing/MapLegend";
import ZoneConfigurationCard from "@/components/company/geofencing/ZoneConfigurationCard";
import ZoneViolationAlertCard from "@/components/company/geofencing/ZoneViolationAlertCard";
import { LocationLog } from "@/components/company/geofencing/types";
import { useAdminProjectsQuery } from "@/hooks/admin/admin";
import {
  useCreateProjectGeofenceMutation,
  useProjectGeofenceLocationLogsQuery,
  useProjectGeofenceTimeSummaryQuery,
  useProjectGeofenceViolationsQuery,
  useProjectGeofencesQuery,
  useUpdateProjectGeofenceMutation,
} from "@/hooks/company/company";
import { usePullToRefresh } from "@/hooks/common/usePullToRefresh";
import { API_BASE_URL } from "@/lib/config";
import { useAuthStore } from "@/store/auth.store";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
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

export default function GeofencingRoute() {
  const { id: companyIdParam } = useLocalSearchParams<{ id?: string }>();
  const companyId = typeof companyIdParam === "string" ? companyIdParam : undefined;
  const { data: projects = [], isLoading: projectsLoading } = useAdminProjectsQuery();
  const [isProjectSheetVisible, setIsProjectSheetVisible] = useState(false);
  const [isFullHistoryVisible, setIsFullHistoryVisible] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [draftPoints, setDraftPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [liveWorkers, setLiveWorkers] = useState<{ workerId: string; workerName: string; lat: number; lng: number; isInsideZone?: boolean }[]>([]);
  const [mapReloadToken, setMapReloadToken] = useState(0);
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const socketRef = React.useRef<Socket | null>(null);
  const hasInitializedProjectRef = React.useRef(false);
  const draftPointsByProjectRef = React.useRef<Record<string, { lat: number; lng: number }[]>>({});
  const hiddenWorkerIdsRef = React.useRef(new Set<string>());

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

  const visibleProjects = React.useMemo(() => {
    if (!companyId) {
      return projects;
    }

    return projects.filter((project) => project.company?.id === companyId);
  }, [companyId, projects]);

  React.useEffect(() => {
    if (visibleProjects.length === 0) {
      setSelectedProjectId(undefined);
      hasInitializedProjectRef.current = false;
      return;
    }

    const selectedProjectExists = visibleProjects.some((project) => project.id === selectedProjectId);

    if (!hasInitializedProjectRef.current || (!selectedProjectId && !selectedProjectExists)) {
      setSelectedProjectId(visibleProjects[0].id);
      hasInitializedProjectRef.current = true;
    }
  }, [visibleProjects, selectedProjectId]);

  React.useEffect(() => {
    if (!token || !selectedProjectId) {
      return;
    }

    const socket = io(`${API_BASE_URL}/geofencing`, {
      transports: ["websocket", "polling"],
      auth: { token },
    });
    socketRef.current = socket;

    const joinProject = () => {
      console.log("[Geofencing] join_project emit", { projectId: selectedProjectId });
      socket.emit("join_project", { projectId: selectedProjectId });
      socket.emit("get_live_workers", { projectId: selectedProjectId });
    };

    const applyLiveWorkers = (payload: { workers?: { workerId: string; workerName: string; lat: number; lng: number; isInsideZone?: boolean }[] }) => {
      setLiveWorkers((payload.workers ?? []).filter((worker) => !hiddenWorkerIdsRef.current.has(worker.workerId)));
    };

    const handleActiveWorkers = (payload: { workers?: { workerId: string; workerName: string; lat: number; lng: number; isInsideZone?: boolean }[] }) => {
      console.log("[Geofencing] active_workers:", payload);
      applyLiveWorkers(payload);
    };

    const handleLiveWorkers = (payload: { workers?: { workerId: string; workerName: string; lat: number; lng: number; isInsideZone?: boolean }[] }) => {
      console.log("[Geofencing] live_workers:", payload);
      applyLiveWorkers(payload);
    };

    const handleWorkerLocation = (payload: { workerId: string; workerName: string; lat: number; lng: number; isInsideZone?: boolean }) => {
      console.log("[Geofencing] worker_location:", payload);
      if (hiddenWorkerIdsRef.current.has(payload.workerId)) {
        return;
      }
      setLiveWorkers((current) => {
        const next = current.filter((worker) => worker.workerId !== payload.workerId);
        next.push(payload);
        return next;
      });
    };

    const handleWorkerCheckIn = (payload: { worker: { id: string; fullName: string }; isInsideZone?: boolean }) => {
      console.log("[Geofencing] worker_checked_in:", payload);
      hiddenWorkerIdsRef.current.delete(payload.worker.id);
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
      console.log("[Geofencing] worker_checked_out:", payload);
      const workerId = payload.workerId ?? payload.worker?.id;
      if (!workerId) {
        return;
      }
      hiddenWorkerIdsRef.current.add(workerId);
      setLiveWorkers((current) => current.filter((worker) => worker.workerId !== workerId));
    };

    const handleLocationSharingStopped = (payload: { workerId?: string; workerName?: string }) => {
      console.log("[Geofencing] location_sharing_stopped:", payload);
      const workerId = payload.workerId;
      if (!workerId) {
        return;
      }
      hiddenWorkerIdsRef.current.add(workerId);
      setLiveWorkers((current) => current.filter((worker) => worker.workerId !== workerId));
    };

    socket.on("connect", () => {
      console.log("[Geofencing] socket connected", {
        socketId: socket.id,
        selectedProjectId,
      });
    });

    socket.on("connect_error", (error) => {
      console.log("[Geofencing] socket connect_error", error?.message ?? error);
    });

    socket.on("joined_project", (payload) => {
      console.log("[Geofencing] joined_project:", payload);
    });

    socket.on("error", (error) => {
      console.log("[Geofencing] socket error:", error?.message ?? error);
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
      socket.off("joined_project");
      socket.off("error");
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
  }, [selectedProjectId, token]);

  React.useEffect(() => {
    if (!selectedProjectId) return;
    setDraftPoints(draftPointsByProjectRef.current[selectedProjectId] ?? []);
  }, [selectedProjectId]);

  const selectedProject = visibleProjects.find((project) => project.id === selectedProjectId);
  const geofencesQuery = useProjectGeofencesQuery(selectedProjectId);
  const logsQuery = useProjectGeofenceLocationLogsQuery(selectedProjectId);
  const violationsQuery = useProjectGeofenceViolationsQuery(selectedProjectId);
  const summaryQuery = useProjectGeofenceTimeSummaryQuery(selectedProjectId);
  const createGeofenceMutation = useCreateProjectGeofenceMutation(selectedProjectId);
  const updateGeofenceMutation = useUpdateProjectGeofenceMutation(selectedProjectId);

  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await Promise.all([
      geofencesQuery.refetch(),
      logsQuery.refetch(),
      violationsQuery.refetch(),
      summaryQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: ["project", "geofences"] }),
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
  const isZoneEditable = !selectedGeofence || selectedGeofence.isActive;

  React.useEffect(() => {
    if (isZoneEditable) {
      return;
    }

    setDraftPoints([]);
    if (selectedProjectId) {
      draftPointsByProjectRef.current[selectedProjectId] = [];
    }
  }, [isZoneEditable, selectedProjectId]);

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

  

  return (
    <SafeAreaView edges={['top','left',"right"]} className="flex-1 bg-[#E9EDF1]">
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

        <GeofencingSummaryCard
          onAddNewZonePress={() => {
            if (!selectedProjectId) {
              setIsProjectSheetVisible(true);
              return;
            }
          }}
          onProjectPress={() => setIsProjectSheetVisible(true)}
          name={selectedProject?.name}
        />
        <View className="px-5 pt-2">
          <Text className="text-[14px] text-[#66707B]">
            Tap on the map to draw your zone. Use Undo/Clear if needed.
          </Text>
        </View>

        <GeofenceMapCard
          projectName={selectedProject?.name}
          projectSite={selectedProject?.location}
          initialPolygonCoords={isZoneEditable ? selectedGeofence?.polygonCoords ?? [] : []}
          isEditingEnabled={isZoneEditable}
          liveWorkers={liveWorkers}
          onPolygonChange={setDraftPoints}
          onMapReady={() => {
            if (selectedProjectId && socketRef.current) {
              socketRef.current.emit("get_live_workers", { projectId: selectedProjectId });
            }
          }}
          reloadToken={mapReloadToken}
        />

        <View className="px-5 pt-3">
          <MapLegend />
        </View>

        {selectedProjectId && isZoneEditable ? (
          <View className="px-5 pt-3">
            <Text className="mb-2 text-[12px] text-[#66707B]">
              {draftPoints.length >= 3
                ? `${draftPoints.length} points selected.`
                : "Select at least 3 points to enable save."}
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={draftPoints.length < 3 || createGeofenceMutation.isPending}
              onPress={() => {
                if (!selectedProjectId || draftPoints.length < 3) {
                  return;
                }

                const zonePayload = {
                  zoneName: `${selectedProject?.name ?? "Selected Project"} Zone`,
                  polygonCoords: draftPoints,
                };

                if (selectedGeofence?.id) {
                  void updateGeofenceMutation.mutateAsync({
                    geofenceId: selectedGeofence.id,
                    payload: zonePayload,
                  }).then(() => {
                    setDraftPoints([]);
                    if (selectedProjectId) {
                      draftPointsByProjectRef.current[selectedProjectId] = [];
                    }
                  });
                  return;
                }

                void createGeofenceMutation.mutateAsync(zonePayload).then(() => {
                  setDraftPoints([]);
                  if (selectedProjectId) {
                    draftPointsByProjectRef.current[selectedProjectId] = [];
                  }
                });
              }}
              className={`h-[48px] items-center justify-center rounded-[12px] ${
                draftPoints.length >= 3 &&
                !createGeofenceMutation.isPending &&
                !updateGeofenceMutation.isPending
                  ? "bg-[#1D5478]"
                  : "bg-[#AAB7C2]"
              }`}
            >
              <Text className="text-[15px] font-semibold text-white">
                {createGeofenceMutation.isPending || updateGeofenceMutation.isPending
                  ? "Saving..."
                  : "Save Zone"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <ZoneConfigurationCard
          projectId={selectedProjectId}
          geofenceId={selectedGeofence?.id}
          zoneName={selectedGeofence?.zoneName ?? selectedProject?.name}
          isActive={selectedGeofence?.isActive ?? false}
          definedAt={selectedGeofence ? "Saved zone" : undefined}
          totalAreaSqft={selectedGeofence?.totalAreaSqft ?? polygonMetrics.totalAreaSqft}
          perimeterFt={selectedGeofence?.perimeterFt ?? polygonMetrics.perimeterFt}
          centerPoint={polygonMetrics.centerPoint}
          monitoringMode="Polygon"
        />
        <LiveTrackerCard
          workersOnSite={liveTrackerStats.workersOnSite}
          outsideZone={liveTrackerStats.outsideZone}
          liveStatus={selectedGeofence ? "Live" : "No Zone"}
        />
        <LocationLogsCard logs={logs} onViewFullHistory={() => setIsFullHistoryVisible(true)} />
        <ZoneViolationAlertCard
          distanceM={latestViolation?.distanceM}
          occurredAt={latestViolation?.occurredAt}
          geofenceName={latestViolation?.geofenceName}
          description={latestViolation?.description}
          onViewDetails={() => setIsFullHistoryVisible(true)}
        />
      </ScrollView>

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

      <Modal
        visible={isProjectSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsProjectSheetVisible(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/35"
          onPress={() => setIsProjectSheetVisible(false)}
        >
          <Pressable
            className="max-h-[78%] flex-1 rounded-t-[24px] bg-white px-5 pb-6 pt-4"
            onPress={(event) => event.stopPropagation()}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-[18px] font-semibold text-[#1F2328]">
                Select Project
              </Text>
              <TouchableOpacity onPress={() => setIsProjectSheetVisible(false)}>
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
              {projectsLoading ? (
                <View className="items-center py-8">
                  <ActivityIndicator size="small" color="#1d4f6d" />
                </View>
              ) : (
                visibleProjects.map((project) => {
                  const isSelected = selectedProjectId === project.id;
                  return (
                    <TouchableOpacity
                      key={project.id}
                      activeOpacity={0.85}
                      onPress={() => {
                        if (selectedProjectId) {
                          draftPointsByProjectRef.current[selectedProjectId] = draftPoints;
                        }
                        setSelectedProjectId(project.id);
                        setIsProjectSheetVisible(false);
                        hasInitializedProjectRef.current = true;
                      }}
                      className={`mb-3 rounded-[12px] border px-4 py-4 ${
                        isSelected
                          ? "border-[#1E5371] bg-[#EAF3F7]"
                          : "border-[#D7DDE4] bg-[#F8FAFC]"
                      }`}
                    >
                      <Text className="text-[16px] font-medium text-[#1F2328]">
                        {project.name}
                      </Text>
                      <Text className="mt-0.5 text-[13px] text-[#66707B]">
                        {project.location}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
