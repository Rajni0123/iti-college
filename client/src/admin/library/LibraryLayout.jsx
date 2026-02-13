import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Armchair,
  DollarSign,
  Receipt,
  UserCog,
  FileBarChart,
  Settings,
  ArrowLeft
} from 'lucide-react';

const LibraryLayout = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;
  const isActivePrefix = (path) => location.pathname.startsWith(path);

  const navItems = [
    { path: '/admin/library', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { path: '/admin/library/students', label: 'Students', icon: Users },
    { path: '/admin/library/seats', label: 'Seats & Lockers', icon: Armchair },
    { path: '/admin/library/fees', label: 'Fee Collection', icon: DollarSign },
    { path: '/admin/library/expenses', label: 'Expenses', icon: Receipt },
    { path: '/admin/library/staff', label: 'Staff', icon: UserCog },
    { path: '/admin/library/reports', label: 'Reports', icon: FileBarChart },
    { path: '/admin/library/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#f6f6f8] dark:bg-[#111621]">
      {/* Sub-navigation Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                to="/admin"
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Back to Admin</span>
              </Link>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">Library Management</h1>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-1 -mb-px overflow-x-auto pb-px">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.exact ? isActive(item.path) : isActivePrefix(item.path) && (item.exact || location.pathname === item.path || !navItems.some(n => n.path !== item.path && location.pathname.startsWith(n.path)));
              const isActiveTab = item.exact ? isActive(item.path) : location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/admin/library');

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActiveTab
                      ? 'border-[#195de6] text-[#195de6]'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </div>
    </div>
  );
};

export default LibraryLayout;
