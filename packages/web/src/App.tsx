import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.js';
import { LandingPage } from './pages/LandingPage.js';

const ByFilePage = lazy(() =>
  import('./pages/ByFilePage.js').then((m) => ({ default: m.ByFilePage })),
);
const ClaudeCodePage = lazy(() =>
  import('./pages/ClaudeCodePage.js').then((m) => ({ default: m.ClaudeCodePage })),
);
const ComponentsPage = lazy(() =>
  import('./pages/ComponentsPage.js').then((m) => ({ default: m.ComponentsPage })),
);
const ConfigBuilderPage = lazy(() =>
  import('./pages/ConfigBuilderPage.js').then((m) => ({ default: m.ConfigBuilderPage })),
);
const DiffPage = lazy(() => import('./pages/DiffPage.js').then((m) => ({ default: m.DiffPage })));
const EditorPage = lazy(() =>
  import('./pages/EditorPage.js').then((m) => ({ default: m.EditorPage })),
);
const InitPage = lazy(() => import('./pages/InitPage.js').then((m) => ({ default: m.InitPage })));
const ModelDetailPage = lazy(() =>
  import('./pages/ModelDetailPage.js').then((m) => ({ default: m.ModelDetailPage })),
);
const ModelsPage = lazy(() =>
  import('./pages/ModelsPage.js').then((m) => ({ default: m.ModelsPage })),
);
const SarifPage = lazy(() =>
  import('./pages/SarifPage.js').then((m) => ({ default: m.SarifPage })),
);
const VisionPage = lazy(() =>
  import('./pages/VisionPage.js').then((m) => ({ default: m.VisionPage })),
);

export const App = () => (
  <BrowserRouter>
    <Suspense fallback={null}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="calculator" element={<LandingPage />} />
          <Route path="diff" element={<DiffPage />} />
          <Route path="by-file" element={<ByFilePage />} />
          <Route path="sarif" element={<SarifPage />} />
          <Route path="vision" element={<VisionPage />} />
          <Route path="config-builder" element={<ConfigBuilderPage />} />
          <Route path="init" element={<InitPage />} />
          <Route path="models" element={<ModelsPage />} />
          <Route path="models/:id" element={<ModelDetailPage />} />
          <Route path="editor" element={<EditorPage />} />
          <Route path="claude-code" element={<ClaudeCodePage />} />
          <Route path="components" element={<ComponentsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  </BrowserRouter>
);
