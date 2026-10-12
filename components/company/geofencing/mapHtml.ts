function escapeHtml(value: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function generateMapHTML(
  userLat: number,
  userLng: number,
  zoneName = "Selected Project",
  zoneSubtext = "",
  initialPolygonCoords: { lat: number; lng: number }[] = [],
  liveWorkers: {
    workerId: string;
    workerName: string;
    lat: number;
    lng: number;
    isInsideZone?: boolean;
  }[] = [],
  googleMapsApiKey = "",
  isEditingEnabled = true,
) {
  const apiKey = googleMapsApiKey.trim();

  if (!apiKey) {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>
      html, body {
        height: 100%;
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #eef2f6;
      }
      .wrap {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        box-sizing: border-box;
        text-align: center;
        color: #334155;
      }
      .card {
        max-width: 320px;
        background: rgba(255,255,255,0.95);
        border: 1px solid #d7dde4;
        border-radius: 18px;
        padding: 18px 16px;
        box-shadow: 0 16px 32px rgba(15, 23, 42, 0.12);
      }
      h1 {
        font-size: 18px;
        margin: 0 0 8px;
        color: #0f172a;
      }
      p {
        margin: 0;
        line-height: 1.5;
        font-size: 13px;
      }
      code {
        display: block;
        margin-top: 12px;
        padding: 10px 12px;
        border-radius: 10px;
        background: #0f172a;
        color: #e2e8f0;
        font-size: 12px;
        word-break: break-all;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>Google Maps API key missing</h1>
        <p>Add <b>EXPO_PUBLIC_GOOGLE_MAPS_API_KEY</b> in <code>.env</code> to enable the geofencing map.</p>
      </div>
    </div>
  </body>
</html>`;
  }

  const initialPointsJson = JSON.stringify(initialPolygonCoords);
  const liveWorkersJson = JSON.stringify(liveWorkers);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>
      html, body, #map {
        height: 100%;
        margin: 0;
        padding: 0;
      }
      body {
        background: #eef2f6;
        overflow: hidden;
        overscroll-behavior: none;
        touch-action: auto;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      #map {
        touch-action: auto;
        -ms-touch-action: auto;
      }
      .controls {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .controls.hidden {
        display: none;
      }
      .controls button {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        border: 1px solid #d7dde4;
        background: white;
        color: #2563eb;
        font-size: 18px;
        font-weight: 700;
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
      }
      .hint {
        position: absolute;
        left: 12px;
        bottom: 12px;
        z-index: 9999;
        background: rgba(15,23,42,0.86);
        color: white;
        font-size: 11px;
        padding: 8px 10px;
        border-radius: 10px;
        max-width: 220px;
      }
      .hint.hidden {
        display: none;
      }
      .worker-label {
        min-width: 80px;
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        background: linear-gradient(135deg, rgba(255,255,255,0.98), rgba(241,245,249,0.98));
        border: 1px solid #d7dde4;
        border-radius: 999px;
        padding: 6px 10px 6px 12px;
        font-size: 10px;
        font-weight: 700;
        color: #1f2937;
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.14);
        transform: translateY(-6px);
        white-space: nowrap;
      }
      .worker-label-main {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .worker-label-dot {
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: #22c55e;
        flex: 0 0 auto;
      }
      .worker-label-text {
        max-width: 92px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .worker-label-close {
        width: 20px;
        height: 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.06);
        color: #475569;
        font-size: 13px;
        line-height: 1;
        cursor: pointer;
        flex: 0 0 auto;
      }
      .worker-label-close:active {
        transform: scale(0.96);
      }
      .status-badge {
        position: absolute;
        left: 12px;
        bottom: 12px;
        z-index: 9999;
        background: rgba(15,23,42,0.85);
        color: #fff;
        font-size: 11px;
        padding: 8px 10px;
        border-radius: 10px;
        max-width: 240px;
      }
      .status-badge strong {
        display: block;
        font-size: 12px;
        margin-bottom: 2px;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <div class="controls">
      <button id="zoomIn">+</button>
      <button id="zoomOut">−</button>
      <button id="recenter">⌖</button>
    </div>
    <div class="status-badge" id="statusBadge">
      <strong>Map ready</strong>
      Tap anywhere to add zone points.
    </div>

    <script>
      function escapeHtml(value) {
        return String(value || "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#39;");
      }
    </script>
    <script>
      window.__INITIAL_POINTS__ = ${initialPointsJson};
      window.__LIVE_WORKERS__ = ${liveWorkersJson};
      window.__CENTER__ = { lat: ${Number(userLat)}, lng: ${Number(userLng)} };
      window.__ZONE_NAME__ = ${JSON.stringify(zoneName)};
      window.__ZONE_SUBTEXT__ = ${JSON.stringify(zoneSubtext)};
      window.__IS_EDITING_ENABLED__ = ${JSON.stringify(Boolean(isEditingEnabled))};

      let map;
      let polygon = null;
      let previewLine = null;
      let userMarker = null;
      let statusBadge = null;
      const points =
        window.__IS_EDITING_ENABLED__ && Array.isArray(window.__INITIAL_POINTS__)
          ? window.__INITIAL_POINTS__.slice()
          : [];
      let pointMarkers = [];
      let workerMarkers = [];
      let workerInfoWindows = [];

      function postPoints() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'polygon_change',
            polygonCoords: points,
          }));
        }
      }

      function setStatus(title, description) {
        if (!statusBadge) return;
        statusBadge.innerHTML = '<strong>' + title + '</strong>' + (description ? description : '');
      }

      function clearDrawingOverlays() {
        if (polygon) {
          polygon.setMap(null);
          polygon = null;
        }
        if (previewLine) {
          previewLine.setMap(null);
          previewLine = null;
        }
        pointMarkers.forEach((marker) => marker.setMap(null));
        pointMarkers = [];
      }

      function syncPolygon() {
        clearDrawingOverlays();

        if (points.length >= 2) {
          previewLine = new google.maps.Polyline({
            path: points,
            strokeColor: '#2F7CF6',
            strokeOpacity: 0.95,
            strokeWeight: 2,
            icons: [{
              icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 2,
                strokeColor: '#2F7CF6',
              },
              offset: '0',
              repeat: '24px',
            }],
            map,
          });
        }

        if (points.length >= 3) {
          polygon = new google.maps.Polygon({
            paths: points,
            strokeColor: '#2F7CF6',
            strokeOpacity: 1,
            strokeWeight: 3,
            fillColor: '#2F7CF6',
            fillOpacity: 0.16,
            map,
          });

          const bounds = new google.maps.LatLngBounds();
          points.forEach((point) => bounds.extend(point));
          map.fitBounds(bounds, 48);
        }

        points.forEach((point, index) => {
          const marker = new google.maps.Marker({
            position: point,
            map,
            draggable: true,
            title: 'Zone point ' + (index + 1),
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#3B82F6',
              fillOpacity: 1,
              strokeColor: '#1D4F6D',
              strokeWeight: 2,
              scale: 5,
            },
          });

          marker.addListener('dragend', function (event) {
            points[index] = {
              lat: event.latLng.lat(),
              lng: event.latLng.lng(),
            };
            syncPolygon();
            postPoints();
          });

          pointMarkers.push(marker);
        });

        postPoints();
      }

      function clearWorkerOverlays() {
        workerMarkers.forEach((marker) => marker.setMap(null));
        workerInfoWindows.forEach((infoWindow) => infoWindow.close());
        workerMarkers = [];
        workerInfoWindows = [];
      }

      function renderWorkers(workers) {
        clearWorkerOverlays();

        (Array.isArray(workers) ? workers : []).forEach((worker) => {
          const shortName = String(worker.workerName || 'Worker')
            .split(' ')
            .filter(Boolean)[0]
            .slice(0, 12);
          const closeButtonId =
            'worker-label-close-' +
            String(worker.workerId || '').replace(/[^a-zA-Z0-9_-]/g, '');
          const marker = new google.maps.Marker({
            position: { lat: worker.lat, lng: worker.lng },
            map,
            title: worker.workerName,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: worker.isInsideZone ? '#22C55E' : '#EF4444',
              fillOpacity: 1,
              strokeColor: worker.isInsideZone ? '#16A34A' : '#DC2626',
              strokeWeight: 2,
              scale: 8,
            },
          });

          const infoWindow = new google.maps.InfoWindow({
            content:
              '<div class="worker-label">' +
              '<div class="worker-label-main">' +
              '<span class="worker-label-dot" style="background:' +
              (worker.isInsideZone ? '#22c55e' : '#ef4444') +
              '"></span>' +
              '<span class="worker-label-text">' +
              escapeHtml(shortName) +
              '</span>' +
              '</div>' +
              '<button type="button" id="' +
              closeButtonId +
              '" class="worker-label-close" aria-label="Close worker label">×</button>' +
              '</div>',
            disableAutoPan: true,
            headerDisabled: true,
          });
          infoWindow.open({ map, anchor: marker });
          google.maps.event.addListenerOnce(infoWindow, 'domready', function () {
            const closeButton = document.getElementById(closeButtonId);
            if (closeButton) {
              closeButton.addEventListener('click', function () {
                infoWindow.close();
              });
            }
          });

          workerMarkers.push(marker);
          workerInfoWindows.push(infoWindow);
        });
      }

      window.renderLiveWorkers = function (workers) {
        renderWorkers(workers);
      };

      function recenter() {
        map.setCenter(window.__CENTER__);
        map.setZoom(17);
      }

      function setCenter(lat, lng) {
        if (!map || !userMarker) {
          return;
        }

        const nextCenter = {
          lat: Number(lat),
          lng: Number(lng),
        };

        if (!Number.isFinite(nextCenter.lat) || !Number.isFinite(nextCenter.lng)) {
          return;
        }

        window.__CENTER__ = nextCenter;
        userMarker.setPosition(nextCenter);
        map.panTo(nextCenter);
      }

      function undoLastPoint() {
        if (!map || !window.__IS_EDITING_ENABLED__) {
          return;
        }

        if (points.length === 0) {
          return;
        }

        points.pop();
        setStatus('Undo last point', points.length + ' point(s) selected');
        syncPolygon();
      }

      function resetDrawing() {
        if (!map || !window.__IS_EDITING_ENABLED__) {
          return;
        }

        points.length = 0;
        clearDrawingOverlays();
        setStatus('Zone cleared', 'Tap anywhere to start again');
        postPoints();
        recenter();
      }

      window.__geofenceUndo = undoLastPoint;
      window.__geofenceReset = resetDrawing;
      window.__geofenceSetCenter = setCenter;

      function initMap() {
        statusBadge = document.getElementById('statusBadge');

        map = new google.maps.Map(document.getElementById('map'), {
          center: window.__CENTER__,
          zoom: 17,
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
          draggable: true,
          scrollwheel: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
          styles: [
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          ],
        });

        userMarker = new google.maps.Marker({
          position: window.__CENTER__,
          map,
          title: 'Your location',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#3B82F6',
            fillOpacity: 1,
            strokeColor: '#1E40AF',
            strokeWeight: 2,
            scale: 8,
          },
        });

        if (window.__IS_EDITING_ENABLED__) {
          map.addListener('click', function (event) {
            points.push({
              lat: event.latLng.lat(),
              lng: event.latLng.lng(),
            });
            setStatus('Drawing zone', points.length + ' point(s) selected');
            syncPolygon();
          });
        } else {
          setStatus('Zone inactive', 'Enable the zone to edit it');
        }

        document.getElementById('zoomIn').addEventListener('click', function () {
          map.setZoom((map.getZoom() || 17) + 1);
        });

        document.getElementById('zoomOut').addEventListener('click', function () {
          map.setZoom((map.getZoom() || 17) - 1);
        });

        document.getElementById('recenter').addEventListener('click', function () {
          recenter();
        });

        if (points.length > 0) {
          syncPolygon();
        } else {
          postPoints();
        }

        renderWorkers(window.__LIVE_WORKERS__ || []);

        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'map_ready',
          }));
        }

        setStatus(
          window.__IS_EDITING_ENABLED__ ? 'Map ready' : 'Zone inactive',
          window.__IS_EDITING_ENABLED__ ? 'Tap anywhere to add zone points' : 'Enable the zone to edit it',
        );
      }
    </script>
    <script
      src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&v=weekly"
      async
      defer
    ></script>
  </body>
</html>`;
}
