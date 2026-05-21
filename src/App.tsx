import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { LegacyRedirect } from "@/components/LegacyRedirect";
import { RequireAdmin } from "@/components/RequireAdmin";
import { RequireExamAccess } from "@/components/RequireExamAccess";
import { RequireQuestionBank } from "@/components/RequireQuestionBank";
import { RequireLogin } from "@/components/RequireLogin";
import { routes } from "@/lib/routes";
import { TheoryHomePage } from "@/pages/TheoryHomePage";
import { SequentialDashboardPage } from "@/pages/SequentialDashboardPage";
import { PracticePage } from "@/pages/PracticePage";
import { PracticeEntryPage } from "@/pages/PracticeEntryPage";
import { MockExamIntroPage } from "@/pages/MockExamIntroPage";
import { MockExamPage } from "@/pages/MockExamPage";
import { MockExamResultPage } from "@/pages/MockExamResultPage";
import { OperateDashboardPage } from "@/pages/OperateDashboardPage";
import { OperateSessionPage } from "@/pages/OperateSessionPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { WrongBookPage } from "@/pages/WrongBookPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { PendingAuthPage } from "@/pages/PendingAuthPage";
import { AdminUsersPage } from "@/pages/AdminUsersPage";
import { AdminDailyActivityPage } from "@/pages/AdminDailyActivityPage";
import { AdminLoginLogsPage } from "@/pages/AdminLoginLogsPage";
import { sendActivityPing } from "@/lib/activityPing";
import { QuestionBankPage } from "@/pages/QuestionBankPage";
import { useAuthStore } from "@/stores/authStore";

const routerBasename =
  import.meta.env.BASE_URL === "/" ? undefined : import.meta.env.BASE_URL.replace(/\/$/, "");

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!token || !user) return;
    const ping = () => sendActivityPing(token);
    const onVis = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVis);
    const id = window.setInterval(ping, 5 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(id);
    };
  }, [token, user?.id]);

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
                <Route path={routes.levelHome} element={<Navigate to={routes.theoryHome} replace />} />
                <Route path={routes.theoryHome} element={<TheoryHomePage />} />
                <Route path={routes.theorySequential} element={<SequentialDashboardPage />} />
                <Route path={routes.theoryWrongBook} element={<WrongBookPage />} />
                <Route path="/AITrainer/level3/theory/practice/:kind" element={<PracticeEntryPage />} />
                <Route path={routes.theoryPracticeSession} element={<PracticePage />} />
                <Route path={routes.theoryMock} element={<MockExamIntroPage />} />
                <Route path={routes.theoryMockSession} element={<MockExamPage />} />
                <Route path={routes.theoryMockResult} element={<MockExamResultPage />} />
                <Route path={routes.operateHome} element={<OperateDashboardPage />} />
                <Route path={routes.operateSession} element={<OperateSessionPage />} />

                {/* 旧扁平路由重定向 */}
                <Route path="/" element={<Navigate to={routes.theoryHome} replace />} />
                <Route path="/sequential" element={<Navigate to={routes.theorySequential} replace />} />
                <Route path="/wrong-book" element={<Navigate to={routes.theoryWrongBook} replace />} />
                <Route path="/mock" element={<Navigate to={routes.theoryMock} replace />} />
                <Route path="/mock/session" element={<Navigate to={routes.theoryMockSession} replace />} />
                <Route path="/mock/result" element={<Navigate to={routes.theoryMockResult} replace />} />
                <Route path="/practice/session" element={<Navigate to={routes.theoryPracticeSession} replace />} />
                <Route path="/practice/:kind" element={<LegacyRedirect />} />
              </Route>
            </Route>

            <Route element={<RequireAdmin />}>
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/login-logs" element={<AdminLoginLogsPage />} />
              <Route path={routes.adminDailyActivity} element={<AdminDailyActivityPage />} />
            </Route>

            <Route path="*" element={<Navigate to={routes.theoryHome} replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
