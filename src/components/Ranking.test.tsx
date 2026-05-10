import { act, render, screen, within } from '@testing-library/react';
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

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  signOut: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  deleteField: jest.fn(() => 'DELETE_FIELD'),
  doc: jest.fn(() => ({})),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  query: jest.fn(() => ({})),
  setDoc: jest.fn(),
  writeBatch: jest.fn(() => ({
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
  })),
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
  mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
    callback({ uid: 'user-1' });
    return jest.fn();
  });
  mockOnSnapshot.mockImplementation((_query, onSuccess) => {
    snapshotListener = onSuccess;
    return jest.fn();
  });
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
