import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, setDoc, getDoc, writeBatch, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import AddRecordModal from './AddRecordModal';

interface Player {
  id: string;
  name: string;
  speed: number;
  updatedAt: Date;
}

interface RankedPlayer extends Player {
  rank: number;
}

const Ranking = () => {
  const [rankedPlayers, setRankedPlayers] = useState<RankedPlayer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, `users/${currentUser.uid}/players`), orderBy('speed', 'desc'));
    const unsub = onSnapshot(q, (querySnapshot) => {
      const playersData: Player[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        playersData.push({
          id: doc.id,
          name: data.name,
          speed: data.speed,
          updatedAt: data.updatedAt.toDate(),
        });
      });
      
      let rank = 0;
      let lastSpeed = -1;
      const newRankedPlayers = playersData.map((player, index) => {
        if (player.speed !== lastSpeed) {
          rank = index + 1;
          lastSpeed = player.speed;
        }
        return { ...player, rank };
      });

      setRankedPlayers(newRankedPlayers);
    });
    return () => unsub();
  }, [currentUser]);

  const handleAddRecord = async (name: string, speed: string, date: string) => {
    if (!currentUser || name === '' || speed === '' || date === '') return;

    const newSpeed = Number(speed);
    const recordDate = new Date(date);
    const recordDateString = recordDate.toISOString().split('T')[0];

    const playerRef = doc(db, `users/${currentUser.uid}/players`, name);
    const recordRef = doc(db, `users/${currentUser.uid}/players/${name}/records`, recordDateString);

    try {
      const recordSnap = await getDoc(recordRef);

      if (recordSnap.exists()) {
        const currentDaySpeed = recordSnap.data().speed;
        if (newSpeed > currentDaySpeed) {
          await setDoc(recordRef, { speed: newSpeed, date: recordDate });
        }
      } else {
        await setDoc(recordRef, { speed: newSpeed, date: recordDate });
      }

      const playerSnap = await getDoc(playerRef);
      if (playerSnap.exists()) {
        const currentMaxSpeed = playerSnap.data().speed;
        if (newSpeed > currentMaxSpeed) {
          await setDoc(playerRef, { name, speed: newSpeed, updatedAt: new Date() }, { merge: true });
        }
      } else {
        await setDoc(playerRef, { name, speed: newSpeed, updatedAt: new Date() });
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error("記録の追加に失敗しました: ", error);
    }
  };

  const handleDeletePlayer = async (playerName: string) => {
    if (!currentUser || !window.confirm(`${playerName}選手のすべての記録を削除します。よろしいですか？`)) {
      return;
    }

    try {
      const playerRef = doc(db, `users/${currentUser.uid}/players`, playerName);
      const recordsQuery = query(collection(db, `users/${currentUser.uid}/players/${playerName}/records`));
      
      const batch = writeBatch(db);
      
      const querySnapshot = await getDocs(recordsQuery);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      batch.delete(playerRef);
      
      await batch.commit();

    } catch (error) {
      console.error("選手の削除に失敗しました: ", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("ログアウトに失敗しました: ", error);
    }
  };

  return (
    <div className="page ranking-page">
      <header className="ranking-header container">
        <h1 className="page-title">スピードガンランキング</h1>
        <button onClick={handleLogout} className="btn btn-ghost">
          ログアウト
        </button>
      </header>

      <main className="ranking-main container">
        {rankedPlayers.map((player) => (
          <div key={player.id} className="ranking-item card">
            <div className="player-info">
              <div className="rank-display">
                {player.rank === 1 && '🥇 '}
                {player.rank === 2 && '🥈 '}
                {player.rank === 3 && '🥉 '}
                {player.rank}位: {player.name} - {player.speed} km/h
              </div>
              <div className="update-date">
                更新日: {player.updatedAt.toLocaleDateString()}
              </div>
            </div>
            <div className="player-actions">
              <button
                onClick={() => navigate(`/player/${player.name}`)}
                title="グラフを表示"
                aria-label={`${player.name}のグラフを表示`}
                className="icon-button"
              >
                📈
              </button>
              <button
                onClick={() => handleDeletePlayer(player.name)}
                title="削除"
                aria-label={`${player.name}を削除`}
                className="icon-button icon-button-danger"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </main>

      <button
        className="fab"
        onClick={() => setIsModalOpen(true)}
        aria-label="記録を追加"
      >
        +
      </button>

      <AddRecordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddRecord}
      />
    </div>
  );
};

export default Ranking; 
