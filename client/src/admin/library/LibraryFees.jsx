import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Printer,
  MessageCircle,
  X,
  Receipt,
  Calendar,
  Download
} from 'lucide-react';
import {
  getLibraryFees,
  collectLibraryFee,
  getLibraryFeeReceipt,
  searchLibraryStudents,
  getLibrarySettings
} from '../../services/api';
import { toast } from 'react-hot-toast';

const LibraryFees = () => {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [librarySettings, setLibrarySettings] = useState({});
  const [studentSearch, setStudentSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const receiptRef = useRef(null);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    student_id: '',
    amount: '',
    month: currentMonth.toString(),
    year: currentYear.toString(),
    payment_mode: 'Cash',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  useEffect(() => {
    fetchFees();
    fetchSettings();
  }, [filterMonth, filterYear]);

  const fetchFees = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterMonth) params.month = filterMonth;
      if (filterYear) params.year = filterYear;
      const response = await getLibraryFees(params);
      setFees(response.data);
    } catch (error) {
      console.error('Error fetching fees:', error);
      toast.error('Failed to load fees');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await getLibrarySettings();
      setLibrarySettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleStudentSearch = async (query) => {
    setStudentSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await searchLibraryStudents(query);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching students:', error);
    }
  };

  const selectStudent = (student) => {
    setSelectedStudent(student);
    setFormData({
      ...formData,
      student_id: student.id,
      amount: student.monthly_fee || librarySettings.default_monthly_fee || ''
    });
    setStudentSearch(student.name);
    setSearchResults([]);
  };

  const handleCollectFee = async (e) => {
    e.preventDefault();

    if (!formData.student_id || !formData.amount || !formData.month || !formData.year) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const response = await collectLibraryFee(formData);
      toast.success(`Fee collected! Receipt: ${response.data.receipt_number}`);

      // Show receipt
      const receiptRes = await getLibraryFeeReceipt(response.data.id);
      setSelectedReceipt(receiptRes.data);
      setShowCollectModal(false);
      setShowReceiptModal(true);

      // Reset form
      setFormData({
        student_id: '',
        amount: '',
        month: currentMonth.toString(),
        year: currentYear.toString(),
        payment_mode: 'Cash',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setSelectedStudent(null);
      setStudentSearch('');

      fetchFees();
    } catch (error) {
      console.error('Error collecting fee:', error);
      toast.error(error.response?.data?.message || 'Failed to collect fee');
    }
  };

  const viewReceipt = async (fee) => {
    try {
      const response = await getLibraryFeeReceipt(fee.id);
      setSelectedReceipt(response.data);
      setShowReceiptModal(true);
    } catch (error) {
      console.error('Error fetching receipt:', error);
      toast.error('Failed to load receipt');
    }
  };

  // Download PDF receipt for WhatsApp sharing
  const downloadReceiptPDF = () => {
    if (!selectedReceipt) return;

    const monthName = months.find(m => m.value === selectedReceipt?.month)?.label || selectedReceipt?.month;
    const receiptDate = new Date(selectedReceipt?.payment_date).toLocaleDateString('en-IN');

    const pdfWindow = window.open('', '_blank');
    pdfWindow.document.write(`
      <html>
        <head>
          <title>Receipt_${selectedReceipt?.receipt_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page {
              size: 58mm 120mm;
              margin: 0;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 10px;
              width: 58mm;
              padding: 3mm;
              background: #fff;
            }
            .receipt { width: 100%; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 4px 0; }
            .header { text-align: center; margin-bottom: 5px; }
            .header h1 { font-size: 11px; font-weight: bold; margin-bottom: 2px; }
            .header p { font-size: 9px; }
            .info-row { display: flex; justify-content: space-between; font-size: 9px; margin: 2px 0; }
            .amount-box { text-align: center; margin: 8px 0; padding: 5px; border: 1px dashed #000; }
            .amount-box .label { font-size: 8px; }
            .amount-box .value { font-size: 14px; font-weight: bold; }
            .footer { text-align: center; font-size: 8px; margin-top: 5px; }
            .save-btn {
              position: fixed; top: 10px; right: 10px;
              padding: 10px 20px; background: #195de6; color: white;
              border: none; border-radius: 5px; cursor: pointer; font-size: 12px;
            }
            @media print { .save-btn { display: none; } }
          </style>
        </head>
        <body>
          <button class="save-btn" onclick="window.print()">Save as PDF / Print</button>
          <div class="receipt">
            <div class="header">
              <h1>${librarySettings.library_name || 'Maa Sarita Library'}</h1>
              <p>Fee Payment Receipt</p>
            </div>
            <div class="divider"></div>
            <div class="info-row"><span>Receipt:</span><span class="bold">${selectedReceipt?.receipt_number}</span></div>
            <div class="info-row"><span>Date:</span><span>${receiptDate}</span></div>
            <div class="divider"></div>
            <div class="info-row"><span>Student:</span><span class="bold">${selectedReceipt?.student_name}</span></div>
            <div class="info-row"><span>Seat No:</span><span>#${selectedReceipt?.seat_number || 'N/A'}</span></div>
            <div class="info-row"><span>Month:</span><span>${monthName} ${selectedReceipt?.year}</span></div>
            <div class="info-row"><span>Mode:</span><span>${selectedReceipt?.payment_mode}</span></div>
            <div class="divider"></div>
            <div class="amount-box">
              <div class="label">AMOUNT PAID</div>
              <div class="value">Rs. ${selectedReceipt?.amount}</div>
            </div>
            <div class="divider"></div>
            <div class="footer">
              <p>Thank you!</p>
              ${librarySettings.address ? `<p>${librarySettings.address}</p>` : ''}
              ${librarySettings.phone ? `<p>Ph: ${librarySettings.phone}</p>` : ''}
            </div>
          </div>
        </body>
      </html>
    `);
    pdfWindow.document.close();
    toast.success('Save as PDF then share on WhatsApp');
  };

  const sendWhatsApp = () => {
    if (!selectedReceipt) return;

    const phone = selectedReceipt.whatsapp_number || selectedReceipt.mobile;
    if (!phone) {
      toast.error('No WhatsApp number available');
      return;
    }

    const monthName = months.find(m => m.value === selectedReceipt.month)?.label || selectedReceipt.month;
    const receiptDate = new Date(selectedReceipt.payment_date).toLocaleDateString('en-IN');

    // Formatted receipt text for WhatsApp
    const message = `═══════════════════
   *${librarySettings.library_name || 'Maa Sarita Library'}*
   _Fee Payment Receipt_
═══════════════════
📄 *Receipt:* ${selectedReceipt.receipt_number}
📅 *Date:* ${receiptDate}
───────────────────
👤 *Student:* ${selectedReceipt.student_name}
💺 *Seat No:* #${selectedReceipt.seat_number || 'N/A'}
📆 *Month:* ${monthName} ${selectedReceipt.year}
💳 *Mode:* ${selectedReceipt.payment_mode}
───────────────────
💰 *AMOUNT PAID*
      *₹ ${selectedReceipt.amount}*
═══════════════════
✅ Thank you for your payment!
${librarySettings.phone ? `📞 ${librarySettings.phone}` : ''}
═══════════════════`;

    const whatsappUrl = `https://wa.me/91${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const printReceipt = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const monthName = months.find(m => m.value === selectedReceipt?.month)?.label || selectedReceipt?.month;
    const receiptDate = new Date(selectedReceipt?.payment_date).toLocaleDateString('en-IN');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${selectedReceipt?.receipt_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page {
              size: 58mm auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 10px;
              width: 58mm;
              padding: 2mm;
            }
            .receipt {
              width: 100%;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider {
              border-top: 1px dashed #000;
              margin: 4px 0;
            }
            .header {
              text-align: center;
              margin-bottom: 5px;
            }
            .header h1 {
              font-size: 12px;
              font-weight: bold;
              margin-bottom: 2px;
            }
            .header p {
              font-size: 9px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              margin: 2px 0;
            }
            .amount-box {
              text-align: center;
              margin: 8px 0;
              padding: 5px;
              border: 1px dashed #000;
            }
            .amount-box .label {
              font-size: 8px;
            }
            .amount-box .value {
              font-size: 16px;
              font-weight: bold;
            }
            .footer {
              text-align: center;
              font-size: 8px;
              margin-top: 5px;
            }
            @media print {
              body {
                width: 58mm;
                padding: 1mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>${librarySettings.library_name || 'Maa Sarita Library'}</h1>
              <p>Fee Payment Receipt</p>
            </div>
            <div class="divider"></div>
            <div class="info-row"><span>Receipt:</span><span class="bold">${selectedReceipt?.receipt_number}</span></div>
            <div class="info-row"><span>Date:</span><span>${receiptDate}</span></div>
            <div class="divider"></div>
            <div class="info-row"><span>Student:</span><span class="bold">${selectedReceipt?.student_name}</span></div>
            <div class="info-row"><span>Seat No:</span><span>#${selectedReceipt?.seat_number || 'N/A'}</span></div>
            <div class="info-row"><span>Month:</span><span>${monthName} ${selectedReceipt?.year}</span></div>
            <div class="info-row"><span>Mode:</span><span>${selectedReceipt?.payment_mode}</span></div>
            <div class="divider"></div>
            <div class="amount-box">
              <div class="label">AMOUNT PAID</div>
              <div class="value">Rs. ${selectedReceipt?.amount}</div>
            </div>
            <div class="divider"></div>
            <div class="footer">
              <p>Thank you for your payment!</p>
              ${librarySettings.address ? `<p>${librarySettings.address}</p>` : ''}
              ${librarySettings.phone ? `<p>Ph: ${librarySettings.phone}</p>` : ''}
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getMonthName = (monthNum) => {
    return months.find(m => m.value === monthNum)?.label || monthNum;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Fee Collection</h2>
          <p className="text-slate-500 dark:text-slate-400">Collect and manage library fees</p>
        </div>
        <button
          onClick={() => setShowCollectModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#195de6] text-white rounded-lg hover:bg-[#1550c9] transition-colors"
        >
          <Plus className="h-5 w-5" />
          Collect Fee
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6] focus:border-transparent"
        >
          <option value="">All Months</option>
          {months.map((month) => (
            <option key={month.value} value={month.value}>{month.label}</option>
          ))}
        </select>

        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6] focus:border-transparent"
        >
          {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#195de6]"></div>
          </div>
        ) : fees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr className="text-left text-sm text-slate-500 dark:text-slate-400">
                  <th className="px-6 py-4 font-medium">Receipt No</th>
                  <th className="px-6 py-4 font-medium">Student</th>
                  <th className="px-6 py-4 font-medium">Month</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Mode</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {fees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-mono text-sm text-slate-900 dark:text-white">
                      {fee.receipt_number}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{fee.student_name}</p>
                        <p className="text-sm text-slate-500">Seat #{fee.seat_number || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {getMonthName(fee.month)} {fee.year}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {formatCurrency(fee.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        fee.payment_mode === 'Cash'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {fee.payment_mode}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {new Date(fee.payment_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => viewReceipt(fee)}
                        className="p-2 text-slate-500 hover:text-[#195de6] hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title="View Receipt"
                      >
                        <Receipt className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Receipt className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400">No fee records found</p>
          </div>
        )}
      </div>

      {/* Collect Fee Modal */}
      {showCollectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Collect Fee</h3>
              <button
                onClick={() => setShowCollectModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCollectFee} className="p-6 space-y-4">
              {/* Student Search */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Select Student *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => handleStudentSearch(e.target.value)}
                    placeholder="Search by name or mobile..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6] focus:border-transparent"
                  />
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 max-h-48 overflow-y-auto">
                    {searchResults.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => selectStudent(student)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{student.name}</p>
                          <p className="text-sm text-slate-500">Seat #{student.seat_number || 'N/A'} | {student.mobile}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          student.fee_status === 'Paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {student.fee_status}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Student Info */}
                {selectedStudent && (
                  <div className="mt-2 p-3 bg-[#195de6]/10 rounded-lg">
                    <p className="font-medium text-[#195de6]">{selectedStudent.name}</p>
                    <p className="text-sm text-slate-600">
                      Seat #{selectedStudent.seat_number || 'N/A'} | Monthly Fee: {formatCurrency(selectedStudent.monthly_fee)}
                    </p>
                  </div>
                )}
              </div>

              {/* Month & Year */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Month *
                  </label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6] focus:border-transparent"
                    required
                  >
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Year *
                  </label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6] focus:border-transparent"
                    required
                  >
                    {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Amount *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="500"
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6] focus:border-transparent"
                  required
                />
              </div>

              {/* Payment Mode & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6] focus:border-transparent"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6] focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCollectModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#195de6] text-white rounded-lg hover:bg-[#1550c9] transition-colors"
                >
                  Collect Fee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Fee Receipt</h3>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Receipt Content */}
            <div ref={receiptRef} className="p-6">
              <div className="text-center mb-6 pb-4 border-b border-dashed border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {librarySettings.library_name || 'Study Library'}
                </h2>
                <p className="text-sm text-slate-500">Fee Payment Receipt</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt No:</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-white">{selectedReceipt.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="text-slate-900 dark:text-white">{new Date(selectedReceipt.payment_date).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Student:</span>
                  <span className="font-medium text-slate-900 dark:text-white">{selectedReceipt.student_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Seat No:</span>
                  <span className="text-slate-900 dark:text-white">#{selectedReceipt.seat_number || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Month:</span>
                  <span className="text-slate-900 dark:text-white">{getMonthName(selectedReceipt.month)} {selectedReceipt.year}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedReceipt.payment_mode === 'Cash'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {selectedReceipt.payment_mode}
                  </span>
                </div>
              </div>

              <div className="my-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl text-center">
                <p className="text-sm text-slate-500 mb-1">Amount Paid</p>
                <p className="text-3xl font-bold text-[#195de6]">{formatCurrency(selectedReceipt.amount)}</p>
              </div>

              <div className="text-center text-xs text-slate-400 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700">
                <p>Thank you for your payment!</p>
                {librarySettings.address && <p className="mt-1">{librarySettings.address}</p>}
                {librarySettings.phone && <p>{librarySettings.phone}</p>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 p-4 border-t border-slate-200 dark:border-slate-800">
              {selectedReceipt.has_whatsapp === 1 && (
                <button
                  onClick={sendWhatsApp}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </button>
              )}
              <button
                onClick={downloadReceiptPDF}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
              <button
                onClick={printReceipt}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#195de6] text-white rounded-lg hover:bg-[#1550c9] transition-colors text-sm"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryFees;
