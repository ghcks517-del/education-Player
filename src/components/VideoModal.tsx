import React, { useState, useEffect } from 'react';
import {
  X,
  PlusCircle,
  Video,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Film,
  Loader2,
} from 'lucide-react';
import { Category, VideoItem } from '../types';
import {
  extractYouTubeId,
  getYouTubeThumbnail,
  fetchYouTubeMeta,
} from '../utils/youtube';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (videoData: Partial<VideoItem>) => void;
  categories: Category[];
  defaultCategoryId?: string | null;
  videoToEdit?: VideoItem | null;
}

export const VideoModal: React.FC<VideoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  defaultCategoryId,
  videoToEdit,
}) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [detectedId, setDetectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [titleError, setTitleError] = useState('');

  // Initialize or reset form
  useEffect(() => {
    if (videoToEdit) {
      setYoutubeUrl(videoToEdit.youtubeUrl || `https://www.youtube.com/watch?v=${videoToEdit.youtubeId}`);
      setDetectedId(videoToEdit.youtubeId);
      setTitle(videoToEdit.title);
      setCategoryId(videoToEdit.categoryId);
      setSpeaker(videoToEdit.speaker || '');
      setDescription(videoToEdit.description || '');
      setTagsInput(videoToEdit.tags?.join(', ') || '');
    } else {
      setYoutubeUrl('');
      setDetectedId(null);
      setTitle('');
      // Default to chosen category or first available category
      const targetCatId =
        defaultCategoryId || (categories.length > 0 ? categories[0].id : '');
      setCategoryId(targetCatId);
      setSpeaker('');
      setDescription('');
      setTagsInput('');
    }
    setUrlError('');
    setTitleError('');
    setIsLoadingMeta(false);
  }, [videoToEdit, isOpen, defaultCategoryId, categories]);

  if (!isOpen) return null;

  // React to URL change and extract YouTube ID
  const handleUrlChange = async (url: string) => {
    setYoutubeUrl(url);
    setUrlError('');

    const id = extractYouTubeId(url);
    setDetectedId(id);

    if (id) {
      // If title is currently empty, try fetching from YouTube oEmbed
      if (!title || title.trim() === '') {
        setIsLoadingMeta(true);
        const meta = await fetchYouTubeMeta(id);
        setIsLoadingMeta(false);
        if (meta?.title) {
          setTitle(meta.title);
          if (meta.author_name && !speaker) {
            setSpeaker(meta.author_name);
          }
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!detectedId) {
      setUrlError('유효한 유튜브 링크나 영상 주소를 입력해주세요.');
      return;
    }

    if (!title.trim()) {
      setTitleError('교안 제목을 입력해주세요.');
      return;
    }

    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onSave({
      youtubeUrl: youtubeUrl.trim(),
      youtubeId: detectedId,
      title: title.trim(),
      categoryId: categoryId || (categories[0]?.id ?? 'cat-1'),
      speaker: speaker.trim(),
      description: description.trim(),
      tags: parsedTags,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#F37321]/10 text-[#F37321]">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {videoToEdit ? '교안 영상 수정' : '새 교안 영상 등록'}
              </h3>
              <p className="text-xs text-slate-500">
                유튜브 링크 주소만 삽입하면 간편하게 연결됩니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* YouTube URL Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                유튜브 영상 링크 (URL) <span className="text-[#F37321]">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                youtube.com, youtu.be, shorts 등 지원
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#F37321] transition-colors"
                autoFocus={!videoToEdit}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                {isLoadingMeta ? (
                  <Loader2 className="w-4 h-4 text-[#F37321] animate-spin" />
                ) : detectedId ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : null}
              </div>
            </div>
            {urlError && <p className="text-xs text-red-500 mt-1">{urlError}</p>}
          </div>

          {/* Instant Video Preview Box if ID detected */}
          {detectedId && (
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-center gap-3">
              <div className="relative w-28 aspect-video rounded-md overflow-hidden bg-black shrink-0 border border-slate-200">
                <img
                  src={getYouTubeThumbnail(detectedId, 'mq')}
                  alt="교안 썸네일 미리보기"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>유튜브 링크 인식 완료 (ID: {detectedId})</span>
                </div>
                <p className="text-xs text-slate-600 truncate">
                  {title || '영상 제목을 입력하거나 자동 추출 중입니다...'}
                </p>
              </div>
            </div>
          )}

          {/* Video Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                교안 제목 <span className="text-[#F37321]">*</span>
              </label>
              {isLoadingMeta && (
                <span className="text-[11px] text-[#F37321] flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>유튜브 제목 자동 불러오는 중...</span>
                </span>
              )}
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError('');
              }}
              placeholder="예: 2026 한화 핵심가치 이해 및 지속가능성 전략"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#F37321] transition-colors"
            />
            {titleError && <p className="text-xs text-red-500 mt-1">{titleError}</p>}
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              교안 분류 카테고리 <span className="text-[#F37321]">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:border-[#F37321] transition-colors cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Speaker / Instructor */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              강사 / 주관 부서 (선택)
            </label>
            <input
              type="text"
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
              placeholder="예: 한화 인재경영실, 환경안전총괄팀, 외부 초빙강사"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#F37321] transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              교안 내용 요약 및 학습 목표 (선택)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="학습자가 파악해야 할 핵심 포인트나 사전 준비사항을 적어주세요."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#F37321] transition-colors resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              태그 (쉼표로 구분)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="신입사원, ESG, 보고서, 안전수칙"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#F37321] transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#F37321] hover:bg-[#d95e12] rounded-lg shadow-md transition-colors flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{videoToEdit ? '수정 완료' : '교안 등록하기'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
