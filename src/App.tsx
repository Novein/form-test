// 项目入口文件，后续可完善
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import NewRecordPage from './pages/NewRecordPage';
import RecordListPage from './pages/RecordListPage';
import ExportPreviewPage from './pages/ExportPreviewPage';
import AboutPage from './pages/AboutPage';
import InspectionFormPage from './pages/InspectionFormPage';
import RecordDetailPage from './pages/RecordDetailPage';

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/new" element={<NewRecordPage />} />
      <Route path="/records" element={<RecordListPage />} />
      <Route path="/records/:recordId" element={<RecordDetailPage />} />
      <Route path="/export" element={<ExportPreviewPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/form" element={<InspectionFormPage />} />
    </Routes>
  </BrowserRouter>
);

export default App;
