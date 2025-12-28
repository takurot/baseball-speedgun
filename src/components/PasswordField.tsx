import React, { useState } from 'react';

interface PasswordFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  label?: string;
  hint?: string;
}

const PasswordField: React.FC<PasswordFieldProps> = ({
  id,
  value,
  onChange,
  autoComplete = 'current-password',
  label = 'パスワード',
  hint,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const toggleLabel = isVisible ? 'パスワードを隠す' : 'パスワードを表示';

  return (
    <div className="form-field">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <div className="input-with-toggle">
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input"
          required
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setIsVisible((prev) => !prev)}
          aria-pressed={isVisible}
          aria-label={toggleLabel}
        >
          {isVisible ? '非表示' : '表示'}
        </button>
      </div>
      {hint ? <p className="input-hint">{hint}</p> : null}
    </div>
  );
};

export default PasswordField;
