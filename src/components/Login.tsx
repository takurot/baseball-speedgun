import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/ranking');
    } catch (err: any) {
      setError('メールアドレスまたはパスワードが間違っています。');
      console.error(err);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h2 className="auth-title">ログイン</h2>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-field">
            <label className="form-label" htmlFor="login-email">
              メールアドレス
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="login-password">
              パスワード
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block">
            ログイン
          </button>
        </form>
        <p className="auth-footer">
          アカウントをお持ちでないですか？ <Link to="/signup">新規登録</Link>
        </p>
      </div>
    </div>
  );
};

export default Login; 
