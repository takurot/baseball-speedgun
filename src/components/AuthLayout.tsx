import React from 'react';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  errorMessage?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  children,
  footer,
  errorMessage,
}) => {
  return (
    <div className="auth-page">
      <div className="container">
        <div className="auth-grid">
          <section className="auth-copy card" aria-label="サービス紹介">
            <p className="eyebrow">Baseball Speedgun</p>
            <h1 className="auth-hero-title">
              球速を記録して、選手別ランキングで振り返ろう
            </h1>
            <p className="auth-copy-text">
              投球速度を日付付きで記録し、選手ごとの最高球速ランキングと推移グラフを自動で作成します。練習の成果を残して、次の目標につなげましょう。
            </p>
            <ul className="auth-value-list">
              <li>
                <strong>記録を追加</strong> 選手名・球速・日付をかんたん入力
              </li>
              <li>
                <strong>ランキング</strong> 最高球速で自動並び替え
              </li>
              <li>
                <strong>推移グラフ</strong> 日々の変化とピークをひと目で確認
              </li>
            </ul>
          </section>
          <section className="auth-card card" aria-label={`${title}フォーム`}>
            <header className="auth-header">
              <p className="eyebrow">Account</p>
              <h2 className="auth-title">{title}</h2>
              <p className="auth-subtitle">{subtitle}</p>
            </header>
            {errorMessage && (
              <div className="form-alert" role="alert" aria-live="polite">
                {errorMessage}
              </div>
            )}
            {children}
            {footer}
          </section>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
