import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';

import Ranking from './components/Ranking';
import PlayerDetail from './components/PlayerDetail';
import SharedRanking from './components/SharedRanking';
import SharedPlayerDetail from './components/SharedPlayerDetail';
import Login from './components/Login';
import SignUp from './components/SignUp';
import './App.css';

// ログインしているユーザーだけがアクセスできるページを制御するコンポーネント
const PrivateRoute = ({ user }: { user: User | null }) => {
  if (user === undefined) {
    return <p>読み込み中...</p>; // 認証状態を確認中
  }
  return user ? <Outlet /> : <Navigate to="/login" />;
};

// ログインしていないユーザーだけがアクセスできるページを制御するコンポーネント
const PublicRoute = ({ user }: { user: User | null }) => {
    if (user === undefined) {
      return <p>読み込み中...</p>; // 認証状態を確認中
    }
    return !user ? <Outlet /> : <Navigate to="/ranking" />;
  };

function App() {
  const [user, setUser] = useState<User | null>(null);
  // undefinedは認証状態がまだ確認できていないことを示す
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecked(true); // 認証状態の確認が完了
    });
    return () => unsubscribe(); // クリーンアップ
  }, []);

  if (!authChecked) {
    return <p>読み込み中...</p>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/ranking" /> : <Navigate to="/login" />} />

        {/* 共有リンクはログイン不要 */}
        <Route path="/share/:shareId" element={<SharedRanking />} />
        <Route path="/share/:shareId/player/:name" element={<SharedPlayerDetail />} />
        
        {/* ログイン済みユーザー向けのルート */}
        <Route element={<PrivateRoute user={user} />}>
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/player/:name" element={<PlayerDetail />} />
        </Route>

        {/* 未ログインユーザー向けのルート */}
        <Route element={<PublicRoute user={user} />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;
