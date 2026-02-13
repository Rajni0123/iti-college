import { useState, useEffect } from 'react';
import { FileBarChart, Download, Calendar, Users, Armchair, Receipt } from 'lucide-react';
import {
  getLibraryDailyReport,
  getLibraryMonthlyReport,
  getLibraryStudentReport,
  getLibrarySeatReport,
  getLibraryExpenseReport
} from '../../services/api';
import { toast } from 'react-hot-toast';

const LibraryReports = () => {
  const [activeReport, setActiveReport] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const months = [
    { value: '1', label: 'January' }, { value: '2', label: 'February' },
    { value: '3', label: 'March' }, { value: '4', label: 'April' },
    { value: '5', label: 'May' }, { value: '6', label: 'June' },
    { value: '7', label: 'July' }, { value: '8', label: 'August' },
    { value: '9', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ];

  useEffect(() => {
    fetchReport();
  }, [activeReport, selectedDate, selectedMonth, selectedYear]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      let response;

      switch (activeReport) {
        case 'daily':
          response = await getLibraryDailyReport(selectedDate);
          break;
        case 'monthly':
          response = await getLibraryMonthlyReport(selectedMonth, selectedYear);
          break;
        case 'students':
          response = await getLibraryStudentReport();
          break;
        case 'seats':
          response = await getLibrarySeatReport();
          break;
        case 'expenses':
          response = await getLibraryExpenseReport(selectedMonth, selectedYear);
          break;
        default:
          return;
      }

      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Failed to load report');
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

  const exportToCSV = () => {
    if (!reportData) return;

    let csvContent = '';
    let filename = '';

    switch (activeReport) {
      case 'daily':
        filename = `daily-report-${selectedDate}.csv`;
        csvContent = 'Receipt No,Student,Amount,Mode,Date\n';
        reportData.payments?.forEach(p => {
          csvContent += `${p.receipt_number},${p.student_name},${p.amount},${p.payment_mode},${p.payment_date}\n`;
        });
        break;
      case 'monthly':
        filename = `monthly-report-${selectedMonth}-${selectedYear}.csv`;
        csvContent = `Monthly Report - ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}\n\n`;
        csvContent += `Total Collection,${reportData.total_collection}\n`;
        csvContent += `Total Expenses,${reportData.total_expenses}\n`;
        csvContent += `Net Profit,${reportData.net_profit}\n\n`;
        csvContent += 'Payments:\nReceipt No,Student,Amount,Mode,Date\n';
        reportData.payments?.forEach(p => {
          csvContent += `${p.receipt_number},${p.student_name},${p.amount},${p.payment_mode},${p.payment_date}\n`;
        });
        break;
      case 'students':
        filename = 'students-report.csv';
        csvContent = 'Name,Mobile,Seat,Locker,Monthly Fee,Status\n';
        reportData.students?.forEach(s => {
          csvContent += `${s.name},${s.mobile},${s.seat_number || 'N/A'},${s.locker_number || 'N/A'},${s.monthly_fee},${s.status}\n`;
        });
        break;
      case 'seats':
        filename = 'seats-report.csv';
        csvContent = `Seat Occupancy Report\n\n`;
        csvContent += `Total Seats,${reportData.total}\n`;
        csvContent += `Available,${reportData.available}\n`;
        csvContent += `Occupied,${reportData.occupied}\n`;
        csvContent += `Occupancy Rate,${reportData.occupancy_rate}%\n`;
        break;
      case 'expenses':
        filename = `expenses-report-${selectedMonth}-${selectedYear}.csv`;
        csvContent = 'Date,Type,Name,Amount,Added By\n';
        reportData.expenses?.forEach(e => {
          csvContent += `${e.date},${e.expense_type},${e.expense_name},${e.amount},${e.added_by}\n`;
        });
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  const reports = [
    { id: 'daily', label: 'Daily Collection', icon: Calendar },
    { id: 'monthly', label: 'Monthly Report', icon: FileBarChart },
    { id: 'students', label: 'Student List', icon: Users },
    { id: 'seats', label: 'Seat Occupancy', icon: Armchair },
    { id: 'expenses', label: 'Expenses', icon: Receipt }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h2>
          <p className="text-slate-500 dark:text-slate-400">Generate and export library reports</p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={!reportData}
          className="flex items-center gap-2 px-4 py-2 bg-[#195de6] text-white rounded-lg hover:bg-[#1550c9] transition-colors disabled:opacity-50"
        >
          <Download className="h-5 w-5" />
          Export CSV
        </button>
      </div>

      {/* Report Tabs */}
      <div className="flex flex-wrap gap-2">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeReport === report.id
                  ? 'bg-[#195de6] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {report.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {activeReport === 'daily' && (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        )}
        {['monthly', 'expenses'].includes(activeReport) && (
          <>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {[2023, 2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Report Content */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#195de6]"></div>
          </div>
        ) : reportData ? (
          <>
            {/* Daily Report */}
            {activeReport === 'daily' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Daily Collection - {new Date(selectedDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                  </h3>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Total Collection</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.total_collection)}</p>
                  </div>
                </div>
                {reportData.payments?.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr className="text-left text-sm text-slate-500">
                        <th className="px-4 py-3">Receipt</th>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {reportData.payments.map((p) => (
                        <tr key={p.id}>
                          <td className="px-4 py-3 font-mono text-sm">{p.receipt_number}</td>
                          <td className="px-4 py-3">{p.student_name}</td>
                          <td className="px-4 py-3 font-medium">{formatCurrency(p.amount)}</td>
                          <td className="px-4 py-3">{p.payment_mode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center text-slate-500 py-8">No collections on this date</p>
                )}
              </div>
            )}

            {/* Monthly Report */}
            {activeReport === 'monthly' && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
                  {months.find(m => m.value === selectedMonth)?.label} {selectedYear} Report
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <p className="text-sm text-green-600">Total Collection</p>
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(reportData.total_collection)}</p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <p className="text-sm text-red-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-700">{formatCurrency(reportData.total_expenses)}</p>
                  </div>
                  <div className={`p-4 rounded-xl ${reportData.net_profit >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                    <p className={`text-sm ${reportData.net_profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Net Profit</p>
                    <p className={`text-2xl font-bold ${reportData.net_profit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                      {formatCurrency(reportData.net_profit)}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  {reportData.total_transactions} transactions | {reportData.payments?.length || 0} payments | {reportData.expenses?.length || 0} expenses
                </p>
              </div>
            )}

            {/* Students Report */}
            {activeReport === 'students' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Student List</h3>
                  <p className="text-slate-500">{reportData.total} total students</p>
                </div>
                {reportData.students?.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr className="text-left text-sm text-slate-500">
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Mobile</th>
                        <th className="px-4 py-3">Seat</th>
                        <th className="px-4 py-3">Fee</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {reportData.students.map((s) => (
                        <tr key={s.id}>
                          <td className="px-4 py-3 font-medium">{s.name}</td>
                          <td className="px-4 py-3">{s.mobile}</td>
                          <td className="px-4 py-3">#{s.seat_number || 'N/A'}</td>
                          <td className="px-4 py-3">{formatCurrency(s.monthly_fee)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center text-slate-500 py-8">No students found</p>
                )}
              </div>
            )}

            {/* Seats Report */}
            {activeReport === 'seats' && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Seat Occupancy</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{reportData.total}</p>
                    <p className="text-sm text-slate-500">Total Seats</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
                    <p className="text-3xl font-bold text-green-600">{reportData.available}</p>
                    <p className="text-sm text-green-600">Available</p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center">
                    <p className="text-3xl font-bold text-red-600">{reportData.occupied}</p>
                    <p className="text-sm text-red-600">Occupied</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                    <p className="text-3xl font-bold text-blue-600">{reportData.occupancy_rate}%</p>
                    <p className="text-sm text-blue-600">Occupancy</p>
                  </div>
                </div>
              </div>
            )}

            {/* Expenses Report */}
            {activeReport === 'expenses' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Expenses - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                  </h3>
                  <p className="text-xl font-bold text-red-500">{formatCurrency(reportData.total)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                    <p className="text-sm text-orange-600">Fixed Expenses</p>
                    <p className="text-xl font-bold text-orange-700">{formatCurrency(reportData.total_fixed)}</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                    <p className="text-sm text-purple-600">Variable Expenses</p>
                    <p className="text-xl font-bold text-purple-700">{formatCurrency(reportData.total_variable)}</p>
                  </div>
                </div>
                {reportData.expenses?.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr className="text-left text-sm text-slate-500">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {reportData.expenses.map((e) => (
                        <tr key={e.id}>
                          <td className="px-4 py-3">{new Date(e.date).toLocaleDateString('en-IN')}</td>
                          <td className="px-4 py-3 capitalize">{e.expense_type}</td>
                          <td className="px-4 py-3">{e.expense_name}</td>
                          <td className="px-4 py-3 font-medium text-red-500">{formatCurrency(e.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center text-slate-500 py-8">No expenses this month</p>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-slate-500 py-8">Select a report to view</p>
        )}
      </div>
    </div>
  );
};

export default LibraryReports;
