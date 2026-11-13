import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Database,
  CloudUpload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Category, VideoItem } from '../types';
import { exportBackupJson, importBackupJson } from '../utils/storage';
import type { SyncStatus } from './Header';

interface DataPersistenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  videos: VideoItem[];
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  onPushToCloud: () => Promise<void>;
  onPullFromCloud: () => Promise<void>;
  onDataImported: (categories: Category[], videos: VideoItem[]) => Promise<void>;
}

export const DataPersistenceModal: React.FC<DataPersistenceModalProps> = ({
  isOpen,
  onClose,
  categories,
  videos,
  syncStatus,
  syncError,
  lastSyncedAt,
  onPushToCloud,
  onPullFromCloud,
  onDataImported,
}) => {
  const [copied, setCopied] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'paste'>('info');
  const [importError, setImportError] = useState<string | null>(null);
  const [isSyncActionRunning, setIsSyncActionRunning] = useState<'push' | 'pull' | 'import' | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const currentBackupJson = exportBackupJson(categories, videos);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentBackupJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([currentBackupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `안전교육영상_교안데이터_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePushClick = async () => {
    setActionFeedback(null);
    setIsSyncActionRunning('push');
    try {
      await onPushToCloud();
      setActionFeedback({
        type: 'success',
        message: `현재 교안 ${videos.length}개(분류 ${categories.length}개)가 클라우드에 업로드되었습니다. 이제 탭 앱에서도 불러올 수 있습니다.`,
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : '클라우드 업로드에 실패했습니다.',
      });
    } finally {
      setIsSyncActionRunning(null);
    }
  };

  const handlePullClick = async () => {
    setActionFeedback(null);
    setIsSyncActionRunning('pull');
    try {
      await onPullFromCloud();
      setActionFeedback({
        type: 'success',
        message: '클라우드 서버에서 최신 교안 목록을 성공적으로 불러왔습니다.',
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : '클라우드에서 목록을 불러오지 못했습니다.',
      });
    } finally {
      setIsSyncActionRunning(null);
    }
  };

  const handleManualImport = async () => {
    setImportError(null);
    if (!jsonInput.trim()) {
      setImportError('JSON 텍스트를 입력해주세요.');
      return;
    }
    const result = importBackupJson(jsonInput);
    if (!result) {
      setImportError('올바른 교안 JSON 형식이 아닙니다. 형식을 확인해주세요.');
      return;
    }

    setIsSyncActionRunning('import');
    try {
      await onDataImported(result.categories, result.videos);
      onClose();
    } catch (err) {
      setImportError(
        err instanceof Error
          ? err.message
          : '로컬에는 반영되었으나 클라우드 동기화에 실패했습니다. 네트워크를 확인 후 다시 시도해주세요.'
      );
    } finally {
      setIsSyncActionRunning(null);
    }
  };

  const formattedTime = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-in zoom-in-95 duration-200 text-left max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#F37321]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">교안 영상 데이터 영구 보존 &amp; 동기화</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                현재 기기에 표시된 교안 영상 {videos.length}개 / 분류 {categories.length}개
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 shrink-0">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'info'
                ? 'border-[#F37321] text-[#F37321]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            클라우드 동기화 및 데이터 백업
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'paste'
                ? 'border-[#F37321] text-[#F37321]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            JSON 직접 붙여넣어 복원
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'info' ? (
          <div className="space-y-4 overflow-y-auto pr-1 text-xs text-slate-700">
            {/* Real-time Cloud Sync Control Box */}
            <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-blue-950 text-xs">
                  PC ↔ 갤럭시 탭 실시간 클라우드 동기화
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                    syncStatus === 'error'
                      ? 'bg-red-100 text-red-700'
                      : syncStatus === 'cache'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {syncStatus === 'error'
                    ? '연결 오류'
                    : syncStatus === 'cache'
                    ? '로컬 캐시 중'
                    : syncStatus === 'syncing' || syncStatus === 'connecting'
                    ? '동기화 중...'
                    : formattedTime
                    ? `연결됨 (${formattedTime})`
                    : '연결됨'}
                </span>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                PC에서 새 교안을 올렸는데 탭 앱에 안 보일 경우, PC에서는 <strong>[지금 클라우드에 업로드]</strong>를 누르고 탭 앱에서는 <strong>[클라우드 최신 목록 받기]</strong>를 눌러 즉시 맞출 수 있습니다.
              </p>

              {syncError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-2 text-[11px]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{syncError}</span>
                </div>
              )}

              {actionFeedback && (
                <div
                  className={`p-2.5 rounded-lg flex items-start gap-2 text-[11px] border ${
                    actionFeedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {actionFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  )}
                  <span>{actionFeedback.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSyncActionRunning !== null}
                  onClick={() => void handlePushClick()}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg shadow-xs transition-colors"
                >
                  {isSyncActionRunning === 'push' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CloudUpload className="w-4 h-4" />
                  )}
                  <span>지금 클라우드에 업로드 (PC→탭)</span>
                </button>
                <button
                  type="button"
                  disabled={isSyncActionRunning !== null}
                  onClick={() => void handlePullClick()}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-800 border border-blue-300 font-semibold rounded-lg shadow-2xs transition-colors"
                >
                  {isSyncActionRunning === 'pull' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <RefreshCw className="w-4 h-4 text-blue-600" />
                  )}
                  <span>클라우드 최신 목록 받기</span>
                </button>
              </div>
            </div>

            {/* Action 1: Download backup file */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="font-semibold text-slate-900 text-xs">
                방법 1. 현재 등록된 교안을 파일로 백업 (.json)
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                현재 업로드해 두신 교안 목록을 백업 파일로 다운로드해 두면, <strong>[설정/백업] &gt; [백업 파일 불러오기]</strong> 버튼으로 언제든 그대로 복원하고 모든 기기에 동기화할 수 있습니다.
              </p>
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold rounded-lg shadow-2xs transition-colors"
              >
                <Download className="w-4 h-4 text-[#F37321]" />
                <span>현재 교안 데이터 파일 다운로드 (.json)</span>
              </button>
            </div>

            {/* Action 2: Copy JSON */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
              <div className="font-semibold text-slate-900 text-xs flex items-center justify-between">
                <span>방법 2. 소스 코드 기본값 백업용 JSON 복사</span>
                {copied && (
                  <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> 복사 완료!
                  </span>
                )}
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                전체 교안 목록을 JSON 텍스트로 복사해 다른 기기의 <strong>[JSON 직접 붙여넣어 복원]</strong> 탭에 붙여넣어 반영할 수도 있습니다.
              </p>
              <button
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#F37321] hover:bg-[#ea6715] text-white font-semibold rounded-lg shadow-xs transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>현재 교안 데이터 JSON 복사하기</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto pr-1">
            <p className="text-xs text-slate-600">
              이전에 백업해둔 JSON 코드나 교안 데이터를 아래 텍스트 창에 붙여넣고 적용을 누르면 현재 기기와 클라우드에 즉시 반영됩니다:
            </p>
            <textarea
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setImportError(null);
              }}
              rows={8}
              placeholder='{"version": "1.0", "categories": [...], "videos": [...]}'
              className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F37321]/30 focus:border-[#F37321] bg-slate-50"
            />
            {importError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                {importError}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSyncActionRunning !== null}
                onClick={() => void handleManualImport()}
                className="flex items-center gap-2 px-4 py-2 bg-[#F37321] hover:bg-[#ea6715] disabled:opacity-60 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
              >
                {isSyncActionRunning === 'import' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>교안 데이터 즉시 반영 및 클라우드 동기화</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
