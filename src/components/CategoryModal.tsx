import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Palette } from 'lucide-react';
import { Category } from '../types';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (categoryData: { name: string; description?: string; color: string }) => void;
  categoryToEdit?: Category | null;
}

const PRESET_COLORS = [
  { name: '한화 오렌지', hex: '#F37321' },
  { name: '한화 레드', hex: '#E4222D' },
  { name: '한화 골드', hex: '#FDB913' },
  { name: '스카이 블루', hex: '#3B82F6' },
  { name: '에메랄드', hex: '#10B981' },
  { name: '퍼플', hex: '#8B5CF6' },
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categoryToEdit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#F37321');
  const [error, setError] = useState('');

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setDescription(categoryToEdit.description || '');
      setColor(categoryToEdit.color || '#F37321');
    } else {
      setName('');
      setDescription('');
      setColor('#F37321');
    }
    setError('');
  }, [categoryToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('분류명을 입력해주세요.');
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      color,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#F37321]/10 text-[#F37321]">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {categoryToEdit ? '교안 분류 수정' : '새 교안 분류 생성'}
              </h3>
              <p className="text-xs text-slate-500">
                영상별 주제 및 직무 커리큘럼을 분류합니다.
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              분류명 <span className="text-[#F37321]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="예: 신입사원 입문교육, 스마트 워크 역량"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#F37321] transition-colors"
              autoFocus
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              분류 설명 (선택)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="해당 분류에 포함될 교안에 대한 간략한 설명"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#F37321] transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-slate-500" />
              <span>태그 색상 테마</span>
            </label>
            <div className="flex items-center gap-2.5">
              {PRESET_COLORS.map((item) => (
                <button
                  type="button"
                  key={item.hex}
                  onClick={() => setColor(item.hex)}
                  className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                    color === item.hex ? 'ring-2 ring-slate-800 scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: item.hex }}
                  title={item.name}
                />
              ))}
            </div>
          </div>

          {/* Footer Actions */}
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
              className="px-5 py-2 text-xs font-semibold text-white bg-[#F37321] hover:bg-[#d95e12] rounded-lg shadow-md transition-colors"
            >
              {categoryToEdit ? '변경사항 저장' : '분류 생성하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
