import { useState, useEffect, useRef } from 'react';
import { X, ChevronDown } from 'lucide-react';
import api from '../api';

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ tags, onChange }: Props) {
  const [recentTags, setRecentTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showCombo, setShowCombo] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<string[]>('/tags/recent').then(setRecentTags);
  }, []);

  const openCombo = () => {
    if (allTags.length === 0) {
      api.get<{ id: number; name: string }[]>('/tags').then((data) =>
        setAllTags(data.map((t) => t.name))
      );
    }
    setShowCombo(true);
    setSearch('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    onChange([...tags, trimmed]);
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleComboKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && search.trim()) {
      e.preventDefault();
      addTag(search);
      setSearch('');
      setShowCombo(false);
    }
    if (e.key === 'Escape') {
      setShowCombo(false);
    }
  };

  // コンボボックス外クリックで閉じる
  useEffect(() => {
    if (!showCombo) return;
    const handleClick = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setShowCombo(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showCombo]);

  const filteredTags = search
    ? allTags.filter((t) => t.toLowerCase().includes(search.toLowerCase()) && !tags.includes(t))
    : allTags.filter((t) => !tags.includes(t));

  const recentVisible = recentTags.filter((t) => !tags.includes(t));
  const isNewTag = search.trim() && !allTags.includes(search.trim());

  return (
    <div className="sb-tag-input">
      {/* 付与済みタグ */}
      {tags.length > 0 && (
        <div className="sb-tag-input-current">
          {tags.map((tag) => (
            <span key={tag} className="sb-tag sb-tag-removable">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="sb-tag-remove">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 最近使ったタグ + その他ボタン */}
      <div className="sb-tag-input-actions">
        {recentVisible.slice(0, 10).map((tag) => (
          <button
            key={tag}
            type="button"
            className="sb-tag-suggest"
            onClick={() => addTag(tag)}
          >
            + {tag}
          </button>
        ))}
        <button type="button" className="sb-tag-other" onClick={openCombo}>
          その他 <ChevronDown size={12} />
        </button>
      </div>

      {/* コンボボックス */}
      {showCombo && (
        <div className="sb-tag-combo" ref={comboRef}>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleComboKeyDown}
            placeholder="タグを検索 or 新規入力..."
            className="sb-tag-combo-input"
          />
          <div className="sb-tag-combo-list">
            {filteredTags.slice(0, 20).map((tag) => (
              <button
                key={tag}
                type="button"
                className="sb-tag-combo-item"
                onClick={() => {
                  addTag(tag);
                  setSearch('');
                  setShowCombo(false);
                }}
              >
                {tag}
              </button>
            ))}
            {isNewTag && (
              <button
                type="button"
                className="sb-tag-combo-item sb-tag-combo-new"
                onClick={() => {
                  addTag(search);
                  setSearch('');
                  setShowCombo(false);
                }}
              >
                「{search.trim()}」を新規作成
              </button>
            )}
            {filteredTags.length === 0 && !isNewTag && (
              <div className="sb-tag-combo-empty">該当するタグがありません</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
