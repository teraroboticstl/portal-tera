import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import SafetyCheck from './pages/SafetyCheck';
import EventGalleryPublic from './pages/EventGalleryPublic';
import InternalEventGallery from './pages/InternalEventGallery';
import TIR2026 from './pages/TIR2026';
import TIRAdmin from './pages/TIRAdmin';
import FLLScorer from './pages/FLLScorer';
import InternalCADAssistant from './pages/InternalCADAssistant';
import InternalCADConfig from './pages/InternalCADConfig';
import InternalBoardDiary from './pages/InternalBoardDiary';
import InternalSeasonArchive from './pages/InternalSeasonArchive';
import ProjectDetail from './pages/ProjectDetail';
import InternalFLLDashboard from './pages/InternalFLLDashboard';
import InternalFLLMeetings from './pages/InternalFLLMeetings';
import InternalFLLMissions from './pages/InternalFLLMissions';
import InternalFLLInnovation from './pages/InternalFLLInnovation';
import InternalFLLCoreValues from './pages/InternalFLLCoreValues';
import InternalFLLTeam from './pages/InternalFLLTeam';
import InternalFLLTasks from './pages/InternalFLLTasks';
import InternalFLLJudgePrep from './pages/InternalFLLJudgePrep';
import InternalFLLAttachments from './pages/InternalFLLAttachments';
import KnowledgeBase from './pages/KnowledgeBase.jsx';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/SafetyCheck" element={<LayoutWrapper currentPageName="SafetyCheck"><SafetyCheck /></LayoutWrapper>} />
      <Route path="/EventGalleryPublic" element={<LayoutWrapper currentPageName="EventGalleryPublic"><EventGalleryPublic /></LayoutWrapper>} />
      <Route path="/InternalEventGallery" element={<LayoutWrapper currentPageName="InternalEventGallery"><InternalEventGallery /></LayoutWrapper>} />
      <Route path="/TIR2026" element={<LayoutWrapper currentPageName="TIR2026"><TIR2026 /></LayoutWrapper>} />
      <Route path="/TIRAdmin" element={<LayoutWrapper currentPageName="TIRAdmin"><TIRAdmin /></LayoutWrapper>} />
      <Route path="/FLLScorer" element={<FLLScorer />} />
      <Route path="/InternalCADAssistant" element={<LayoutWrapper currentPageName="InternalCADAssistant"><InternalCADAssistant /></LayoutWrapper>} />
      <Route path="/InternalCADConfig" element={<LayoutWrapper currentPageName="InternalCADConfig"><InternalCADConfig /></LayoutWrapper>} />
      <Route path="/InternalBoardDiary" element={<LayoutWrapper currentPageName="InternalBoardDiary"><InternalBoardDiary /></LayoutWrapper>} />
      <Route path="/InternalSeasonArchive" element={<LayoutWrapper currentPageName="InternalSeasonArchive"><InternalSeasonArchive /></LayoutWrapper>} />
      <Route path="/ProjectDetail" element={<LayoutWrapper currentPageName="ProjectDetail"><ProjectDetail /></LayoutWrapper>} />
      <Route path="/InternalFLLDashboard" element={<LayoutWrapper currentPageName="InternalFLLDashboard"><InternalFLLDashboard /></LayoutWrapper>} />
      <Route path="/InternalFLLMeetings" element={<LayoutWrapper currentPageName="InternalFLLMeetings"><InternalFLLMeetings /></LayoutWrapper>} />
      <Route path="/InternalFLLMissions" element={<LayoutWrapper currentPageName="InternalFLLMissions"><InternalFLLMissions /></LayoutWrapper>} />
      <Route path="/InternalFLLInnovation" element={<LayoutWrapper currentPageName="InternalFLLInnovation"><InternalFLLInnovation /></LayoutWrapper>} />
      <Route path="/InternalFLLCoreValues" element={<LayoutWrapper currentPageName="InternalFLLCoreValues"><InternalFLLCoreValues /></LayoutWrapper>} />
      <Route path="/InternalFLLTeam" element={<LayoutWrapper currentPageName="InternalFLLTeam"><InternalFLLTeam /></LayoutWrapper>} />
      <Route path="/InternalFLLTasks" element={<LayoutWrapper currentPageName="InternalFLLTasks"><InternalFLLTasks /></LayoutWrapper>} />
      <Route path="/InternalFLLJudgePrep" element={<LayoutWrapper currentPageName="InternalFLLJudgePrep"><InternalFLLJudgePrep /></LayoutWrapper>} />
      <Route path="/InternalFLLAttachments" element={<LayoutWrapper currentPageName="InternalFLLAttachments"><InternalFLLAttachments /></LayoutWrapper>} />
      <Route path="/KnowledgeBase" element={<LayoutWrapper currentPageName="KnowledgeBase"><KnowledgeBase /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App