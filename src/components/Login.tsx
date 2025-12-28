import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import AuthLayout from './AuthLayout';
import PasswordField from './PasswordField';
import { resolveAuthErrorMessage } from './authMessages';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/ranking');
    } catch (err: any) {
      setError(
        resolveAuthErrorMessage(
          err?.code,
          'ログインに失敗しました。メールアドレスとパスワードを確認してください。'
        )
      );
    }
    setIsSubmitting(false);
  };

  return (
    <AuthLayout
      title="ログイン"
      subtitle="登録済みのメールアドレスで続行"
      errorMessage={error}
      footer={
        <p className="auth-footer">
          アカウントをお持ちでないですか？ <Link to="/signup">新規登録</Link>
        </p>
      }
    >
      <form onSubmit={handleLogin} className="auth-form" aria-busy={isSubmitting}>
        <div className="form-field">
          <label className="form-label" htmlFor="login-email">
            メールアドレス
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            className="input"
            required
            autoComplete="email"
          />
        </div>
        <PasswordField
          id="login-password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            if (error) setError('');
          }}
          autoComplete="current-password"
          hint="登録時のパスワードを入力してください"
        />
        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={!email || !password || isSubmitting}
        >
          {isSubmitting ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Login; 
