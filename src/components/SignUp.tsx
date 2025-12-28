import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/ranking');
    } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
            setError('このメールアドレスは既に使用されています。');
        } else if (err.code === 'auth/weak-password') {
            setError('パスワードは6文字以上で入力してください。');
        } else {
            setError('アカウントの作成に失敗しました。');
        }
      console.error(err);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h2 className="auth-title">新規登録</h2>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={handleSignUp} className="auth-form">
          <div className="form-field">
            <label className="form-label" htmlFor="signup-email">
              メールアドレス
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="signup-password">
              パスワード
            </label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
            />
          </div>
          <button type="submit" className="btn btn-success btn-block">
            登録する
          </button>
        </form>
        <p className="auth-footer">
          既にアカウントをお持ちですか？ <Link to="/login">ログイン</Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp; 
