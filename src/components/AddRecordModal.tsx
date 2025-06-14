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
      <div className="modal-content">
        <h2>新しい記録を追加</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="date">日付</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="name">選手名</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="選手名"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="speed">球速 (km/h)</label>
            <input
              id="speed"
              type="number"
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
              placeholder="150"
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="button-primary">追加</button>
            <button type="button" onClick={onClose}>キャンセル</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRecordModal; 