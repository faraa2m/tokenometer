import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.js';
import { ByFilePage } from './pages/ByFilePage.js';
import { ClaudeCodePage } from './pages/ClaudeCodePage.js';
import { ConfigBuilderPage } from './pages/ConfigBuilderPage.js';
import { DiffPage } from './pages/DiffPage.js';
import { EditorPage } from './pages/EditorPage.js';
import { InitPage } from './pages/InitPage.js';
import { LandingPage } from './pages/LandingPage.js';
import { ModelDetailPage } from './pages/ModelDetailPage.js';
import { ModelsPage } from './pages/ModelsPage.js';
import { SarifPage } from './pages/SarifPage.js';
import { VisionPage } from './pages/VisionPage.js';

export const App = () => (
  <BrowserRouter>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
