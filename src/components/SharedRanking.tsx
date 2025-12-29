import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

type PeriodFilter = 'all' | '30' | '7';

type SharedPlayer = {
  rank: number;
  name: string;
  speed: number;
  updatedAt: Date;
};

type SharedStats = {
  topSpeed: number | null;
  averageSpeed: number | null;
  playerCount: number;
};

type SharedRankingData = {
  periodFilter: PeriodFilter;
  stats: SharedStats;
  players: SharedPlayer[];
  expiresAt: Date | null;
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

const SharedRanking: React.FC = () => {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [data, setData] = useState<SharedRankingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInvalid, setIsInvalid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!shareId) {
      setIsInvalid(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsInvalid(false);
    setError(null);

    const ref = doc(db, 'shares', shareId);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setData(null);
          setIsInvalid(true);
          setIsLoading(false);
          return;
        }

        const raw = snap.data();
        const stats = raw.stats ?? {};
        const players = Array.isArray(raw.players) ? raw.players : [];
        const parsed: SharedRankingData = {
          periodFilter: (raw.periodFilter as PeriodFilter) ?? 'all',
          stats: {
            topSpeed: typeof stats.topSpeed === 'number' ? stats.topSpeed : null,
            averageSpeed:
              typeof stats.averageSpeed === 'number' ? stats.averageSpeed : null,
            playerCount:
              typeof stats.playerCount === 'number' ? stats.playerCount : 0,
          },
          players: players
            .map((player: any) => ({
              rank: typeof player.rank === 'number' ? player.rank : 0,
              name: typeof player.name === 'string' ? player.name : '',
              speed: typeof player.speed === 'number' ? player.speed : 0,
              updatedAt: toDate(player.updatedAt) ?? new Date(),
            }))
            .filter((player: SharedPlayer) => player.name),
          expiresAt: toDate(raw.expiresAt),
        };

        setData(parsed);
        setIsInvalid(false);
        setIsLoading(false);
      },
      (snapshotError) => {
        console.error('共有ランキングの取得に失敗しました: ', snapshotError);
        setData(null);
        setIsInvalid(true);
        setIsLoading(false);
        setError('この共有リンクは無効か期限切れです。');
      }
    );

    return () => unsubscribe();
  }, [shareId]);

  const isExpired = useMemo(() => {
    if (!data?.expiresAt) return false;
    return data.expiresAt.getTime() < Date.now();
  }, [data]);

  const statusText = useMemo(() => {
    if (!data) return '';
    if (data.expiresAt && isExpired) return 'この共有リンクは期限切れです';
    if (data.expiresAt) return `期限: ${formatDate(data.expiresAt)}`;
    return '期限: 無期限';
  }, [data, isExpired]);

  if (isLoading) {
    return (
      <div className="page ranking-page">
        <header className="ranking-header container">
          <div className="ranking-headings">
            <p className="eyebrow">共有</p>
            <h1 className="page-title">共有ランキング</h1>
            <p className="subtle-text">読み込み中...</p>
          </div>
        </header>
        <main className="ranking-main container">
          <div className="ranking-skeletons">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="ranking-item card skeleton" aria-hidden>
                <div className="skeleton-bar wide" />
                <div className="skeleton-bar" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (isInvalid || !data || isExpired || !shareId) {
    return (
      <div className="page ranking-page">
        <header className="ranking-header container">
          <div className="ranking-headings">
            <p className="eyebrow">共有</p>
            <h1 className="page-title">共有ランキング</h1>
            <p className="subtle-text">
              {error ?? 'この共有リンクは無効か期限切れです。'}
            </p>
          </div>
        </header>
        <main className="ranking-main container">
          <div className="card empty-card">
            <p className="empty-state">共有ランキングを表示できませんでした。</p>
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
    <div className="page ranking-page">
      <header className="ranking-header container">
        <div className="ranking-headings">
          <p className="eyebrow">共有</p>
          <h1 className="page-title">共有ランキング</h1>
          <p className="subtle-text">
            {periodLabel[data.periodFilter]} / 閲覧専用
            {statusText ? ` ・ ${statusText}` : ''}
          </p>
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
      </header>

      <main className="ranking-main container">
        <section className="ranking-stats">
          <div className="stat-card card">
            <p className="stat-label">最高球速</p>
            <p className="stat-value">
              {data.stats.topSpeed !== null ? (
                <>
                  <span className="stat-number">{data.stats.topSpeed}</span>
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
              {data.stats.averageSpeed !== null ? (
                <>
                  <span className="stat-number">{data.stats.averageSpeed}</span>
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
              <span className="stat-number">{data.stats.playerCount}</span>
              <span className="stat-unit">人</span>
            </p>
          </div>
        </section>

        {data.players.length === 0 ? (
          <div className="card empty-card">
            <p className="empty-state">共有するランキングがありません。</p>
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
                <Link className="btn btn-primary" to="/signup">
                  自分用に作る
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="ranking-list">
            {data.players.map((player) => (
              <div key={player.name} className="ranking-item card">
                <div className="ranking-item-main ranking-item-main-static">
                  <div
                    className={`rank-badge ${player.rank === 1
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
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SharedRanking;
