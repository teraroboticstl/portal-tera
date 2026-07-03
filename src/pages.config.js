/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import About from './pages/About';
import AdminPanel from './pages/AdminPanel';
import AreaInterna from './pages/AreaInterna';
import CADs from './pages/CADs';
import Competitions from './pages/Competitions';
import CompetitionsFLL from './pages/CompetitionsFLL';
import CompetitionsFRC from './pages/CompetitionsFRC';
import CompetitionsFTC from './pages/CompetitionsFTC';
import Contact from './pages/Contact';
import CurrentRobot from './pages/CurrentRobot';
import Engineering from './pages/Engineering';
import Home from './pages/Home';
import InternalFLL from './pages/InternalFLL';
import InternalFRC from './pages/InternalFRC';
import InternalFRCMatchHistory from './pages/InternalFRCMatchHistory';
import InternalFRCMatches from './pages/InternalFRCMatches';
import InternalFRCPDI from './pages/InternalFRCPDI';
import InternalFRCPicklist from './pages/InternalFRCPicklist';
import InternalFRCScout from './pages/InternalFRCScout';
import InternalFRCTeams from './pages/InternalFRCTeams';
import InternalFRCTeamsRegister from './pages/InternalFRCTeamsRegister';
import InternalFTC from './pages/InternalFTC';
import InternalFTCMatches from './pages/InternalFTCMatches';
import InternalFTCPDI from './pages/InternalFTCPDI';
import InternalFTCQualifiersScout from './pages/InternalFTCQualifiersScout';
import InternalFTCScorer from './pages/InternalFTCScorer';
import InternalFTCScout from './pages/InternalFTCScout';
import InternalFTCTeams from './pages/InternalFTCTeams';
import InternalLogs from './pages/InternalLogs';
import InternalMeetings from './pages/InternalMeetings';
import InternalMemorial from './pages/InternalMemorial';
import InternalPrototypes from './pages/InternalPrototypes';
import Memorial from './pages/Memorial';
import Projects from './pages/Projects';
import SeasonConfig from './pages/SeasonConfig';
import SetupAdmin from './pages/SetupAdmin';
import Sponsors from './pages/Sponsors';
import Team from './pages/Team';
import TeraShop from './pages/TeraShop';
import EventGalleryPublic from './pages/EventGalleryPublic';
import InternalEventGallery from './pages/InternalEventGallery';
import SafetyCheck from './pages/SafetyCheck';
import InternalAuditLog from './pages/InternalAuditLog';
import InternalRiskAnalysis from './pages/InternalRiskAnalysis';
import InternalProjectsDashboard from './pages/InternalProjectsDashboard';
import Memoria from './pages/Memoria.jsx';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "AdminPanel": AdminPanel,
    "AreaInterna": AreaInterna,
    "CADs": CADs,
    "Competitions": Competitions,
    "CompetitionsFLL": CompetitionsFLL,
    "CompetitionsFRC": CompetitionsFRC,
    "CompetitionsFTC": CompetitionsFTC,
    "Contact": Contact,
    "CurrentRobot": CurrentRobot,
    "Engineering": Engineering,
    "Home": Home,
    "InternalFLL": InternalFLL,
    "InternalFRC": InternalFRC,
    "InternalFRCMatchHistory": InternalFRCMatchHistory,
    "InternalFRCMatches": InternalFRCMatches,
    "InternalFRCPDI": InternalFRCPDI,
    "InternalFRCPicklist": InternalFRCPicklist,
    "InternalFRCScout": InternalFRCScout,
    "InternalFRCTeams": InternalFRCTeams,
    "InternalFRCTeamsRegister": InternalFRCTeamsRegister,
    "InternalFTC": InternalFTC,
    "InternalFTCMatches": InternalFTCMatches,
    "InternalFTCPDI": InternalFTCPDI,
    "InternalFTCQualifiersScout": InternalFTCQualifiersScout,
    "InternalFTCScorer": InternalFTCScorer,
    "InternalFTCScout": InternalFTCScout,
    "InternalFTCTeams": InternalFTCTeams,
    "InternalLogs": InternalLogs,
    "InternalMeetings": InternalMeetings,
    "InternalMemorial": InternalMemorial,
    "InternalPrototypes": InternalPrototypes,
    "Memorial": Memorial,
    "Projects": Projects,
    "SeasonConfig": SeasonConfig,
    "SetupAdmin": SetupAdmin,
    "Sponsors": Sponsors,
    "Team": Team,
    "TeraShop": TeraShop,
    "EventGalleryPublic": EventGalleryPublic,
    "InternalEventGallery": InternalEventGallery,
    "SafetyCheck": SafetyCheck,
    "InternalAuditLog": InternalAuditLog,
    "InternalRiskAnalysis": InternalRiskAnalysis,
    "InternalProjectsDashboard": InternalProjectsDashboard,
    "Memoria": Memoria,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};