import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SharedPlayerDetail from './SharedPlayerDetail';

jest.mock('../firebase', () => ({
  auth: {},
  db: {},
}));

const mockOnAuthStateChanged = jest.fn();
const mockOnSnapshot = jest.fn();
const mockDoc = jest.fn();

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
}));

jest.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="chart-placeholder" />,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
    callback(null);
    return jest.fn();
  });
  mockDoc.mockImplementation((_db, ...segments: unknown[]) => ({
    path: segments.join('/'),
  }));
});

test('renders shared player chart when snapshot exists', async () => {
  mockOnSnapshot.mockImplementation((ref, onNext) => {
    const target = (ref as any).path as string;
    if (target === 'shares/share-123') {
      onNext({
        exists: () => true,
        data: () => ({ periodFilter: 'all', expiresAt: null }),
      });
      return jest.fn();
    }
    if (target === 'shares/share-123/charts/Sato') {
      onNext({
        exists: () => true,
        data: () => ({
          truncated: false,
          records: [
            {
              date: { toDate: () => new Date('2024-05-01') },
              speed: 140,
            },
            {
              date: { toDate: () => new Date('2024-05-10') },
              speed: 150,
            },
          ],
        }),
      });
      return jest.fn();
    }
    return jest.fn();
  });

  render(
    <MemoryRouter initialEntries={['/share/share-123/player/Sato']}>
      <Routes>
        <Route
          path="/share/:shareId/player/:name"
          element={<SharedPlayerDetail />}
        />
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByRole('heading', { name: 'Sato の推移' })).toBeInTheDocument();
  expect(screen.getByTestId('chart-placeholder')).toBeInTheDocument();
});

