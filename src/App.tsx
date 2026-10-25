import { HashRouter, Route, Routes } from 'react-router-dom';
import { DataProvider, useData } from './state/DataContext';
import { AppShell } from './components/AppShell';
import { ImportPage } from './pages/ImportPage';
import { DashboardPage } from './pages/DashboardPage';
import { PostsPage } from './pages/PostsPage';
import { TrendsPage } from './pages/TrendsPage';
import { PublishingPage } from './pages/PublishingPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { ReportsPage } from './pages/ReportsPage';
import { DataPage } from './pages/DataPage';

function Routed() {
  const { dataset } = useData();
  return (
    <HashRouter>
      <Routes>
        <Route path="*" element={<AppShell />}>
          {dataset ? (
            <>
              <Route index element={<DashboardPage />} />
              <Route path="posts" element={<PostsPage />} />
              <Route path="trends" element={<TrendsPage />} />
              <Route path="publishing" element={<PublishingPage />} />
              <Route path="diagnostics" element={<DiagnosticsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="data" element={<DataPage />} />
              <Route path="*" element={<DashboardPage />} />
            </>
          ) : (
            <Route path="*" element={<ImportPage />} />
          )}
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default function App() {
  return (
    <DataProvider>
      <Routed />
    </DataProvider>
  );
}
