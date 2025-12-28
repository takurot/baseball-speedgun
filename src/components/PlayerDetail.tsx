import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type PlayerRecord = {
  id: string;
  date: Date;
  speed: number;
};

type PeriodFilter = 'all' | '30' | '7';
type SortKey = 'date' | 'speed';

type PlayerSnapshot = {
  speed: number | null;
  updatedAt: Date | null;
  name?: string;
} | null;

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

const PlayerDetail = () => {
  const { name } = useParams<{ name: string }>();
  const [records, setRecords] = useState<PlayerRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<{
    record: PlayerRecord;
    playerSnapshot: PlayerSnapshot;
  } | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
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
    if (!name || !currentUser) return;
    setIsLoading(true);
    const q = query(
      collection(db, `users/${currentUser.uid}/players/${name}/records`),
      orderBy('date', 'asc')
    );
    const unsub = onSnapshot(
      q,
      (querySnapshot) => {
        const recordsData: PlayerRecord[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          recordsData.push({
            id: docSnap.id,
            date: data.date.toDate(),
            speed: data.speed,
          });
        });
        setRecords(recordsData);
        setIsLoading(false);
        setError(null);
      },
      (snapshotError) => {
        console.error('記録の取得に失敗しました: ', snapshotError);
        setError('記録の取得に失敗しました。リロードして再試行してください。');
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, [name, currentUser]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  const filteredRecords = useMemo(
    () => records.filter((record) => isWithinPeriod(record.date, periodFilter)),
    [records, periodFilter]
  );

  const sortedRecords = useMemo(() => {
    const sorted = [...filteredRecords];
    if (sortKey === 'speed') {
      sorted.sort((a, b) => {
        if (a.speed === b.speed) {
          return b.date.getTime() - a.date.getTime();
        }
        return b.speed - a.speed;
      });
    } else {
      sorted.sort((a, b) => b.date.getTime() - a.date.getTime());
    }
    return sorted;
  }, [filteredRecords, sortKey]);

  const chartRecords = useMemo(
    () =>
      [...filteredRecords].sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      ),
    [filteredRecords]
  );

  const stats = useMemo(() => {
    if (filteredRecords.length === 0) {
      return { topSpeed: null, averageSpeed: null, latestDate: null as Date | null };
    }
    const speeds = filteredRecords.map((record) => record.speed);
    const topSpeed = Math.max(...speeds);
    const averageSpeed =
      Math.round(
        (speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length) * 10
      ) / 10;
    const latestDate = filteredRecords.reduce(
      (latest, record) =>
        record.date.getTime() > latest.getTime() ? record.date : latest,
      filteredRecords[0].date
    );
    return { topSpeed, averageSpeed, latestDate };
  }, [filteredRecords]);

  const chartData: ChartData<'line'> = useMemo(() => {
    if (chartRecords.length === 0) {
      return { labels: [], datasets: [] };
    }
    const topSpeed = Math.max(...chartRecords.map((record) => record.speed));
    const labels = chartRecords.map((record) => formatDate(record.date));
    return {
      labels,
      datasets: [
        {
          label: '球速 (km/h)',
          data: chartRecords.map((record) => record.speed),
          borderColor: 'rgba(37, 99, 235, 0.8)',
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          tension: 0.18,
          fill: true,
          pointRadius: chartRecords.map((record) =>
            record.speed === topSpeed ? 7 : 4
          ),
          pointHoverRadius: 8,
          pointBackgroundColor: chartRecords.map((record) =>
            record.speed === topSpeed ? '#f97316' : '#2563eb'
          ),
          pointBorderColor: chartRecords.map((record) =>
            record.speed === topSpeed ? '#f97316' : '#ffffff'
          ),
        },
      ],
    };
  }, [chartRecords]);

  const chartOptions: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const dateLabel = context.label || '';
              const speed = context.parsed.y;
              return `${dateLabel}: ${speed} km/h`;
            },
          },
        },
        title: {
          display: true,
          text: `${name ?? ''} の球速推移`,
          align: 'start',
          color: '#1f2937',
        },
      },
      interaction: {
        mode: 'nearest',
        intersect: false,
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: (value) => `${value} km/h`,
          },
        },
      },
    }),
    [name]
  );

  const clearUndoTimer = () => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!name || !currentUser) return;
    const recordToDelete = records.find((record) => record.id === recordId);
    if (!recordToDelete) return;

    setPendingDeleteId(recordId);
    clearUndoTimer();

    try {
      const recordRef = doc(
        db,
        `users/${currentUser.uid}/players/${name}/records`,
        recordId
      );
      const playerRef = doc(db, `users/${currentUser.uid}/players`, name);
      const playerSnap = await getDoc(playerRef);
      const playerSnapshot: PlayerSnapshot = playerSnap.exists()
        ? {
            speed: playerSnap.data().speed ?? null,
            updatedAt: playerSnap.data().updatedAt?.toDate
              ? playerSnap.data().updatedAt.toDate()
              : null,
            name: playerSnap.data().name,
          }
        : null;

      await deleteDoc(recordRef);

      const remainingRecords = records.filter((record) => record.id !== recordId);
      if (remainingRecords.length === 0) {
        await deleteDoc(playerRef);
      } else {
        const maxSpeed = Math.max(...remainingRecords.map((record) => record.speed));
        const latestDate = remainingRecords.reduce(
          (latest, record) =>
            record.date.getTime() > latest.getTime() ? record.date : latest,
          remainingRecords[0].date
        );
        await setDoc(
          playerRef,
          { speed: maxSpeed, updatedAt: latestDate },
          { merge: true }
        );
      }

      setUndoState({ record: recordToDelete, playerSnapshot });
      undoTimerRef.current = setTimeout(() => setUndoState(null), 5000);
    } catch (deleteError) {
      console.error('記録の削除に失敗しました: ', deleteError);
      setError('記録の削除に失敗しました。ネットワークを確認してください。');
    } finally {
      setPendingDeleteId(null);
    }
  };

  const handleUndoDelete = async () => {
    if (!name || !currentUser || !undoState) return;
    const { record } = undoState;
    clearUndoTimer();

    try {
      const recordRef = doc(
        db,
        `users/${currentUser.uid}/players/${name}/records`,
        record.id
      );
      const playerRef = doc(db, `users/${currentUser.uid}/players`, name);

      await setDoc(recordRef, { speed: record.speed, date: record.date });

      const playerSnap = await getDoc(playerRef);
      const currentSpeed = playerSnap.exists() ? playerSnap.data().speed ?? 0 : 0;
      const currentUpdatedAt =
        playerSnap.exists() && playerSnap.data().updatedAt?.toDate
          ? playerSnap.data().updatedAt.toDate()
          : null;
      const nextSpeed = Math.max(currentSpeed, record.speed);
      const nextUpdatedAt =
        currentUpdatedAt && currentUpdatedAt.getTime() > record.date.getTime()
          ? currentUpdatedAt
          : record.date;

      await setDoc(
        playerRef,
        { name, speed: nextSpeed, updatedAt: nextUpdatedAt },
        { merge: true }
      );
    } catch (undoError) {
      console.error('削除の取り消しに失敗しました: ', undoError);
      setError('削除の取り消しに失敗しました。再度お試しください。');
    } finally {
      setUndoState(null);
    }
  };

  const closeUndo = () => {
    clearUndoTimer();
    setUndoState(null);
  };

  return (
    <div className="page detail-page">
      <div className="container">
        <Link to="/ranking" className="back-link">
          ← ランキングに戻る
        </Link>
        <header className="detail-header">
          <div className="detail-heading">
            <p className="eyebrow">選手詳細</p>
            <h1 className="page-title">{name}の推移</h1>
            <p className="subtle-text">
              期間で絞り込みながら、最高速度の山や直近の伸びを確認できます。
            </p>
          </div>
          <div className="detail-filter-group" role="group" aria-label="期間フィルタ">
            {[
              { label: '全期間', value: 'all' },
              { label: '直近30日', value: '30' },
              { label: '直近7日', value: '7' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`filter-pill ${
                  periodFilter === option.value ? 'filter-pill-active' : ''
                }`}
                onClick={() => setPeriodFilter(option.value as PeriodFilter)}
                aria-pressed={periodFilter === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </header>

        <section className="detail-summary card">
          <div className="detail-summary-grid">
            <div className="stat-card">
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
            <div className="stat-card">
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
            <div className="stat-card">
              <p className="stat-label">直近の記録日</p>
              <p className="stat-value">
                {stats.latestDate ? formatDate(stats.latestDate) : '--'}
              </p>
            </div>
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
          <div className="detail-skeletons">
            <div className="card skeleton chart-skeleton" aria-hidden>
              <div className="skeleton-bar wide" />
              <div className="skeleton-bar" />
              <div className="skeleton-bar" />
            </div>
            <div className="card skeleton list-skeleton" aria-hidden>
              <div className="skeleton-bar wide" />
              <div className="skeleton-bar" />
              <div className="skeleton-bar" />
            </div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="card empty-card">
            <p className="empty-state">
              選択した期間の記録がありません。期間を広げるか、ランキングから記録を追加してください。
            </p>
          </div>
        ) : (
          <>
            <section className="detail-card card">
              <div className="section-heading">
                <div>
                  <h2 className="section-title">球速の推移</h2>
                  <p className="section-subtitle">
                    最高速度のポイントをハイライトし、ホバーで日付と速度を確認できます。
                  </p>
                </div>
                <div className="tag">
                  {periodFilter === 'all'
                    ? '全期間'
                    : periodFilter === '30'
                      ? '直近30日'
                      : '直近7日'}
                </div>
              </div>
              <div className="chart-wrapper">
                <Line options={chartOptions} data={chartData} />
              </div>
            </section>

            <section className="detail-card card">
              <div className="section-heading">
                <div>
                  <h2 className="section-title">記録一覧</h2>
                  <p className="section-subtitle">
                    日付順や球速順に並べ替えて、推移の山やピークを追いやすくしました。
                  </p>
                </div>
                <div className="toolbar-group">
                  <label className="toolbar-label" htmlFor="sort-key">
                    並び替え
                  </label>
                  <select
                    id="sort-key"
                    className="input"
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    aria-label="記録の並び替え"
                  >
                    <option value="date">日付（新しい順）</option>
                    <option value="speed">球速（高速順）</option>
                  </select>
                </div>
              </div>
              <ul className="record-list">
                {sortedRecords.map((record) => (
                  <li key={record.id} className="record-item card">
                    <div className="record-content">
                      <p className="record-date">{formatDate(record.date)}</p>
                      <p className="record-meta">
                        <span className="speed-badge">
                          <span className="speed-value">{record.speed}</span>
                          <span className="speed-unit">km/h</span>
                        </span>
                        <span className="badge badge-accent">直近の結果</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteRecord(record.id)}
                      className="btn btn-ghost btn-sm"
                      disabled={pendingDeleteId === record.id}
                    >
                      {pendingDeleteId === record.id ? '削除中...' : '削除'}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
      {undoState && (
        <div className="snackbar" role="status" aria-live="polite">
          <span>記録を削除しました</span>
          <div className="snackbar-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleUndoDelete}
            >
              取り消す
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={closeUndo}
              aria-label="スナックバーを閉じる"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerDetail;
