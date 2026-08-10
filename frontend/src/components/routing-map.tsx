'use client';

import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

interface RoutingMapProps {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

export function RoutingMap({ startLat, startLng, endLat, endLng }: RoutingMapProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const params = useParams();
  const locale = params.locale || 'en';

  const postLocation = (lat: number, lng: number) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'updateShipperLocation',
          lat,
          lng,
        },
        '*'
      );
    }
  };

  // Cập nhật vị trí shipper mỗi khi tọa độ thay đổi
  useEffect(() => {
    postLocation(startLat, startLng);
  }, [startLat, startLng]);

  // Đảm bảo truyền dữ liệu ngay sau khi Iframe vừa tải xong trang
  const handleLoad = () => {
    postLocation(startLat, startLng);
  };

  // Chỉ dùng tọa độ ban đầu để cấu hình URL, tránh Iframe bị reload nhấp nháy khi di chuyển
  const initialUrl = useRef(
    `/${locale}/map?startLat=${startLat}&startLng=${startLng}&endLat=${endLat}&endLng=${endLng}`
  );

  return (
    <iframe
      ref={iframeRef}
      src={initialUrl.current}
      className="w-full h-full border-0 rounded-2xl"
      allowFullScreen
      onLoad={handleLoad}
      loading="lazy"
    />
  );
}
