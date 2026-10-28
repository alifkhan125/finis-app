import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { generateMapHTML } from "./mapHtml";

type DeviceLocation = {
  latitude: number;
  longitude: number;
};

type WebViewModule = typeof import("react-native-webview");

type GeofenceMapCardProps = {
  projectName?: string;
  projectSite?: string;
  selectedProjectId?: string;
  initialPolygonCoords?: { lat: number; lng: number }[];
  isEditingEnabled?: boolean;
  liveWorkers?: { workerId: string; workerName: string; lat: number; lng: number; isInsideZone?: boolean }[];
  onPolygonChange?: (points: { lat: number; lng: number }[]) => void;
  onMapReady?: () => void;
  reloadToken?: number;
};

export default function GeofenceMapCard({
  projectName,
  projectSite,
  initialPolygonCoords,
  isEditingEnabled = true,
  liveWorkers,
  onPolygonChange,
  onMapReady,
  reloadToken = 0,
}: GeofenceMapCardProps) {
  const [location, setLocation] = useState<DeviceLocation | null>(null);
  const [locationLabel, setLocationLabel] = useState("Locating your device...");
  const [isFetchingLocation, setIsFetchingLocation] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [webViewModule, setWebViewModule] = useState<WebViewModule | null>(
    null,
  );
  const [webViewUnavailable, setWebViewUnavailable] = useState(false);
  const webViewRef = useRef<any>(null);
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const fallbackLat = 23.7808;
  const fallbackLng = 90.4067;
  const mapHtml = useMemo(
    () =>
      generateMapHTML(
        fallbackLat,
        fallbackLng,
        projectName ?? "Selected Project",
        projectSite ?? "",
        initialPolygonCoords ?? [],
        [],
        googleMapsApiKey,
        isEditingEnabled,
      ),
    [fallbackLat, fallbackLng, googleMapsApiKey, initialPolygonCoords, isEditingEnabled, projectName, projectSite],
  );
  const mapSource = useMemo(() => ({ html: mapHtml }), [mapHtml]);
  const mapSourceKey = useMemo(
    () =>
      JSON.stringify({
        projectName: projectName ?? "",
        projectSite: projectSite ?? "",
        initialPolygonCoords: initialPolygonCoords ?? [],
        isEditingEnabled,
        googleMapsApiKey,
        reloadToken,
      }),
    [googleMapsApiKey, initialPolygonCoords, isEditingEnabled, projectName, projectSite, reloadToken],
  );
  const liveWorkersJson = useMemo(
    () => JSON.stringify(liveWorkers ?? []),
    [liveWorkers],
  );
  const canControlMap = Boolean(webViewRef.current && !webViewUnavailable);

  useEffect(() => {
    setIsMapReady(false);
  }, [mapSourceKey]);

  useEffect(() => {
    let active = true;

    import("react-native-webview")
      .then((module) => {
        if (!active) return;
        setWebViewModule(module);
        setWebViewUnavailable(false);
      })
      .catch(() => {
        if (!active) return;
        setWebViewModule(null);
        setWebViewUnavailable(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isMapReady || !webViewRef.current || webViewUnavailable) {
      return;
    }

    webViewRef.current.injectJavaScript(
      `window.renderLiveWorkers && window.renderLiveWorkers(${liveWorkersJson}); true;`,
    );
  }, [isMapReady, liveWorkersJson, webViewUnavailable]);

  useEffect(() => {
    if (!isMapReady || !webViewRef.current || webViewUnavailable || !location) {
      return;
    }

    webViewRef.current.injectJavaScript(
      `window.__geofenceSetCenter && window.__geofenceSetCenter(${location.latitude}, ${location.longitude}); true;`,
    );
  }, [isMapReady, location, webViewUnavailable]);

  const injectMapAction = (action: "undo" | "reset") => {
    if (!webViewRef.current || webViewUnavailable) {
      return;
    }

    const methodName = action === "undo" ? "__geofenceUndo" : "__geofenceReset";
    webViewRef.current?.injectJavaScript(
      `window.${methodName} && window.${methodName}(); true;`,
    );
  };

  const handleUndo = () => injectMapAction("undo");
  const handleReset = () => injectMapAction("reset");

  useEffect(() => {
    let active = true;

    const loadLocation = async () => {
      const Location = await import("expo-location");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!active) return;

      if (status !== "granted") {
        setLocationLabel("Location permission denied");
        setIsFetchingLocation(false);
        return;
      }

      const lastKnown = await Location.getLastKnownPositionAsync({});
      if (active && lastKnown) {
        setLocation({
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        });
        setLocationLabel(
          `${lastKnown.coords.latitude.toFixed(4)}, ${lastKnown.coords.longitude.toFixed(4)}`,
        );
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!active) return;

      setLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      setLocationLabel(
        `${current.coords.latitude.toFixed(4)}, ${current.coords.longitude.toFixed(4)}`,
      );
      setIsFetchingLocation(false);
    };

    loadLocation().catch(() => {
      if (!active) return;
      setLocationLabel("Unable to fetch location");
      setIsFetchingLocation(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const WebView = webViewModule?.WebView;

  return (
    <View className="mt-4 px-5">
      <View className="overflow-hidden rounded-2xl border border-[#DEE4EA] bg-white">
        <View className="border-b border-[#E5EAF0] px-3 py-3">
          <View className="flex-row items-start justify-between gap-3">
            <View className="max-w-[64%] rounded-[12px] bg-white/95 px-3 py-2 shadow-sm shadow-black/10 border border-[#D7DDE4]">
              <Text className="text-[10px] uppercase tracking-[0.8px] text-[#64748B]">
                Selected Project
              </Text>
              <Text className="mt-0.5 text-[13px] font-bold text-[#111827]">
                {projectName ?? "Selected Project"}
              </Text>
              <Text className="mt-0.5 text-[11px] text-[#64748B]">
                {projectSite || "Tap the map to draw your geofence zone"}
              </Text>
            </View>

            {isEditingEnabled ? (
              <View key="geofence-editing-controls" className="items-end gap-2">
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleUndo}
                  className={`h-[34px] w-[74px] items-center justify-center rounded-[10px] border border-[#d7dde4] bg-white shadow-sm shadow-black/10 ${!canControlMap ? "opacity-50" : ""}`}
                >
                  <Text className="text-[13px] font-bold text-[#1f3d5c]">
                    Undo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleReset}
                  className={`h-[34px] w-[74px] items-center justify-center rounded-[10px] border border-[#d7dde4] bg-white shadow-sm shadow-black/10 ${!canControlMap ? "opacity-50" : ""}`}
                >
                  <Text className="text-[13px] font-bold text-[#1f3d5c]">
                    Reset
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>

        <View className="h-[430px] w-full">
          {webViewUnavailable ? (
            <View key="map-unavailable-view" className="h-full items-center justify-center bg-[#EEF2F6] px-6">
              <Text className="text-center text-[14px] text-[#475569]">
                Map preview is unavailable in this runtime.
              </Text>
              <Text className="mt-1 text-center text-[12px] text-[#64748B]">
                Build a dev client to enable WebView map rendering.
              </Text>
            </View>
          ) : WebView ? (
            <WebView
              key={mapSourceKey}
              ref={webViewRef}
              source={mapSource}
              style={{ flex: 1, backgroundColor: "#EEF2F6" }}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={["*"]}
              scrollEnabled
              nestedScrollEnabled
              bounces={false}
              onLoadEnd={() => {
                // Wait for the in-page `map_ready` signal so JS helpers are available.
              }}
              onMessage={(event) => {
                try {
                  const payload = JSON.parse(event.nativeEvent.data);
                  if (payload?.type === "map_ready") {
                    setIsMapReady(true);
                    onMapReady?.();
                    return;
                  }
                  if (payload?.type === "polygon_change" && Array.isArray(payload.polygonCoords)) {
                    onPolygonChange?.(payload.polygonCoords);
                  }
                } catch {
                  // ignore invalid messages
                }
              }}
            />
          ) : (
            <View key="map-loading-view" className="h-full items-center justify-center bg-[#EEF2F6]">
              <ActivityIndicator size="large" color="#1D5677" />
              <Text className="mt-2 text-[14px] text-[#6B7280]">
                Loading map...
              </Text>
            </View>
          )}

          {isEditingEnabled ? (
            <View key="gps-indicator" className="absolute right-3 top-3 rounded-lg bg-[#0F172A]/80 px-3 py-2">
            <Text className="text-[11px] font-medium text-[#E5E7EB]">GPS</Text>
            <Text className="text-[12px] text-white">
              {isFetchingLocation ? "Locating..." : locationLabel}
            </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
