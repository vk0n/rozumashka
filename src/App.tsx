import { HashRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { SubjectsPage } from "./pages/SubjectsPage";
import { TestSetupPage } from "./pages/TestSetupPage";
import { QuizPage } from "./pages/QuizPage";
import { ResultsPage } from "./pages/ResultsPage";
import { ProgressPage } from "./pages/ProgressPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route path="/setup/:subjectId" element={<TestSetupPage />} />
          <Route path="/quiz/:subjectId" element={<QuizPage />} />
          <Route path="/results/:attemptId" element={<ResultsPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
