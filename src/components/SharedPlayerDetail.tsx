import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
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
  ChartData,
  ChartOptions,
} from 'chart.js';
import { auth, db } from '../firebase';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type PeriodFilter = 'all' | '30' | '7';

type ChartRecord = {
  date: Date;
  speed: number;
};

const formatDate = (date: Date) => new Intl.DateTimeFormat('ja-JP').format(date);

const periodLabel: Record<PeriodFilter, string> = {
  all: '全期間',
  '30': '直近30日',
  '7': '直近7日',
};

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const candidate = value as { toDate?: () => Date };
    if (typeof candidate.toDate === 'function') {
      return candidate.toDate();
    }
  }
  return null;
};

const SharedPlayerDetail: React.FC = () => {
  const { shareId, name } = useParams<{ shareId: string; name: string }>();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [records, setRecords] = useState<ChartRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInvalid, setIsInvalid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!shareId || !name) {
      setIsInvalid(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsInvalid(false);
    setError(null);

    const shareRef = doc(db, 'shares', shareId);
    const unsubscribe = onSnapshot(
      shareRef,
      (snap) => {
        if (!snap.exists()) {
          setIsInvalid(true);
          setIsLoading(false);
          return;
        }
        const raw = snap.data();
        setPeriodFilter((raw.periodFilter as PeriodFilter) ?? 'all');
        setExpiresAt(toDate(raw.expiresAt));
      },
      (snapshotError) => {
        console.error('共有リンクの取得に失敗しました: ', snapshotError);
        setIsInvalid(true);
        setIsLoading(false);
        setError('この共有リンクは無効か期限切れです。');
      }
    );

    return () => unsubscribe();
  }, [name, shareId]);

  useEffect(() => {
    if (!shareId || !name) return;
    if (isInvalid) return;

    const chartRef = doc(db, 'shares', shareId, 'charts', name);
    const unsubscribe = onSnapshot(
      chartRef,
      (snap) => {
        if (!snap.exists()) {
          setRecords([]);
          setIsTruncated(false);
          setIsLoading(false);
          setError(
            'この共有リンクには推移グラフが含まれていません。共有リンクを再発行してもらってください。'
          );
          return;
        }

        const raw = snap.data();
        const rawRecords = Array.isArray(raw.records) ? raw.records : [];
        const parsedRecords = rawRecords
          .map((record: any) => ({
            date: toDate(record.date) ?? new Date(),
            speed: typeof record.speed === 'number' ? record.speed : 0,
          }))
          .filter((record: ChartRecord) => record.speed > 0)
          .sort((a: ChartRecord, b: ChartRecord) => a.date.getTime() - b.date.getTime());
        setRecords(parsedRecords);
        setIsTruncated(Boolean(raw.truncated));
        setIsLoading(false);
        setError(null);
      },
      (snapshotError) => {
        console.error('共有グラフの取得に失敗しました: ', snapshotError);
        setRecords([]);
        setIsTruncated(false);
        setIsLoading(false);
        setError('推移グラフを表示できませんでした。');
      }
    );

    return () => unsubscribe();
  }, [isInvalid, name, shareId]);

  const isExpired = useMemo(() => {
    if (!expiresAt) return false;
    return expiresAt.getTime() < Date.now();
  }, [expiresAt]);

  const chartData: ChartData<'line'> = useMemo(() => {
    if (records.length === 0) {
      return { labels: [], datasets: [] };
    }
    const topSpeed = Math.max(...records.map((record) => record.speed));
    const labels = records.map((record) => formatDate(record.date));
    return {
      labels,
      datasets: [
        {
          label: '球速 (km/h)',
          data: records.map((record) => record.speed),
          borderColor: 'rgba(37, 99, 235, 0.8)',
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          tension: 0.18,
          fill: true,
          pointRadius: records.map((record) => (record.speed === topSpeed ? 7 : 4)),
          pointHoverRadius: 8,
          pointBackgroundColor: records.map((record) =>
            record.speed === topSpeed ? '#f97316' : '#2563eb'
          ),
          pointBorderColor: records.map((record) =>
            record.speed === topSpeed ? '#f97316' : '#ffffff'
          ),
        },
      ],
    };
  }, [records]);

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

  const stats = useMemo(() => {
    if (records.length === 0) {
      return { topSpeed: null, averageSpeed: null, latestDate: null as Date | null };
    }
    const speeds = records.map((record) => record.speed);
    const topSpeed = Math.max(...speeds);
    const averageSpeed =
      Math.round((speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length) * 10) / 10;
    const latestDate = records.reduce(
      (latest, record) =>
        record.date.getTime() > latest.getTime() ? record.date : latest,
      records[0].date
    );
    return { topSpeed, averageSpeed, latestDate };
  }, [records]);

  const statusText = useMemo(() => {
    if (expiresAt && isExpired) return 'この共有リンクは期限切れです';
    if (expiresAt) return `期限: ${formatDate(expiresAt)}`;
    return '期限: 無期限';
  }, [expiresAt, isExpired]);

  const invalidMessage = error ?? 'この共有リンクは無効か期限切れです。';

  if (isLoading) {
    return (
      <div className="page detail-page">
        <header className="container">
          <p className="subtle-text">読み込み中...</p>
        </header>
      </div>
    );
  }

  if (isInvalid || isExpired || !shareId || !name) {
    return (
      <div className="page detail-page">
        <header className="container">
          <p className="eyebrow">共有</p>
          <h1 className="page-title">推移グラフ</h1>
          <p className="subtle-text">{invalidMessage}</p>
        </header>
        <main className="ranking-main container">
          <div className="card empty-card">
            <p className="empty-state">推移グラフを表示できませんでした。</p>
            <div className="empty-actions">
              {currentUser ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate('/ranking')}
                >
                  自分のランキングへ戻る
                </button>
              ) : (
                <>
                  <Link className="btn btn-primary" to="/signup">
                    自分用に作る
                  </Link>
                  <Link className="btn btn-ghost" to="/login">
                    ログイン
                  </Link>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page detail-page">
      <header className="container">
        <Link className="back-link" to={`/share/${shareId}`}>
          ← 共有ランキングに戻る
        </Link>
        <div className="detail-header">
          <div className="detail-heading">
            <p className="eyebrow">共有</p>
            <h1 className="page-title">{name} の推移</h1>
            <p className="subtle-text">
              {periodLabel[periodFilter]} / 閲覧専用 ・ {statusText}
            </p>
            {isTruncated && (
              <p className="input-hint">最新の記録のみ表示しています。</p>
            )}
          </div>
          <div className="ranking-actions">
            {currentUser ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigate('/ranking')}
              >
                自分のランキングへ
              </button>
            ) : (
              <Link className="btn btn-ghost" to="/signup">
                自分用に作る
              </Link>
            )}
          </div>
        </div>
      </header>

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
            <p className="stat-label">直近の記録日</p>
            <p className="stat-value">
              {stats.latestDate ? (
                <span className="stat-number">{formatDate(stats.latestDate)}</span>
              ) : (
                '--'
              )}
            </p>
          </div>
        </section>

        {error && (
          <div className="alert alert-error">
            <div>
              <p className="alert-title">推移グラフを表示できませんでした</p>
              <p className="alert-body">{error}</p>
            </div>
          </div>
        )}

        {records.length === 0 ? (
          <div className="card empty-card">
            <p className="empty-state">推移グラフを表示する記録がありません。</p>
          </div>
        ) : (
          <section className="card detail-card">
            <div className="chart-wrapper share-chart-wrapper">
              <Line options={chartOptions} data={chartData} />
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default SharedPlayerDetail;

