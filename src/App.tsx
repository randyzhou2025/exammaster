import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { HomePage } from "@/pages/HomePage";
import { SequentialDashboardPage } from "@/pages/SequentialDashboardPage";
import { PracticePage } from "@/pages/PracticePage";
import { PracticeEntryPage } from "@/pages/PracticeEntryPage";
import { MockExamIntroPage } from "@/pages/MockExamIntroPage";
import { MockExamPage } from "@/pages/MockExamPage";
import { MockExamResultPage } from "@/pages/MockExamResultPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { WrongBookPage } from "@/pages/WrongBookPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/sequential" element={<SequentialDashboardPage />} />
          <Route path="/wrong-book" element={<WrongBookPage />} />
          <Route path="/practice/:kind" element={<PracticeEntryPage />} />
          <Route path="/practice/session" element={<PracticePage />} />
          <Route path="/mock" element={<MockExamIntroPage />} />
          <Route path="/mock/session" element={<MockExamPage />} />
          <Route path="/mock/result" element={<MockExamResultPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
