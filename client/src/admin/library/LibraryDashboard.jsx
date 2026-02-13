import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Users,
  Armchair,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  ArrowRight
} from 'lucide-react';
import { getLibraryDashboard } from '../../services/api';
import { toast } from 'react-hot-toast';

const LibraryDashboard = () => {
  const [stats, setStats] = useState({
    today_collection: 0,
    monthly_collection: 0,
    total_students: 0,
    paid_students: 0,
    unpaid_students: 0,
    monthly_expenses: 0,
    monthly_profit: 0,
    total_seats: 170,
    available_seats: 170,
    occupied_seats: 0,
    recent_payments: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await getLibraryDashboard();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getMonthName = (monthNum) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[parseInt(monthNum) - 1] || monthNum;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#195de6]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Collection */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Today's Collection</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(stats.today_collection)}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-sm">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-slate-500">Live updates</span>
          </div>
        </div>

        {/* Monthly Collection */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Monthly Collection</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(stats.monthly_collection)}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-sm">
            <span className="text-slate-500">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Total Students */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Students</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {stats.total_students}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="text-green-600">{stats.paid_students} Paid</span>
            <span className="text-red-500">{stats.unpaid_students} Unpaid</span>
          </div>
        </div>

        {/* Monthly Profit */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Monthly Profit</p>
              <p className={`text-2xl font-bold mt-1 ${stats.monthly_profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {formatCurrency(stats.monthly_profit)}
              </p>
            </div>
            <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
              stats.monthly_profit >= 0
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-red-100 dark:bg-red-900/30'
            }`}>
              {stats.monthly_profit >= 0 ? (
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-500 dark:text-red-400" />
              )}
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-500">
            Expenses: {formatCurrency(stats.monthly_expenses)}
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seat Occupancy */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Seat Occupancy</h3>
            <Link
              to="/admin/library/seats"
              className="text-sm text-[#195de6] hover:underline flex items-center gap-1"
            >
              View Map <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="flex items-center justify-center mb-4">
            <div className="relative h-32 w-32">
              <svg className="h-32 w-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="16"
                  fill="none"
                  className="text-slate-200 dark:text-slate-700"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${(stats.occupied_seats / stats.total_seats) * 352} 352`}
                  className="text-[#195de6]"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {Math.round((stats.occupied_seats / stats.total_seats) * 100)}%
                  </p>
                  <p className="text-xs text-slate-500">Occupied</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.total_seats}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-600">{stats.available_seats}</p>
              <p className="text-xs text-slate-500">Available</p>
            </div>
            <div>
              <p className="text-xl font-bold text-red-500">{stats.occupied_seats}</p>
              <p className="text-xs text-slate-500">Occupied</p>
            </div>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Payments</h3>
            <Link
              to="/admin/library/fees"
              className="text-sm text-[#195de6] hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {stats.recent_payments?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-500 dark:text-slate-400">
                    <th className="pb-3 font-medium">Student</th>
                    <th className="pb-3 font-medium">Month</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Mode</th>
                    <th className="pb-3 font-medium">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stats.recent_payments.map((payment) => (
                    <tr key={payment.id} className="text-sm">
                      <td className="py-3">
                        <p className="font-medium text-slate-900 dark:text-white">{payment.student_name}</p>
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">
                        {getMonthName(payment.month)} {payment.year}
                      </td>
                      <td className="py-3 font-medium text-slate-900 dark:text-white">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          payment.payment_mode === 'Cash'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {payment.payment_mode}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">
                        {payment.receipt_number}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No recent payments</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          to="/admin/library/students"
          className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 hover:border-[#195de6] transition-colors group"
        >
          <Users className="h-8 w-8 text-[#195de6] mb-2" />
          <p className="font-medium text-slate-900 dark:text-white">Add Student</p>
          <p className="text-sm text-slate-500">New admission</p>
        </Link>

        <Link
          to="/admin/library/fees"
          className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 hover:border-[#195de6] transition-colors group"
        >
          <DollarSign className="h-8 w-8 text-[#195de6] mb-2" />
          <p className="font-medium text-slate-900 dark:text-white">Collect Fee</p>
          <p className="text-sm text-slate-500">Record payment</p>
        </Link>

        <Link
          to="/admin/library/expenses"
          className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 hover:border-[#195de6] transition-colors group"
        >
          <TrendingDown className="h-8 w-8 text-[#195de6] mb-2" />
          <p className="font-medium text-slate-900 dark:text-white">Add Expense</p>
          <p className="text-sm text-slate-500">Track costs</p>
        </Link>

        <Link
          to="/admin/library/reports"
          className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 hover:border-[#195de6] transition-colors group"
        >
          <Armchair className="h-8 w-8 text-[#195de6] mb-2" />
          <p className="font-medium text-slate-900 dark:text-white">View Reports</p>
          <p className="text-sm text-slate-500">Analytics</p>
        </Link>
      </div>
    </div>
  );
};

export default LibraryDashboard;
