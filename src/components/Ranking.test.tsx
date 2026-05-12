import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Ranking from './Ranking';

jest.mock('../firebase', () => ({
  db: {},
  auth: {},
}));

jest.mock('./ShareRankingModal', () => () => null);

const mockOnAuthStateChanged = jest.fn();
const mockOnSnapshot = jest.fn();
const mockCollection = jest.fn();
const mockDoc = jest.fn();
const mockDeleteField = jest.fn();
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockQuery = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchSet = jest.fn();
const mockBatchCommit = jest.fn();
const mockWriteBatch = jest.fn();

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  signOut: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  deleteField: (...args: unknown[]) => mockDeleteField(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  setDoc: jest.fn(),
  writeBatch: (...args: unknown[]) => mockWriteBatch(...args),
}));

let snapshotListener: ((snapshot: { forEach: (cb: (doc: any) => void) => void }) => void) | null =
  null;

const renderRanking = () =>
  render(
    <MemoryRouter initialEntries={['/ranking']}>
      <Routes>
        <Route path="/ranking" element={<Ranking />} />
      </Routes>
    </MemoryRouter>
  );

const createSnapshot = (
  players: {
    id: string;
    name: string;
    speed?: number;
    swingSpeed?: number;
    updatedAt?: Date;
    swingUpdatedAt?: Date;
  }[]
) => ({
  forEach: (callback: (doc: any) => void) =>
    players.forEach((player) =>
      callback({
        id: player.id,
        data: () => ({
          name: player.name,
          speed: player.speed,
          swingSpeed: player.swingSpeed,
          updatedAt: player.updatedAt
            ? { toDate: () => player.updatedAt }
            : undefined,
          swingUpdatedAt: player.swingUpdatedAt
            ? { toDate: () => player.swingUpdatedAt }
            : undefined,
        }),
      })
    ),
});

beforeEach(() => {
  jest.clearAllMocks();
  snapshotListener = null;
  mockCollection.mockImplementation((_db, path) => ({ path }));
  mockDoc.mockImplementation((_db, path, id) => ({
    path: id ? `${path}/${id}` : path,
  }));
  mockDeleteField.mockReturnValue('DELETE_FIELD');
  mockGetDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      name: 'Sato',
      speed: 150,
      updatedAt: { toDate: () => new Date('2024-06-01') },
    }),
  });
  mockQuery.mockImplementation((collectionRef) => collectionRef);
  mockGetDocs.mockResolvedValue(createQuerySnapshot([]));
  mockWriteBatch.mockReturnValue({
    delete: mockBatchDelete,
    set: mockBatchSet,
    commit: mockBatchCommit,
  });
  mockBatchCommit.mockResolvedValue(undefined);
  mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
    callback({ uid: 'user-1' });
    return jest.fn();
  });
  mockOnSnapshot.mockImplementation((_query, onSuccess) => {
    snapshotListener = onSuccess;
    return jest.fn();
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

const createRecordDoc = (id: string, speed: number, date: Date) => ({
  id,
  ref: { path: `record/${id}` },
  data: () => ({
    speed,
    date: { toDate: () => date },
  }),
});

const createQuerySnapshot = (docs: ReturnType<typeof createRecordDoc>[]) => ({
  docs,
  forEach: (callback: (doc: ReturnType<typeof createRecordDoc>) => void) =>
    docs.forEach(callback),
});

test('renders ranking tab list centered within container', async () => {
  renderRanking();

  await act(async () => {
    snapshotListener?.(
      createSnapshot([
        { id: 'Sato', name: 'Sato', speed: 150, updatedAt: new Date('2024-06-01') },
      ])
    );
  });

  const tabList = screen.getByRole('tablist', { name: 'ランキング種別' });
  expect(tabList).toHaveClass('ranking-tabs');
  expect(tabList).toHaveClass('container');

  const tabs = within(tabList).getAllByRole('tab');
  expect(tabs).toHaveLength(2);
  expect(tabs[0]).toHaveTextContent('球速');
  expect(tabs[1]).toHaveTextContent('スイングスピード');
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
});

test('switches between pitch and swing rankings with matching labels', async () => {
  renderRanking();

  await act(async () => {
    snapshotListener?.(
      createSnapshot([
        {
          id: 'Sato',
          name: 'Sato',
          speed: 150,
          swingSpeed: 132,
          updatedAt: new Date('2024-06-01'),
          swingUpdatedAt: new Date('2024-06-02'),
        },
        {
          id: 'Ito',
          name: 'Ito',
          speed: 142,
          swingSpeed: 138,
          updatedAt: new Date('2024-06-03'),
          swingUpdatedAt: new Date('2024-06-04'),
        },
      ])
    );
  });

  expect(screen.getByRole('tab', { name: '球速' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  expect(screen.getAllByText('最高球速')[0]).toBeInTheDocument();
  expect(screen.getAllByText('Sato')[0]).toBeInTheDocument();

  await userEvent.click(screen.getByRole('tab', { name: 'スイングスピード' }));
  await act(async () => {
    snapshotListener?.(
      createSnapshot([
        {
          id: 'Sato',
          name: 'Sato',
          speed: 150,
          swingSpeed: 132,
          updatedAt: new Date('2024-06-01'),
          swingUpdatedAt: new Date('2024-06-02'),
        },
        {
          id: 'Ito',
          name: 'Ito',
          speed: 142,
          swingSpeed: 138,
          updatedAt: new Date('2024-06-03'),
          swingUpdatedAt: new Date('2024-06-04'),
        },
      ])
    );
  });

  expect(screen.getByRole('tab', { name: 'スイングスピード' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  expect(screen.getAllByText('最高スイングスピード')[0]).toBeInTheDocument();
  expect(screen.getAllByText('Ito')[0]).toBeInTheDocument();

  const firstRankingItem = screen.getAllByText('Ito')[0].closest('.ranking-item');
  expect(firstRankingItem).not.toBeNull();
  expect(within(firstRankingItem as HTMLElement).getByText('138')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '記録を追加' }));
  expect(screen.getByLabelText('スイングスピード (km/h)')).toBeInTheDocument();
});

test('keeps player document and restores swing summary when deleting pitch records with swing subcollection data', async () => {
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  mockGetDocs.mockImplementation((queryRef?: { path?: string }) => {
    if (queryRef?.path?.endsWith('/records')) {
      return Promise.resolve(
        createQuerySnapshot([
          createRecordDoc('2024-06-01', 150, new Date('2024-06-01')),
        ])
      );
    }
    if (queryRef?.path?.endsWith('/swingRecords')) {
      return Promise.resolve(
        createQuerySnapshot([
          createRecordDoc('2024-06-02', 132, new Date('2024-06-02')),
          createRecordDoc('2024-06-03', 128, new Date('2024-06-03')),
        ])
      );
    }
    return Promise.resolve(createQuerySnapshot([]));
  });

  renderRanking();

  await act(async () => {
    snapshotListener?.(
      createSnapshot([
        {
          id: 'Sato',
          name: 'Sato',
          speed: 150,
          updatedAt: new Date('2024-06-01'),
        },
      ])
    );
  });

  await userEvent.click(screen.getByRole('button', { name: 'Satoを削除' }));

  await waitFor(() => expect(mockBatchCommit).toHaveBeenCalled());
  expect(mockBatchDelete).not.toHaveBeenCalledWith({
    path: 'users/user-1/players/Sato',
  });
  expect(mockBatchSet).toHaveBeenCalledWith(
    { path: 'users/user-1/players/Sato' },
    {
      name: 'Sato',
      speed: 'DELETE_FIELD',
      updatedAt: 'DELETE_FIELD',
      swingSpeed: 132,
      swingUpdatedAt: new Date('2024-06-03'),
    },
    { merge: true }
  );
});
