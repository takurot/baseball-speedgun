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
              一貫したUIで、記録から振り返りまでシームレスに
            </h1>
            <p className="auth-copy-text">
              ランキングや詳細画面と同じトーンで統一した認証体験。クラウドに保存された球速データへ安心してアクセスできます。
            </p>
            <ul className="auth-value-list">
              <li>
                <strong>統計の見える化</strong> 最高/平均を自動で整理
              </li>
              <li>
                <strong>どこでも更新</strong> モバイルでも入力しやすい共通フォーム
              </li>
              <li>
                <strong>安心のフィードバック</strong> 状態とエラーを明確に表示
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
