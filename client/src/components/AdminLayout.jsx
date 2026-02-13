import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Megaphone,
  FileText,
  UserCheck,
  Image as ImageIcon,
  Users,
  School,
  LogOut,
  Settings,
  Menu,
  FolderTree,
  Image,
  User,
  DollarSign,
  PanelTop,
  Wrench,
  Info,
  GraduationCap,
  Calendar,
  Library
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getProfile } from '../services/api';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState({ name: '', email: '', role: 'Admin' });

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await getProfile();
      const user = response.data?.data || response.data;
      if (user) {
        setAdminUser({
          name: user.name || user.email?.split('@')[0] || 'Admin',
          email: user.email || '',
          role: user.role || 'Admin'
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  return (
    <div className="flex min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      {/* Sidebar */}
      <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
        <div className="p-6 flex flex-col gap-8 h-full">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="bg-[#195de6] size-10 rounded-lg flex items-center justify-center text-white">
              <School className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-slate-900 dark:text-white text-base font-bold leading-tight">Maner Pvt ITI</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Admin Portal</p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-col gap-1.5 grow">
            <Link
              to="/admin"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive('/admin')
                  ? 'bg-[#195de6]/10 text-[#195de6]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span className="text-sm font-medium">Dashboard</span>
            </Link>

            <Link
              to="/admin/notices"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive('/admin/notices')
                  ? 'bg-[#195de6]/10 text-[#195de6]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Megaphone className="h-5 w-5" />
              <span className="text-sm font-medium">Manage Notices</span>
            </Link>

            <Link
              to="/admin/results"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive('/admin/results')
                  ? 'bg-[#195de6]/10 text-[#195de6]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">Manage Results</span>
            </Link>

            <Link
              to="/admin/admissions"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive('/admin/admissions')
                  ? 'bg-[#195de6]/10 text-[#195de6] font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <UserCheck className="h-5 w-5" />
              <span className="text-sm font-medium">Admission Apps</span>
            </Link>

            <Link
              to="/admin/gallery"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive('/admin/gallery')
                  ? 'bg-[#195de6]/10 text-[#195de6]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ImageIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Gallery</span>
            </Link>

            <Link
              to="/admin/staff"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive('/admin/staff')
                  ? 'bg-[#195de6]/10 text-[#195de6]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="h-5 w-5" />
              <span className="text-sm font-medium">Staff</span>
            </Link>
            <Link
              to="/admin/students"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive('/admin/students')
                  ? 'bg-[#195de6]/10 text-[#195de6]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <GraduationCap className="h-5 w-5" />
              <span className="text-sm font-medium">Students</span>
            </Link>

            <Link
              to="/admin/sessions"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive('/admin/sessions')
                  ? 'bg-[#195de6]/10 text-[#195de6]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Calendar className="h-5 w-5" />
              <span className="text-sm font-medium">Sessions</span>
            </Link>

            <Link
              to="/admin/settings"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive('/admin/settings')
                  ? 'bg-[#195de6]/10 text-[#195de6]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Settings className="h-5 w-5" />
              <span className="text-sm font-medium">Site Settings</span>
            </Link>

            <Link
              to="/admin/header-footer"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive('/admin/header-footer')
                  ? 'bg-[#195de6]/10 text-[#195de6]'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <PanelTop className="h-5 w-5" />
              <span className="text-sm font-medium">Header & Footer</span>
            </Link>

            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
              <p className="px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Content Management</p>
              
              <Link
                to="/admin/menus"
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive('/admin/menus')
                    ? 'bg-[#195de6]/10 text-[#195de6]'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Menu className="h-5 w-5" />
                <span className="text-sm font-medium">Menus</span>
              </Link>

              <Link
                to="/admin/categories"
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive('/admin/categories')
                    ? 'bg-[#195de6]/10 text-[#195de6]'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FolderTree className="h-5 w-5" />
                <span className="text-sm font-medium">Categories</span>
              </Link>

              <Link
                to="/admin/hero"
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive('/admin/hero')
                    ? 'bg-[#195de6]/10 text-[#195de6]'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Image className="h-5 w-5" />
                <span className="text-sm font-medium">Hero Section</span>
              </Link>

              <Link
                to="/admin/trades"
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive('/admin/trades')
                    ? 'bg-[#195de6]/10 text-[#195de6]'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Wrench className="h-5 w-5" />
                <span className="text-sm font-medium">Trade Management</span>
              </Link>
              <Link
                to="/admin/about"
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive('/admin/about')
                    ? 'bg-[#195de6]/10 text-[#195de6]'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Info className="h-5 w-5" />
                <span className="text-sm font-medium">About Page</span>
              </Link>
              <Link
                to="/admin/admission-process"
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive('/admin/admission-process')
                    ? 'bg-[#195de6]/10 text-[#195de6]'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FileText className="h-5 w-5" />
                <span className="text-sm font-medium">Admission Process</span>
              </Link>
              <Link
                to="/admin/faculty"
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive('/admin/faculty')
                    ? 'bg-[#195de6]/10 text-[#195de6]'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Users className="h-5 w-5" />
                <span className="text-sm font-medium">Faculty & Staff</span>
              </Link>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
              <p className="px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">System</p>

              <Link
                to="/admin/fees"
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive('/admin/fees')
                    ? 'bg-[#195de6]/10 text-[#195de6]'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <DollarSign className="h-5 w-5" />
                <span className="text-sm font-medium">Fee Management</span>
              </Link>

              <Link
                to="/admin/library"
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  location.pathname.startsWith('/admin/library')
                    ? 'bg-[#195de6]/10 text-[#195de6]'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Library className="h-5 w-5" />
                <span className="text-sm font-medium">Library Management</span>
              </Link>

              <Link
                to="/admin/profile"
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive('/admin/profile')
                    ? 'bg-[#195de6]/10 text-[#195de6]'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <User className="h-5 w-5" />
                <span className="text-sm font-medium">My Profile</span>
              </Link>
            </div>
          </nav>

          {/* Profile Footer */}
          <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-full bg-[#195de6] flex items-center justify-center text-white font-bold text-sm">
                {adminUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{adminUser.name}</p>
                <p className="text-xs text-slate-500 capitalize">{adminUser.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
