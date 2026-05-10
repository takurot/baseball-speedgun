import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShareRankingModal from './ShareRankingModal';

jest.mock('../firebase', () => ({
  db: {},
}));

const mockGetDocs = jest.fn();
const mockDoc = jest.fn();
const mockWriteBatch = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchSet = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  deleteDoc: jest.fn(),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  limit: jest.fn(() => ({})),
  orderBy: jest.fn(() => ({})),
  query: jest.fn(() => ({})),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  where: jest.fn(() => ({})),
  writeBatch: (...args: unknown[]) => mockWriteBatch(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockDoc.mockReturnValue({ id: 'share-generated' });
  mockWriteBatch.mockReturnValue({
    delete: mockBatchDelete,
    set: mockBatchSet,
    commit: mockBatchCommit,
  });
  mockBatchCommit.mockResolvedValue(undefined);
});

test('renders empty state and disables create when snapshot has no players', async () => {
  mockGetDocs.mockResolvedValue({ docs: [] });
  render(
    <ShareRankingModal
      isOpen={true}
      onClose={jest.fn()}
      ownerUid="user-1"
      snapshot={{
        measurementType: 'pitch',
        periodFilter: 'all',
        players: [],
        stats: { topSpeed: null, averageSpeed: null, playerCount: 0 },
      }}
      onToast={jest.fn()}
    />
  );

  expect(
    await screen.findByText('まだ共有リンクがありません。')
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'リンクを作成' })
  ).toBeDisabled();
  expect(
    screen.getByText('記録がないため共有リンクは作成できません。')
  ).toBeInTheDocument();
});

test('shows existing share link when user already created one', async () => {
  mockGetDocs.mockResolvedValue({
    docs: [
      {
        id: 'share-123',
        data: () => ({
          measurementType: 'pitch',
          createdAt: { toDate: () => new Date('2024-06-01') },
          expiresAt: null,
        }),
      },
    ],
  });

  render(
    <ShareRankingModal
      isOpen={true}
      onClose={jest.fn()}
      ownerUid="user-1"
      snapshot={{
        measurementType: 'pitch',
        periodFilter: 'all',
        players: [
          { rank: 1, name: 'Sato', speed: 150, updatedAt: new Date('2024-06-01') },
        ],
        stats: { topSpeed: 150, averageSpeed: 150, playerCount: 1 },
      }}
      onToast={jest.fn()}
    />
  );

  expect(await screen.findByLabelText('共有リンク')).toHaveValue(
    'http://localhost/share/share-123'
  );
  expect(screen.getByRole('button', { name: 'コピー' })).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'リンクを再発行' })
  ).toBeInTheDocument();
  expect(screen.getByText(/共有中: 球速/)).toBeInTheDocument();
});

test('does not show existing share link for a different measurement', async () => {
  mockGetDocs.mockResolvedValue({
    docs: [
      {
        id: 'pitch-share',
        data: () => ({
          measurementType: 'pitch',
          createdAt: { toDate: () => new Date('2024-06-01') },
          expiresAt: null,
        }),
      },
    ],
  });

  render(
    <ShareRankingModal
      isOpen={true}
      onClose={jest.fn()}
      ownerUid="user-1"
      snapshot={{
        measurementType: 'swing',
        periodFilter: 'all',
        players: [
          { rank: 1, name: 'Sato', speed: 130, updatedAt: new Date('2024-06-01') },
        ],
        stats: { topSpeed: 130, averageSpeed: 130, playerCount: 1 },
      }}
      onToast={jest.fn()}
    />
  );

  expect(
    await screen.findByText('まだ共有リンクがありません。')
  ).toBeInTheDocument();
  expect(screen.queryByLabelText('共有リンク')).not.toBeInTheDocument();
  expect(
    screen.getByText('共有対象: スイングスピード / 全期間 のランキング')
  ).toBeInTheDocument();
});

test('reissues only the existing share link for the current measurement', async () => {
  const pitchRef = { id: 'pitch-ref' };
  const swingRef = { id: 'swing-ref' };
  mockGetDocs.mockResolvedValue({
    docs: [
      {
        id: 'pitch-share',
        ref: pitchRef,
        data: () => ({
          measurementType: 'pitch',
          createdAt: { toDate: () => new Date('2024-06-02') },
          expiresAt: null,
        }),
      },
      {
        id: 'swing-share',
        ref: swingRef,
        data: () => ({
          measurementType: 'swing',
          createdAt: { toDate: () => new Date('2024-06-01') },
          expiresAt: null,
        }),
      },
    ],
  });

  render(
    <ShareRankingModal
      isOpen={true}
      onClose={jest.fn()}
      ownerUid="user-1"
      snapshot={{
        measurementType: 'swing',
        periodFilter: 'all',
        players: [
          { rank: 1, name: 'Sato', speed: 130, updatedAt: new Date('2024-06-01') },
        ],
        stats: { topSpeed: 130, averageSpeed: 130, playerCount: 1 },
      }}
      onToast={jest.fn()}
    />
  );

  expect(await screen.findByLabelText('共有リンク')).toHaveValue(
    'http://localhost/share/swing-share'
  );

  await userEvent.click(screen.getByRole('button', { name: 'リンクを再発行' }));

  await waitFor(() => expect(mockBatchDelete).toHaveBeenCalledWith(swingRef));
  expect(mockBatchDelete).not.toHaveBeenCalledWith(pitchRef);
});
