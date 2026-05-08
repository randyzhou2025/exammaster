import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { RequireAdmin } from "@/components/RequireAdmin";
import { RequireExamAccess } from "@/components/RequireExamAccess";
import { RequireQuestionBank } from "@/components/RequireQuestionBank";
import { RequireLogin } from "@/components/RequireLogin";
import { HomePage } from "@/pages/HomePage";
import { SequentialDashboardPage } from "@/pages/SequentialDashboardPage";
import { PracticePage } from "@/pages/PracticePage";
import { PracticeEntryPage } from "@/pages/PracticeEntryPage";
import { MockExamIntroPage } from "@/pages/MockExamIntroPage";
import { MockExamPage } from "@/pages/MockExamPage";
import { MockExamResultPage } from "@/pages/MockExamResultPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { WrongBookPage } from "@/pages/WrongBookPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { PendingAuthPage } from "@/pages/PendingAuthPage";
import { AdminUsersPage } from "@/pages/AdminUsersPage";
import { AdminLoginLogsPage } from "@/pages/AdminLoginLogsPage";
import { QuestionBankPage } from "@/pages/QuestionBankPage";
import { useAuthStore } from "@/stores/authStore";

const routerBasename =
  import.meta.env.BASE_URL === "/" ? undefined : import.meta.env.BASE_URL.replace(/\/$/, "");

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <BrowserRouter basename={routerBasename}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<RequireLogin />}>
          <Route element={<AppShell />}>
            <Route path="/auth/pending" element={<PendingAuthPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            <Route element={<RequireExamAccess />}>
              <Route path="/banks" element={<QuestionBankPage />} />
              <Route element={<RequireQuestionBank />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/sequential" element={<SequentialDashboardPage />} />
                <Route path="/wrong-book" element={<WrongBookPage />} />
                <Route path="/practice/:kind" element={<PracticeEntryPage />} />
                <Route path="/practice/session" element={<PracticePage />} />
                <Route path="/mock" element={<MockExamIntroPage />} />
                <Route path="/mock/session" element={<MockExamPage />} />
                <Route path="/mock/result" element={<MockExamResultPage />} />
              </Route>
            </Route>

            <Route element={<RequireAdmin />}>
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/login-logs" element={<AdminLoginLogsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
