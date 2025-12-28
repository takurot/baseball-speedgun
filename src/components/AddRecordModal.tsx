import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, speed: string, date: string) => void;
}

const AddRecordModal: React.FC<Props> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [speed, setSpeed] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // 今日の日付をデフォルトに

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(name, speed, date);
    // フォームをリセット
    setName('');
    setSpeed('');
    setDate(new Date().toISOString().split('T')[0]);
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
            <label htmlFor="name" className="form-label">
              選手名
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="選手名"
              className="input"
              required
            />
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
