import { render, screen } from '@testing-library/react';
import ShareRankingModal from './ShareRankingModal';

jest.mock('../firebase', () => ({
  db: {},
}));

const mockGetDocs = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  deleteDoc: jest.fn(),
  doc: jest.fn(() => ({ id: 'share-generated' })),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: jest.fn(() => ({})),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  where: jest.fn(() => ({})),
  writeBatch: jest.fn(() => ({
    delete: jest.fn(),
    set: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
  })),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test('renders empty state and disables create when snapshot has no players', async () => {
  mockGetDocs.mockResolvedValue({ docs: [] });
  render(
    <ShareRankingModal
      isOpen={true}
      onClose={jest.fn()}
      ownerUid="user-1"
      snapshot={{
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
});

