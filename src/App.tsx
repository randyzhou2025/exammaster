import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ActivityPingWatcher } from "@/components/ActivityPingWatcher";
import { AppShell } from "@/components/AppShell";
import { DefaultTheoryRedirect } from "@/components/DefaultTheoryRedirect";
import { LegacyFlatRedirect } from "@/components/LegacyFlatRedirect";
import { LegacyRedirect } from "@/components/LegacyRedirect";
import { LevelHomeRedirect } from "@/components/LevelHomeRedirect";
import { RequireAdmin } from "@/components/RequireAdmin";
import { RequireExamAccess } from "@/components/RequireExamAccess";
import { RequireQuestionBank } from "@/components/RequireQuestionBank";
import { RequireLogin } from "@/components/RequireLogin";
import { LEVEL_ROUTE_PREFIX, routes } from "@/lib/routes";
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
import { AdminHomepageActivityPage } from "@/pages/AdminHomepageActivityPage";
import { AdminLoginLogsPage } from "@/pages/AdminLoginLogsPage";
import { QuestionBankPage } from "@/pages/QuestionBankPage";
import { useAuthStore } from "@/stores/authStore";

const routerBasename =
  import.meta.env.BASE_URL === "/" ? undefined : import.meta.env.BASE_URL.replace(/\/$/, "");

const levelPath = (suffix: string) => `${LEVEL_ROUTE_PREFIX}${suffix}`;

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <BrowserRouter basename={routerBasename}>
      <ActivityPingWatcher />
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
                <Route path={levelPath("")} element={<LevelHomeRedirect />} />
                <Route path={levelPath("/theory")} element={<TheoryHomePage />} />
                <Route path={levelPath("/theory/sequential")} element={<SequentialDashboardPage />} />
                <Route path={levelPath("/theory/wrong-book")} element={<WrongBookPage />} />
                <Route path={levelPath("/theory/practice/:kind")} element={<PracticeEntryPage />} />
                <Route path={levelPath("/theory/practice/session")} element={<PracticePage />} />
                <Route path={levelPath("/theory/mock")} element={<MockExamIntroPage />} />
                <Route path={levelPath("/theory/mock/session")} element={<MockExamPage />} />
                <Route path={levelPath("/theory/mock/result")} element={<MockExamResultPage />} />
                <Route path={levelPath("/operate")} element={<OperateDashboardPage />} />
                <Route path={levelPath("/operate/session")} element={<OperateSessionPage />} />

                {/* 旧扁平路由重定向 */}
                <Route path="/" element={<DefaultTheoryRedirect />} />
                <Route path="/sequential" element={<LegacyFlatRedirect target="theorySequential" />} />
                <Route path="/wrong-book" element={<LegacyFlatRedirect target="theoryWrongBook" />} />
                <Route path="/mock" element={<LegacyFlatRedirect target="theoryMock" />} />
                <Route path="/mock/session" element={<LegacyFlatRedirect target="theoryMockSession" />} />
                <Route path="/mock/result" element={<LegacyFlatRedirect target="theoryMockResult" />} />
                <Route path="/practice/session" element={<LegacyFlatRedirect target="theoryPracticeSession" />} />
                <Route path="/practice/:kind" element={<LegacyRedirect />} />
              </Route>
            </Route>

            <Route element={<RequireAdmin />}>
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/login-logs" element={<AdminLoginLogsPage />} />
              <Route path={routes.adminDailyActivity} element={<AdminDailyActivityPage />} />
              <Route path={routes.adminHomepageActivity} element={<AdminHomepageActivityPage />} />
            </Route>

            <Route path={routes.examTrainerRoot} element={<DefaultTheoryRedirect />} />
            <Route path="*" element={<DefaultTheoryRedirect />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
