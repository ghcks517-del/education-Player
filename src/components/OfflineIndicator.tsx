import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-500/95 backdrop-blur-xs px-3.5 py-2 text-xs font-semibold text-white shadow-xl border border-amber-400">
      <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
      <span>오프라인 상태입니다 (캐시된 교안 데이터 사용 중)</span>
    </div>
  );
};
