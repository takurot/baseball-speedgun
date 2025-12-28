import React, { useEffect, useMemo, useState } from 'react';
import { db, auth } from '../firebase';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  onSnapshot,
  query,
  doc,
  setDoc,
  getDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
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

type SortKey = 'speed' | 'updatedAt' | 'name';
type PeriodFilter = 'all' | '30' | '7';

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('ja-JP').format(date);

const isWithinPeriod = (date: Date, filter: PeriodFilter) => {
  if (filter === 'all') return true;
  const days = filter === '30' ? 30 : 7;
  const threshold = new Date();
  threshold.setHours(0, 0, 0, 0);
  threshold.setDate(threshold.getDate() - (days - 1));
  return date >= threshold;
};

const buildRanks = (players: Player[]): RankedPlayer[] => {
  const sortedBySpeed = [...players].sort((a, b) => {
    if (a.speed === b.speed) {
      return a.name.localeCompare(b.name, 'ja');
    }
    return b.speed - a.speed;
  });

  let rank = 0;
  let lastSpeed = -1;

  return sortedBySpeed.map((player, index) => {
    if (player.speed !== lastSpeed) {
      rank = index + 1;
      lastSpeed = player.speed;
    }
    return { ...player, rank };
  });
};

const Ranking = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [presetName, setPresetName] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('speed');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

    setIsLoading(true);
    const playersRef = collection(db, `users/${currentUser.uid}/players`);
    const unsub = onSnapshot(
      playersRef,
      (querySnapshot) => {
        const playersData: Player[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          playersData.push({
            id: docSnap.id,
            name: data.name,
            speed: data.speed,
            updatedAt: data.updatedAt?.toDate
              ? data.updatedAt.toDate()
              : new Date(),
          });
        });

        setPlayers(playersData);
        setIsLoading(false);
        setError(null);
      },
      (snapshotError) => {
        console.error('ランキングの取得に失敗しました: ', snapshotError);
        setError('ランキングの取得に失敗しました。リロードして再試行してください。');
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, [currentUser]);

  const handleAddRecord = async (name: string, speed: string, date: string) => {
    if (!currentUser || name === '' || speed === '' || date === '') return;

    const newSpeed = Number(speed);
    if (Number.isNaN(newSpeed)) return;
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
      const currentMaxSpeed = playerSnap.exists() ? playerSnap.data().speed : 0;
      const nextMaxSpeed = Math.max(currentMaxSpeed, newSpeed);
      await setDoc(
        playerRef,
        { name, speed: nextMaxSpeed, updatedAt: recordDate },
        { merge: true }
      );

      setIsModalOpen(false);
      setPresetName(undefined);
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

  const filteredPlayers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return players.filter((player) => {
      const matchesSearch = keyword
        ? player.name.toLowerCase().includes(keyword)
        : true;
      const matchesPeriod = isWithinPeriod(player.updatedAt, periodFilter);
      return matchesSearch && matchesPeriod;
    });
  }, [players, periodFilter, searchTerm]);

  const rankedPlayers = useMemo(
    () => buildRanks(filteredPlayers),
    [filteredPlayers]
  );

  const sortedPlayers = useMemo(() => {
    const sorted = [...rankedPlayers];
    if (sortKey === 'updatedAt') {
      sorted.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } else if (sortKey === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    }
    return sorted;
  }, [rankedPlayers, sortKey]);

  const stats = useMemo(() => {
    if (filteredPlayers.length === 0) {
      return { topSpeed: null, averageSpeed: null, playerCount: 0 };
    }
    const speeds = filteredPlayers.map((player) => player.speed);
    const topSpeed = Math.max(...speeds);
    const averageSpeed =
      Math.round((speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length) * 10) /
      10;
    return { topSpeed, averageSpeed, playerCount: filteredPlayers.length };
  }, [filteredPlayers]);

  const handleOpenModal = (name?: string) => {
    setPresetName(name);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPresetName(undefined);
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
        <div className="ranking-headings">
          <p className="eyebrow">ダッシュボード</p>
          <h1 className="page-title">スピードガンランキング</h1>
          <p className="subtle-text">
            最高速度でソートしつつ、期間や検索で目的の選手をすぐに探せます。
          </p>
        </div>
        <div className="ranking-actions">
          <button onClick={handleLogout} className="btn btn-ghost">
            ログアウト
          </button>
        </div>
      </header>

      <section className="ranking-toolbar container card">
        <div className="toolbar-group">
          <label className="toolbar-label" htmlFor="period-filter">
            期間
          </label>
          <select
            id="period-filter"
            className="input"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
            aria-label="期間フィルタ"
          >
            <option value="all">全期間</option>
            <option value="30">直近30日</option>
            <option value="7">直近7日</option>
          </select>
        </div>
        <div className="toolbar-group">
          <label className="toolbar-label" htmlFor="sort-key">
            ソート
          </label>
          <select
            id="sort-key"
            className="input"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            aria-label="ソート"
          >
            <option value="speed">最高速度</option>
            <option value="updatedAt">更新日</option>
            <option value="name">名前</option>
          </select>
        </div>
        <div className="toolbar-search">
          <input
            type="search"
            className="input"
            placeholder="選手名で検索"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="選手名検索"
          />
        </div>
      </section>

      <main className="ranking-main container">
        <section className="ranking-stats">
          <div className="stat-card card">
            <p className="stat-label">最高球速</p>
            <p className="stat-value">
              {stats.topSpeed !== null ? (
                <>
                  <span className="stat-number">{stats.topSpeed}</span>
                  <span className="stat-unit">km/h</span>
                </>
              ) : (
                '--'
              )}
            </p>
          </div>
          <div className="stat-card card">
            <p className="stat-label">平均球速</p>
            <p className="stat-value">
              {stats.averageSpeed !== null ? (
                <>
                  <span className="stat-number">{stats.averageSpeed}</span>
                  <span className="stat-unit">km/h</span>
                </>
              ) : (
                '--'
              )}
            </p>
          </div>
          <div className="stat-card card">
            <p className="stat-label">登録選手</p>
            <p className="stat-value">
              <span className="stat-number">{stats.playerCount}</span>
              <span className="stat-unit">人</span>
            </p>
          </div>
        </section>

        {error && (
          <div className="alert alert-error">
            <div>
              <p className="alert-title">データを読み込めませんでした</p>
              <p className="alert-body">{error}</p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => window.location.reload()}
            >
              再読込
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="ranking-skeletons">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="ranking-item card skeleton" aria-hidden>
                <div className="skeleton-bar wide" />
                <div className="skeleton-bar" />
              </div>
            ))}
          </div>
        ) : sortedPlayers.length === 0 ? (
          <div className="card empty-card">
            <p className="empty-state">
              まだ記録がありません。最初の1球を登録しましょう。
            </p>
            <div className="empty-actions">
              <button
                className="btn btn-primary"
                onClick={() => handleOpenModal()}
              >
                記録を追加
              </button>
            </div>
          </div>
        ) : (
          <div className="ranking-list">
            {sortedPlayers.map((player) => (
              <div key={player.id} className="ranking-item card">
                <div
                  className="ranking-item-main"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/player/${player.name}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/player/${player.name}`);
                    }
                  }}
                >
                  <div
                    className={`rank-badge ${
                      player.rank === 1
                        ? 'rank-1'
                        : player.rank === 2
                          ? 'rank-2'
                          : player.rank === 3
                            ? 'rank-3'
                            : ''
                    }`}
                    aria-label={`${player.rank}位`}
                  >
                    {player.rank}
                  </div>
                  <div className="player-name-group">
                    <p className="player-name">{player.name}</p>
                    <p className="player-updated">
                      更新日: {formatDate(player.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="player-speed">
                  <span className="speed-value">{player.speed}</span>
                  <span className="speed-unit">km/h</span>
                </div>
                <div className="player-actions">
                  <button
                    onClick={() => handleOpenModal(player.name)}
                    title="記録を追加"
                    aria-label={`${player.name}に記録を追加`}
                    className="icon-button"
                  >
                    +
                  </button>
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
          </div>
        )}
      </main>

      <button
        className="fab fab-labeled"
        onClick={() => handleOpenModal()}
        aria-label="記録を追加"
      >
        <span className="fab-icon">+</span>
        <span>記録を追加</span>
      </button>

      <AddRecordModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleAddRecord}
        presetName={presetName}
      />
    </div>
  );
};

export default Ranking; 
