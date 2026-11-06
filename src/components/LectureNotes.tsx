import React, { useState } from 'react';
import {
  Bookmark,
  Plus,
  Trash2,
  Clock,
  Copy,
  Check,
  FileText,
  Send,
} from 'lucide-react';
import { VideoItem, VideoNote } from '../types';
import { formatSeconds } from '../utils/youtube';

interface LectureNotesProps {
  video: VideoItem;
  onAddNote: (note: Omit<VideoNote, 'id' | 'createdAt'>) => void;
  onDeleteNote: (noteId: string) => void;
  onSeekTo: (seconds: number) => void;
  currentPlaybackTime: number;
}

export const LectureNotes: React.FC<LectureNotesProps> = ({
  video,
  onAddNote,
  onDeleteNote,
  onSeekTo,
  currentPlaybackTime,
}) => {
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);

  const notes = video.notes || [];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onAddNote({
      timestamp: Math.floor(currentPlaybackTime),
      formattedTime: formatSeconds(currentPlaybackTime),
      text: inputText.trim(),
    });
    setInputText('');
  };

  const handleCopyAll = () => {
    if (notes.length === 0) return;
    const textContent = `[${video.title}] 교안 강의 메모\n` +
      notes.map((n) => `[${n.formattedTime}] ${n.text}`).join('\n');
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-[#F37321]" />
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            학습 요약 & 타임스탬프 메모 ({notes.length})
          </h3>
        </div>
        {notes.length > 0 && (
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 transition-colors"
            title="메모 전체 클립보드 복사"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-medium">복사됨</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>메모 복사</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Input row */}
      <form onSubmit={handleAdd} className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 px-2.5 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs font-mono text-[#F37321] shrink-0 font-medium">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatSeconds(currentPlaybackTime)}</span>
        </div>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="현재 재생 시점의 핵심 요점 메모 입력..."
          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-[#F37321] transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 bg-[#F37321] hover:bg-[#d95e12] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors shrink-0"
          title="메모 등록"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
          <FileText className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
          <p className="text-xs text-slate-700 font-medium">
            작성된 타임스탬프 메모가 없습니다
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            영상을 보며 중요한 구간에 메모를 남겨두면 클릭 한 번으로 이동할 수 있습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {notes.map((note) => (
            <div
              key={note.id}
              className="group flex items-start justify-between gap-3 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            >
              <button
                onClick={() => onSeekTo(note.timestamp)}
                className="flex items-center gap-2 text-left min-w-0 flex-1 hover:text-[#F37321] transition-colors"
                title={`${note.formattedTime} 지점으로 바로 이동`}
              >
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white text-[#F37321] border border-orange-200 group-hover:bg-[#F37321] group-hover:text-white transition-colors shrink-0">
                  {note.formattedTime}
                </span>
                <span className="text-xs text-slate-700 group-hover:text-slate-900 leading-relaxed break-all">
                  {note.text}
                </span>
              </button>

              <button
                onClick={() => onDeleteNote(note.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition-opacity"
                title="메모 삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
