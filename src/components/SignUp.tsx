import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import AuthLayout from './AuthLayout';
import PasswordField from './PasswordField';
import { resolveAuthErrorMessage } from './authMessages';

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/ranking');
    } catch (err: any) {
      setError(
        resolveAuthErrorMessage(
          err?.code,
          'アカウントの作成に失敗しました。入力内容を確認してください。'
        )
      );
    }
    setIsSubmitting(false);
  };

  return (
    <AuthLayout
      title="新規登録"
      subtitle="自分専用のランキングを作成する"
      errorMessage={error}
      footer={
        <p className="auth-footer">
          既にアカウントをお持ちですか？ <Link to="/login">ログイン</Link>
        </p>
      }
    >
      <form onSubmit={handleSignUp} className="auth-form" aria-busy={isSubmitting}>
        <div className="form-field">
          <label className="form-label" htmlFor="signup-email">
            メールアドレス
          </label>
          <input
            id="signup-email"
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
          id="signup-password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            if (error) setError('');
          }}
          autoComplete="new-password"
          hint="6文字以上のパスワードを設定してください"
        />
        <button
          type="submit"
          className="btn btn-success btn-block"
          disabled={!email || !password || isSubmitting}
        >
          {isSubmitting ? '登録中...' : '登録する'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default SignUp; 
