import React, { useEffect, useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, speed: string, date: string) => void;
  presetName?: string;
}

const AddRecordModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  presetName,
}) => {
  const getToday = () => new Date().toISOString().split('T')[0];
  const [name, setName] = useState(presetName ?? '');
  const [nameLocked, setNameLocked] = useState<boolean>(Boolean(presetName));
  const [speed, setSpeed] = useState('');
  const [date, setDate] = useState(getToday());

  useEffect(() => {
    if (!isOpen) return;
    setName(presetName ?? '');
    setNameLocked(Boolean(presetName));
    setSpeed('');
    setDate(getToday());
  }, [isOpen, presetName]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !speed || !date) return;
    onSubmit(name.trim(), speed, date);
    setSpeed('');
    setDate(getToday());
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-record-title"
      >
        <h2 id="add-record-title">新しい記録を追加</h2>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-field">
            <label htmlFor="date" className="form-label">
              日付
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
              required
            />
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
                  onClick={() => setNameLocked(false)}
                >
                  名前を変更
                </button>
              )}
            </div>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="選手名"
              className="input"
              readOnly={nameLocked}
              required
            />
            {nameLocked && (
              <p className="input-hint">
                ランキングからのクイック追加です。変更する場合は「名前を変更」を押してください。
              </p>
            )}
          </div>
          <div className="form-field">
            <label htmlFor="speed" className="form-label">
              球速 (km/h)
            </label>
            <input
              id="speed"
              type="number"
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
              placeholder="150"
              className="input"
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              追加
            </button>
            <button type="button" onClick={onClose} className="btn btn-ghost">
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRecordModal; 
