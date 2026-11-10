import React, { useState } from 'react';
import { X, Copy, Check, Download, Upload, ShieldCheck, Database, FileCode2 } from 'lucide-react';
import { Category, VideoItem } from '../types';
import { exportBackupJson, importBackupJson } from '../utils/storage';

interface DataPersistenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  videos: VideoItem[];
  onDataImported: (categories: Category[], videos: VideoItem[]) => void;
}

export const DataPersistenceModal: React.FC<DataPersistenceModalProps> = ({
  isOpen,
  onClose,
  categories,
  videos,
  onDataImported,
}) => {
  const [copied, setCopied] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'paste'>('info');
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentBackupJson = exportBackupJson(categories, videos);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentBackupJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
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

  const handleManualImport = () => {
    setImportError(null);
    if (!jsonInput.trim()) {
      setImportError('JSON 텍스트를 입력해주세요.');
      return;
    }
    const result = importBackupJson(jsonInput);
    if (result) {
      onDataImported(result.categories, result.videos);
      onClose();
    } else {
      setImportError('올바른 교안 JSON 형식이 아닙니다. 형식을 확인해주세요.');
    }
  };

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
                현재 등록된 교안 영상 {videos.length}개 / 분류 {categories.length}개 보존
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
            데이터 백업 및 영구 보존 안내
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
            {/* Core Explanation Box */}
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-blue-900 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>왜 배포 시 내가 올린 영상이 사라지고 샘플 영상이 나왔을까요?</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                웹앱에서 등록한 영상은 기본적으로 <strong>현재 브라우저에만 저장</strong>됩니다.
                새로 배포하거나 다른 기계/태블릿에서 열면 브라우저 저장소가 비어 있어 소스 코드의 기본 영상이 대신 나타났던 것입니다.
              </p>
            </div>

            {/* Action 1: Download backup file */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="font-semibold text-slate-900 text-xs">
                방법 1. 현재 등록된 교안을 파일로 저장 (가장 쉬운 방법)
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                현재 업로드해 두신 교안 목록을 백업 파일로 다운로드해 두면, Vercel로 배포한 뒤 새 기계나 태블릿에서 <strong>[설정/백업] &gt; [백업 파일 불러오기]</strong> 버튼으로 언제든 1초 만에 그대로 복원할 수 있습니다.
              </p>
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold rounded-lg shadow-2xs transition-colors"
              >
                <Download className="w-4 h-4 text-[#F37321]" />
                <span>현재 교안 데이터 파일 다운로드 (.json)</span>
              </button>
            </div>

            {/* Action 2: Copy JSON for Permanent Code Embedding */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
              <div className="font-semibold text-slate-900 text-xs flex items-center justify-between">
                <span>방법 2. 소스 코드에 기본값으로 영구 탑재 (추천)</span>
                {copied && (
                  <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> 복사 완료!
                  </span>
                )}
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                아래 <strong>[교안 JSON 복사]</strong> 버튼을 누른 후 채팅창에 그대로 붙여넣어 주시면, 소스 코드 자체에 기본값으로 저장해 드립니다. 이렇게 하면 어떤 기계에서 열어도 백업 파일을 불러올 필요 없이 내가 올린 영상이 기본값으로 바로 뜹니다!
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
              이전에 백업해둔 JSON 코드나 교안 데이터를 아래 텍스트 창에 붙여넣고 적용을 누르면 즉시 현재 앱에 반영됩니다:
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
                onClick={handleManualImport}
                className="px-4 py-2 bg-[#F37321] hover:bg-[#ea6715] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
              >
                교안 데이터 즉시 반영
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
