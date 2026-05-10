import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SPEED_MAX, SPEED_MIN } from '../constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, speed: string, date: string) => Promise<void> | void;
  presetName?: string;
  suggestedNames?: string[];
  measurementLabel?: string;
}

const STORAGE_KEYS = {
  name: 'baseball-speedgun:lastName',
  date: 'baseball-speedgun:lastDate',
};

const scheduleFocus = (callback: () => void) => {
  if (
    typeof window !== 'undefined' &&
    typeof window.requestAnimationFrame === 'function'
  ) {
    window.requestAnimationFrame(callback);
  } else {
    setTimeout(callback, 0);
  }
};

const AddRecordModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  presetName,
  suggestedNames = [],
  measurementLabel = '球速',
}) => {
  const getToday = () => new Date().toISOString().split('T')[0];
  const [name, setName] = useState(presetName ?? '');
  const [nameLocked, setNameLocked] = useState<boolean>(Boolean(presetName));
  const [speed, setSpeed] = useState('');
  const [date, setDate] = useState(getToday());
  const [errors, setErrors] = useState<
    Partial<Record<'name' | 'speed' | 'date' | 'submit', string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentName, setRecentName] = useState('');
  const [recentDate, setRecentDate] = useState('');
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const getFocusableElements = React.useCallback(() => {
    const root = modalRef.current;
    if (!root) return [];
    const selectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ];
    return Array.from(
      root.querySelectorAll<HTMLElement>(selectors.join(','))
    ).filter((el) => !el.hasAttribute('aria-hidden'));
  }, []);

  const readStorage = (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const writeStorage = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ローカルストレージが利用できない場合は無視
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const storedName = readStorage(STORAGE_KEYS.name) ?? '';
    const storedDate = readStorage(STORAGE_KEYS.date) || '';
    const resolvedDate = storedDate || getToday();
    const nextName = presetName ?? storedName;

    setName(nextName);
    setNameLocked(Boolean(presetName));
    setSpeed('');
    setDate(resolvedDate);
    setErrors({});
    setIsSubmitting(false);
    setRecentName(storedName);
    setRecentDate(storedDate);

    if (!presetName) {
      scheduleFocus(() => nameInputRef.current?.focus());
    } else {
      scheduleFocus(() => {
        const firstFocusable = getFocusableElements()[0];
        firstFocusable?.focus();
      });
    }
  }, [getFocusableElements, isOpen, presetName]);

  const validateSpeed = (value: string) => {
    if (!value) {
      return `${measurementLabel}を入力してください`;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return '数値で入力してください';
    }
    if (parsed < SPEED_MIN || parsed > SPEED_MAX) {
      return `${SPEED_MIN}〜${SPEED_MAX}km/hで入力してください`;
    }
    return '';
  };

  const validateFields = () => {
    const nextErrors: Partial<Record<'name' | 'speed' | 'date', string>> = {};
    if (!name.trim()) {
      nextErrors.name = '選手名を入力してください';
    }
    const speedError = validateSpeed(speed);
    if (speedError) {
      nextErrors.speed = speedError;
    }
    if (!date) {
      nextErrors.date = '日付を選択してください';
    }
    setErrors((prev) => ({ ...nextErrors, submit: prev.submit }));
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFields()) return;
    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, submit: undefined }));

    try {
      await onSubmit(name.trim(), speed, date);
      writeStorage(STORAGE_KEYS.name, name.trim());
      writeStorage(STORAGE_KEYS.date, date);
      setRecentName(name.trim());
      setRecentDate(date);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        submit: '記録の追加に失敗しました。時間をおいて再度お試しください。',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSpeedChange = (value: string) => {
    setSpeed(value);
    const speedError = validateSpeed(value);
    setErrors((prev) => ({ ...prev, speed: speedError || undefined }));
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (value.trim()) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const handleDateChange = (value: string) => {
    setDate(value);
    setErrors((prev) => ({ ...prev, date: value ? undefined : '日付を選択してください' }));
  };

  const suggestionPool = useMemo(() => {
    const unique = new Set<string>();
    [...suggestedNames, recentName, presetName ?? ''].forEach((option) => {
      if (option) unique.add(option);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'ja'));
  }, [presetName, recentName, suggestedNames]);

  const filteredSuggestions = useMemo(() => {
    const keyword = name.trim().toLowerCase();
    const candidates = keyword
      ? suggestionPool.filter((option) =>
          option.toLowerCase().includes(keyword)
        )
      : suggestionPool;
    return candidates.slice(0, 6);
  }, [name, suggestionPool]);

  const isSubmitDisabled =
    isSubmitting ||
    !name.trim() ||
    !speed ||
    !date ||
    Boolean(errors.name) ||
    Boolean(errors.speed) ||
    Boolean(errors.date);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const currentIndex = focusableElements.indexOf(
      document.activeElement as HTMLElement
    );
    const lastIndex = focusableElements.length - 1;
    let nextIndex = currentIndex;

    if (event.shiftKey) {
      nextIndex = currentIndex <= 0 ? lastIndex : currentIndex - 1;
    } else {
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    }

    event.preventDefault();
    focusableElements[nextIndex]?.focus();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-record-title"
        ref={modalRef}
        onKeyDown={handleKeyDown}
      >
        <h2 id="add-record-title">新しい記録を追加</h2>
        <form onSubmit={handleSubmit} className="modal-form" aria-busy={isSubmitting}>
          <div className="form-field">
            <label htmlFor="date" className="form-label">
              日付
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="input"
              required
            />
            {recentDate && (
              <p className="input-hint">
                最終入力日: {recentDate}
              </p>
            )}
            {errors.date && (
              <p className="field-error" role="alert">
                {errors.date}
              </p>
            )}
          </div>
          <div className="form-field">
            <div className="form-field-header">
              <label htmlFor="name" className="form-label">
                選手名
              </label>
              {nameLocked && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setNameLocked(false);
                    scheduleFocus(() => nameInputRef.current?.focus());
                  }}
                >
                  名前を変更
                </button>
              )}
            </div>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="選手名"
                className="input"
                readOnly={nameLocked}
                required
                ref={nameInputRef}
              />
            {nameLocked && (
              <p className="input-hint">
                ランキングからのクイック追加です。変更する場合は「名前を変更」を押してください。
              </p>
            )}
            {!nameLocked && filteredSuggestions.length > 0 && (
              <div className="chip-suggestions" role="listbox" aria-label="これまでの選手名候補">
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="chip"
                    onClick={() => handleNameChange(suggestion)}
                    role="option"
                    aria-selected={suggestion === name}
                    aria-label={`${suggestion} を選択`}
                  >
                    {suggestion === recentName ? '🕒 ' : ''}
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            {errors.name && (
              <p className="field-error" role="alert">
                {errors.name}
              </p>
            )}
          </div>
          <div className="form-field">
            <label htmlFor="speed" className="form-label">
              {measurementLabel} (km/h)
            </label>
            <input
              id="speed"
              type="number"
              value={speed}
              onChange={(e) => handleSpeedChange(e.target.value)}
              placeholder="150"
              className="input"
              required
              min={SPEED_MIN}
              max={SPEED_MAX}
              inputMode="decimal"
            />
            <p className="input-hint">
              {SPEED_MIN}〜{SPEED_MAX} km/h の範囲で入力してください。
            </p>
            {errors.speed && (
              <p className="field-error" role="alert">
                {errors.speed}
              </p>
            )}
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={isSubmitDisabled}>
              {isSubmitting ? '送信中...' : '追加'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-ghost">
              キャンセル
            </button>
          </div>
          {errors.submit && (
            <p className="field-error" role="alert">
              {errors.submit}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default AddRecordModal; 
