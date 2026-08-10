'use client';

import { useEffect, useRef } from 'react';

export default function MapPage() {
  const mapRef = useRef<any>(null);
  const routingControlRef = useRef<any>(null);
  const fallbackMarkerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Hàm load script từ CDN động
    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(script);
      });
    };

    const initMap = async () => {
      try {
        // Tải CSS Leaflet từ CDN động
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }
        if (!document.getElementById('leaflet-routing-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-routing-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css';
          document.head.appendChild(link);
        }

        // Tải JS Leaflet và Leaflet Routing Machine từ CDN động
        await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
        await loadScript('https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js');

        const L = (window as any).L;
        if (!L) {
          console.error('Leaflet is not available on window');
          return;
        }

        // Thêm style ẩn bảng hướng dẫn chỉ đường bằng chữ để giữ giao diện bản đồ gọn gàng
        if (!document.getElementById('leaflet-custom-css')) {
          const style = document.createElement('style');
          style.id = 'leaflet-custom-css';
          style.innerHTML = `
            .leaflet-routing-container { display: none !important; }
            .custom-div-icon { background: transparent !important; border: none !important; }
          `;
          document.head.appendChild(style);
        }

        // Đọc các tham số định vị từ URL
        const urlParams = new URLSearchParams(window.location.search);
        const startLat = parseFloat(urlParams.get('startLat') || '');
        const startLng = parseFloat(urlParams.get('startLng') || '');
        const endLat = parseFloat(urlParams.get('endLat') || '') || 10.762622;
        const endLng = parseFloat(urlParams.get('endLng') || '') || 106.660172;

        // Tránh khởi tạo lại nhiều lần nếu map đã tồn tại
        if (mapRef.current) return;

        const map = L.map('map-container', {
          zoomControl: true
        }).setView([endLat, endLng], 15);
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        // Định nghĩa các icon Marker SVG tùy biến
        const shipperIcon = L.divIcon({
          html: `
            <div style="background-color: white; border: 2.5px solid #f97316; border-radius: 50%; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; box-sizing: border-box; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f97316" width="22" height="22">
                <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm12 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm2-5.5h-3V9h3v4z"/>
              </svg>
            </div>
          `,
          className: 'custom-div-icon',
          iconSize: [38, 38],
          iconAnchor: [19, 19],
          popupAnchor: [0, -19]
        });

        const destIcon = L.divIcon({
          html: `
            <div style="background-color: white; border: 2.5px solid #ef4444; border-radius: 50%; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; box-sizing: border-box; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" width="22" height="22">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
          `,
          className: 'custom-div-icon',
          iconSize: [38, 38],
          iconAnchor: [19, 19],
          popupAnchor: [0, -19]
        });

        fallbackMarkerRef.current = L.marker([endLat, endLng], { icon: destIcon }).addTo(map).bindPopup('<b>Vị trí giao hàng</b>');

        const updateRoute = (sLat: number, sLng: number) => {
          if (isNaN(sLat) || isNaN(sLng) || sLat === 0 || sLng === 0) return;

          if (fallbackMarkerRef.current) {
            map.removeLayer(fallbackMarkerRef.current);
            fallbackMarkerRef.current = null;
          }

          if (routingControlRef.current) {
            routingControlRef.current.setWaypoints([
              L.latLng(sLat, sLng),
              L.latLng(endLat, endLng)
            ]);
          } else {
            routingControlRef.current = L.Routing.control({
              waypoints: [
                L.latLng(sLat, sLng),
                L.latLng(endLat, endLng)
              ],
              router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1',
                profile: 'driving'
              }),
              lineOptions: {
                styles: [{ color: '#f97316', weight: 6, opacity: 0.85 }]
              },
              createMarker: function(i: number, waypoint: any) {
                if (i === 0) {
                  return L.marker(waypoint.latLng, { icon: shipperIcon, draggable: false }).bindPopup('<b>Vị trí Shipper</b>');
                } else {
                  return L.marker(waypoint.latLng, { icon: destIcon, draggable: false }).bindPopup('<b>Vị trí giao hàng</b>');
                }
              },
              addWaypoints: false,
              draggableWaypoints: false,
              fitSelectedRoutes: true,
              show: false
            }).addTo(map);
          }
        };

        if (!isNaN(startLat) && !isNaN(startLng) && startLat !== 0 && startLng !== 0) {
          updateRoute(startLat, startLng);
        }

        // Lắng nghe postMessage để di chuyển shipper theo thời gian thực
        const messageListener = (event: MessageEvent) => {
          if (event.data && event.data.type === 'updateShipperLocation') {
            const lat = parseFloat(event.data.lat);
            const lng = parseFloat(event.data.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
              updateRoute(lat, lng);
            }
          }
        };

        window.addEventListener('message', messageListener);
        return () => {
          window.removeEventListener('message', messageListener);
        };
      } catch (error) {
        console.error('Error loading Leaflet or initializing map:', error);
      }
    };

    initMap();
  }, []);

  return (
    <div id="map-container" style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }} />
  );
}
