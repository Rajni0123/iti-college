import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import Home from './pages/Home';
import About from './pages/About';
import Trades from './pages/Trades';
import TradeDetail from './pages/TradeDetail';
import AdmissionProcess from './pages/AdmissionProcess';
import ApplyAdmission from './pages/ApplyAdmission';
import FeeStructure from './pages/FeeStructure';
import Faculty from './pages/Faculty';
import Infrastructure from './pages/Infrastructure';
import NoticeBoard from './pages/NoticeBoard';
import Results from './pages/Results';
import Contact from './pages/Contact';
import AdminLogin from './admin/AdminLogin';
import AdminDashboard from './admin/AdminDashboard';
import AdminNotices from './admin/AdminNotices';
import AdminResults from './admin/AdminResults';
import AdminGallery from './admin/AdminGallery';
import Admissions from './admin/Admissions';
import Staff from './admin/Staff';
import Students from './admin/Students';
import Sessions from './admin/Sessions';
import AdminSettings from './admin/AdminSettings';
import MenuManagement from './admin/MenuManagement';
import CategoryManagement from './admin/CategoryManagement';
import FlashNewsManagement from './admin/FlashNewsManagement';
import HeroManagement from './admin/HeroManagement';
import ProfileManagement from './admin/ProfileManagement';
import FeeManagement from './admin/FeeManagement';
import HeaderFooterManagement from './admin/HeaderFooterManagement';
import TradeManagement from './admin/TradeManagement';
import AboutManagement from './admin/AboutManagement';
import AdmissionProcessManagement from './admin/AdmissionProcessManagement';
import FacultyManagement from './admin/FacultyManagement';
import ProtectedRoute from './components/ProtectedRoute';
import SEOHead from './components/SEOHead';

// Library Management
import LibraryLayout from './admin/library/LibraryLayout';
import LibraryDashboard from './admin/library/LibraryDashboard';
import LibraryStudents from './admin/library/LibraryStudents';
import LibrarySeatMap from './admin/library/LibrarySeatMap';
import LibraryFees from './admin/library/LibraryFees';
import LibraryExpenses from './admin/library/LibraryExpenses';
import LibraryStaff from './admin/library/LibraryStaff';
import LibraryReports from './admin/library/LibraryReports';
import LibrarySettings from './admin/library/LibrarySettings';

function App() {
  return (
    <Router>
      <SEOHead />
      <Toaster position="top-right" />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="trades" element={<Trades />} />
          <Route path="trades/:tradeId" element={<TradeDetail />} />
          <Route path="admission-process" element={<AdmissionProcess />} />
          <Route path="apply-admission" element={<ApplyAdmission />} />
          <Route path="fee-structure" element={<FeeStructure />} />
          <Route path="faculty" element={<Faculty />} />
          <Route path="infrastructure" element={<Infrastructure />} />
          <Route path="notices" element={<NoticeBoard />} />
          <Route path="results" element={<Results />} />
          <Route path="contact" element={<Contact />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        
        {/* Protected Admin Routes with AdminLayout */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="notices" element={<AdminNotices />} />
          <Route path="results" element={<AdminResults />} />
          <Route path="gallery" element={<AdminGallery />} />
          <Route path="admissions" element={<Admissions />} />
          <Route path="staff" element={<Staff />} />
          <Route path="students" element={<Students />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="menus" element={<MenuManagement />} />
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="flash-news" element={<FlashNewsManagement />} />
          <Route path="hero" element={<HeroManagement />} />
          <Route path="profile" element={<ProfileManagement />} />
          <Route path="fees" element={<FeeManagement />} />
          <Route path="header-footer" element={<HeaderFooterManagement />} />
          <Route path="trades" element={<TradeManagement />} />
          <Route path="about" element={<AboutManagement />} />
          <Route path="admission-process" element={<AdmissionProcessManagement />} />
          <Route path="faculty" element={<FacultyManagement />} />

          {/* Library Management Routes */}
          <Route path="library" element={<LibraryLayout />}>
            <Route index element={<LibraryDashboard />} />
            <Route path="students" element={<LibraryStudents />} />
            <Route path="seats" element={<LibrarySeatMap />} />
            <Route path="fees" element={<LibraryFees />} />
            <Route path="expenses" element={<LibraryExpenses />} />
            <Route path="staff" element={<LibraryStaff />} />
            <Route path="reports" element={<LibraryReports />} />
            <Route path="settings" element={<LibrarySettings />} />
          </Route>
        </Route>

        {/* 404 Page */}
        <Route path="*" element={
          <Layout>
            <div className="min-h-screen flex items-center justify-center px-4">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-800 dark:text-white mb-4">404</h1>
                <h2 className="text-2xl font-semibold text-gray-600 dark:text-gray-300 mb-4">Page Not Found</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8">The page you're looking for doesn't exist.</p>
                <a 
                  href="/" 
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Homepage
                </a>
              </div>
            </div>
          </Layout>
        } />
      </Routes>
    </Router>
  );
}

export default App;
