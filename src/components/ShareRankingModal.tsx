import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../firebase';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';

type PeriodFilter = 'all' | '30' | '7';

type Toast = { type: 'success' | 'error'; message: string };

type SnapshotPlayer = {
  rank: number;
  name: string;
  speed: number;
  updatedAt: Date;
};

type SnapshotStats = {
  topSpeed: number | null;
  averageSpeed: number | null;
  playerCount: number;
};

type RankingSnapshot = {
  periodFilter: PeriodFilter;
  players: SnapshotPlayer[];
  stats: SnapshotStats;
};

type ExpiryOption = '7' | '30' | 'none';

type ShareLink = {
  id: string;
  createdAt: Date | null;
  expiresAt: Date | null;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ownerUid: string;
  snapshot: RankingSnapshot;
  onToast: (toast: Toast) => void;
}

const scheduleFocus = (callback: () => void) => {
  if (
    typeof window !== 'undefined' &&
    typeof window.requestAnimationFrame === 'function'
  ) {
    window.requestAnimationFrame(callback);
  } else {
    setTimeout(callback, 0);
  }
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

const periodLabel: Record<PeriodFilter, string> = {
  all: '全期間',
  '30': '直近30日',
  '7': '直近7日',
};

const buildShareUrl = (shareId: string) =>
  `${window.location.origin}/share/${shareId}`;

const addDays = (base: Date, days: number) => {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
};

const copyToClipboard = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

const ShareRankingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  ownerUid,
  snapshot,
  onToast,
}) => {
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [expiry, setExpiry] = useState<ExpiryOption>('7');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const linkInputRef = useRef<HTMLInputElement | null>(null);

  const shareUrl = useMemo(
    () => (shareLink ? buildShareUrl(shareLink.id) : ''),
    [shareLink]
  );

  const canShare = useMemo(() => {
    return typeof (navigator as any).share === 'function';
  }, []);

  const isExpired = useMemo(() => {
    if (!shareLink?.expiresAt) return false;
    return shareLink.expiresAt.getTime() < Date.now();
  }, [shareLink]);

  const getFocusableElements = useCallback(() => {
    const root = modalRef.current;
    if (!root) return [];
    const selectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ];
    return Array.from(root.querySelectorAll<HTMLElement>(selectors.join(','))).filter(
      (el) => !el.hasAttribute('aria-hidden')
    );
  }, []);

  const fetchLatestShare = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'shares'),
        where('ownerUid', '==', ownerUid)
      );
      const snapshot = await getDocs(q);
      const links: ShareLink[] = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            createdAt: toDate(data.createdAt),
            expiresAt: toDate(data.expiresAt),
          };
        })
        .sort((a, b) => {
          const aTime = a.createdAt?.getTime() ?? 0;
          const bTime = b.createdAt?.getTime() ?? 0;
          return bTime - aTime;
        });
      setShareLink(links[0] ?? null);
    } catch (error) {
      console.error('共有リンクの取得に失敗しました: ', error);
      setError('共有リンクの取得に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  }, [ownerUid]);

  useEffect(() => {
    if (!isOpen) return;
    void fetchLatestShare();
  }, [fetchLatestShare, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    scheduleFocus(() => {
      const focusTarget = linkInputRef.current ?? getFocusableElements()[0];
      focusTarget?.focus();
    });
  }, [getFocusableElements, isOpen, shareLink]);

  const handleCreate = async () => {
    if (snapshot.players.length === 0) {
      onToast({ type: 'error', message: '共有するランキングがありません' });
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const now = new Date();
      const expiresAt =
        expiry === 'none'
          ? null
          : addDays(now, expiry === '7' ? 7 : 30);

      const sharesQuery = query(
        collection(db, 'shares'),
        where('ownerUid', '==', ownerUid)
      );
      const existing = await getDocs(sharesQuery);
      const batch = writeBatch(db);
      existing.docs.forEach((docSnap) => batch.delete(docSnap.ref));

      const shareRef = doc(collection(db, 'shares'));
      batch.set(shareRef, {
        version: 1,
        ownerUid,
        createdAt: serverTimestamp(),
        expiresAt,
        periodFilter: snapshot.periodFilter,
        stats: snapshot.stats,
        players: snapshot.players.map((player) => ({
          rank: player.rank,
          name: player.name,
          speed: player.speed,
          updatedAt: player.updatedAt,
        })),
      });

      await batch.commit();
      setShareLink({ id: shareRef.id, createdAt: now, expiresAt });
      onToast({ type: 'success', message: '共有リンクを作成しました' });
    } catch (error) {
      console.error('共有リンクの作成に失敗しました: ', error);
      setError(
        '共有リンクの作成に失敗しました。ネットワークを確認して再試行してください。'
      );
      onToast({ type: 'error', message: '共有リンクの作成に失敗しました' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisable = async () => {
    if (!shareLink) return;
    if (!window.confirm('この共有リンクを無効化します。よろしいですか？')) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await deleteDoc(doc(db, 'shares', shareLink.id));
      setShareLink(null);
      onToast({ type: 'success', message: '共有リンクを無効化しました' });
    } catch (error) {
      console.error('共有リンクの無効化に失敗しました: ', error);
      setError(
        '共有リンクの無効化に失敗しました。ネットワークを確認して再試行してください。'
      );
      onToast({ type: 'error', message: '共有リンクの無効化に失敗しました' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!shareLink) return;
    try {
      await copyToClipboard(shareUrl);
      onToast({ type: 'success', message: '共有リンクをコピーしました' });
    } catch (error) {
      console.error('コピーに失敗しました: ', error);
      onToast({ type: 'error', message: 'コピーに失敗しました' });
    }
  };

  const handleShare = async () => {
    if (!shareLink) return;
    if (!canShare) {
      await handleCopy();
      return;
    }

    try {
      await (navigator as any).share({
        title: 'スピードガンランキング',
        text: 'スピードガンランキング（閲覧専用）',
        url: shareUrl,
      });
      onToast({ type: 'success', message: '共有を開始しました' });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('共有に失敗しました: ', error);
      onToast({ type: 'error', message: '共有に失敗しました' });
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const currentIndex = focusableElements.indexOf(
      document.activeElement as HTMLElement
    );
    const lastIndex = focusableElements.length - 1;
    let nextIndex = currentIndex;

    if (event.shiftKey) {
      nextIndex = currentIndex <= 0 ? lastIndex : currentIndex - 1;
    } else {
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    }

    event.preventDefault();
    focusableElements[nextIndex]?.focus();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-ranking-title"
        ref={modalRef}
        onKeyDown={handleKeyDown}
      >
        <h2 id="share-ranking-title">ランキングを共有</h2>
        <div className="modal-form" aria-busy={isSubmitting || isLoading}>
          <p className="subtle-text share-description">
            このリンクを知っている人はログインなしで閲覧できます。元データ（/users 配下）は公開されません。
          </p>

          <div className="form-field">
            <label className="form-label" htmlFor="share-expiry">
              有効期限
            </label>
            <select
              id="share-expiry"
              className="input"
              value={expiry}
              onChange={(event) => setExpiry(event.target.value as ExpiryOption)}
              disabled={isSubmitting || isLoading}
            >
              <option value="7">7日</option>
              <option value="30">30日</option>
              <option value="none">無期限</option>
            </select>
            <p className="input-hint">
              共有対象: {periodLabel[snapshot.periodFilter]} のランキング
            </p>
          </div>

          {isLoading ? (
            <div className="card skeleton share-skeleton" aria-hidden />
          ) : shareLink ? (
            <div className="card share-link-card">
              <div className="form-field">
                <label className="form-label" htmlFor="share-url">
                  共有リンク
                </label>
                <input
                  id="share-url"
                  className="input"
                  value={shareUrl}
                  readOnly
                  ref={linkInputRef}
                />
                <p className="input-hint">
                  {isExpired
                    ? 'このリンクは期限切れです。再発行してください。'
                    : shareLink.expiresAt
                      ? `期限: ${new Intl.DateTimeFormat('ja-JP').format(shareLink.expiresAt)}`
                      : '期限: 無期限'}
                </p>
              </div>
              <div className="share-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => void handleCopy()}
                  disabled={isSubmitting}
                >
                  コピー
                </button>
                {canShare && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => void handleShare()}
                    disabled={isSubmitting}
                  >
                    OS共有
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm share-danger"
                  onClick={() => void handleDisable()}
                  disabled={isSubmitting}
                >
                  無効化
                </button>
              </div>
            </div>
          ) : (
            <div className="card empty-card share-empty">
              <p className="empty-state">まだ共有リンクがありません。</p>
            </div>
          )}

          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleCreate()}
              disabled={isSubmitting || isLoading || snapshot.players.length === 0}
            >
              {isSubmitting ? '作成中...' : shareLink ? 'リンクを再発行' : 'リンクを作成'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              disabled={isSubmitting}
            >
              閉じる
            </button>
          </div>

          {snapshot.players.length === 0 && (
            <p className="input-hint">
              記録がないため共有リンクは作成できません。
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareRankingModal;
