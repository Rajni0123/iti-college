import { useState, useEffect, useRef } from 'react';
import { 
  Plus, Edit, Trash2, DollarSign, Receipt, FileText, X, Search,
  CreditCard, Calendar, Users, TrendingUp, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp, Printer, Download, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getHeaderSettings, getFooterSettings, getRecentPayments } from '../services/api';

const FeeManagement = () => {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total_records: 0,
    total_fees: 0,
    total_collected: 0,
    total_pending: 0,
    paid_count: 0,
    partial_count: 0,
    pending_count: 0
  });
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showMultipleReceiptsModal, setShowMultipleReceiptsModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const [multipleReceipts, setMultipleReceipts] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTrade, setFilterTrade] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [siteInfo, setSiteInfo] = useState({
    collegeName: 'Maner Pvt ITI',
    phone: '+91-9155401839',
    email: 'manerpvtiti@gmail.com',
    address: 'Maner, Mahinawan, Near Vishwakarma Mandir, Maner, Patna - 801108'
  });
  
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentBalance, setStudentBalance] = useState(null);
  const studentSearchRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const [formData, setFormData] = useState({
    admission_id: null,
    student_name: '',
    father_name: '',
    mobile: '',
    trade: '',
    fee_type: '',
    amount: '',
    due_date: '',
    notes: '',
    installment_enabled: false,
    total_installments: 2,
    installment_amounts: [],
    installment_due_dates: [],
    academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    collect_now: true,
    advance_payment: '',
    payment_method: 'Cash',
    payment_date: new Date().toISOString().split('T')[0]
  });

  const [paymentData, setPaymentData] = useState({
    paid_amount: '',
    payment_method: 'Cash',
    payment_date: new Date().toISOString().split('T')[0],
    installment_id: null
  });

  useEffect(() => {
    fetchFees();
    fetchSummary();
    fetchSiteInfo();
  }, [filterStatus, filterTrade]);

  const fetchSiteInfo = async () => {
    try {
      const [headerRes, footerRes] = await Promise.all([
        getHeaderSettings(),
        getFooterSettings()
      ]);
      
      setSiteInfo({
        collegeName: headerRes.data?.logo_text || 'Maner Pvt ITI',
        phone: headerRes.data?.phone || footerRes.data?.phone || '+91-9155401839',
        email: headerRes.data?.email || footerRes.data?.email || 'manerpvtiti@gmail.com',
        address: footerRes.data?.address || 'Maner, Mahinawan, Near Vishwakarma Mandir, Maner, Patna - 801108'
      });
    } catch (error) {
      console.error('Error fetching site info:', error);
      // Use defaults already set
    }
  };

  // Close student dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (studentSearchRef.current && !studentSearchRef.current.contains(event.target)) {
        setShowStudentDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchStudents = async (query) => {
    if (query.trim().length < 2) {
      setStudentSearchResults([]);
      setShowStudentDropdown(false);
      return;
    }
    try {
      const response = await api.get(`/fees/search-students?q=${encodeURIComponent(query)}`);
      setStudentSearchResults(response.data || []);
      setShowStudentDropdown(true);
    } catch (error) {
      console.error('Error searching students:', error);
    }
  };

  const handleStudentSearchInput = (value) => {
    setStudentSearchQuery(value);
    setFormData({ ...formData, student_name: value });
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchStudents(value), 300);
  };

  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    setStudentSearchQuery(student.student_name);
    setShowStudentDropdown(false);
    setFormData({
      ...formData,
      admission_id: student.admission_id,
      student_name: student.student_name,
      father_name: student.father_name || '',
      mobile: student.mobile || '',
      trade: student.trade || ''
    });

    // Fetch student fee balance
    try {
      const response = await api.get(`/fees/student-balance/${student.admission_id}`);
      setStudentBalance(response.data);
    } catch (error) {
      console.error('Error fetching student balance:', error);
    }
  };

  const fetchFees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterTrade) params.append('trade', filterTrade);
      
      const response = await api.get(`/fees?${params.toString()}`);
      setFees(response.data);
    } catch (error) {
      console.error('Error fetching fees:', error);
      toast.error('Failed to fetch fees');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get('/fees/summary');
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.student_name || !formData.trade || !formData.fee_type || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const feeData = {
        admission_id: formData.admission_id || null,
        student_name: formData.student_name.trim(),
        father_name: formData.father_name?.trim() || null,
        mobile: formData.mobile?.trim() || null,
        trade: formData.trade,
        fee_type: formData.fee_type,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date || null,
        notes: formData.notes?.trim() || null,
        installment_enabled: formData.installment_enabled,
        total_installments: formData.installment_enabled ? parseInt(formData.total_installments) : 1,
        installment_amounts: formData.installment_amounts,
        installment_due_dates: formData.installment_due_dates,
        academic_year: formData.academic_year
      };

      // Include advance payment if "Collect Now" is enabled
      if (formData.collect_now && formData.advance_payment) {
        const advAmt = parseFloat(formData.advance_payment);
        if (advAmt > 0) {
          feeData.advance_payment = advAmt;
          feeData.payment_method = formData.payment_method || 'Cash';
          feeData.payment_date = formData.payment_date || new Date().toISOString().split('T')[0];
        }
      }

      console.log('Submitting fee data:', feeData);
      const response = await api.post('/fees', feeData);
      const msg = response.data?.message || 'Fee record created successfully';
      toast.success(msg);
      fetchFees();
      fetchSummary();
      closeModal();
    } catch (error) {
      console.error('Error creating fee:', error);
      toast.error(error.response?.data?.message || 'Failed to create fee record');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    if (!paymentData.paid_amount || parseFloat(paymentData.paid_amount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    try {
      const response = await api.post(`/fees/${selectedFee.id}/pay`, {
        paid_amount: parseFloat(paymentData.paid_amount),
        payment_method: paymentData.payment_method,
        payment_date: paymentData.payment_date,
        installment_id: paymentData.installment_id
      });
      
      toast.success(`Payment processed! Receipt: ${response.data.receipt_number}`);
      fetchFees();
      fetchSummary();
      setShowPaymentModal(false);
      setShowDetailsModal(false);
      setSelectedFee(null);
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(error.response?.data?.message || 'Failed to process payment');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this fee record?')) return;
    try {
      await api.delete(`/fees/${id}`);
      toast.success('Fee record deleted successfully');
      fetchFees();
      fetchSummary();
    } catch (error) {
      toast.error('Failed to delete fee record');
    }
  };

  const openPaymentModal = (fee, installment = null) => {
    setSelectedFee(fee);
    const remaining = installment 
      ? (installment.amount - (installment.paid_amount || 0))
      : (fee.amount - (fee.paid_amount || 0));
    
    setPaymentData({
      paid_amount: remaining.toString(),
      payment_method: 'Cash',
      payment_date: new Date().toISOString().split('T')[0],
      installment_id: installment?.id || null
    });
    setShowPaymentModal(true);
  };

  const openDetailsModal = async (fee) => {
    try {
      const response = await api.get(`/fees/${fee.id}`);
      setSelectedFee(response.data);
      setShowDetailsModal(true);
    } catch (error) {
      toast.error('Failed to fetch fee details');
    }
  };

  const handlePrintReceipt = async (fee) => {
    try {
      const response = await api.get(`/fees/${fee.id}`);
      setSelectedFee(response.data);
      setShowReceiptModal(true);
      // Wait for modal to render, then trigger print
      setTimeout(() => {
        window.print();
      }, 100);
    } catch (error) {
      toast.error('Failed to fetch receipt details');
    }
  };

  const handleGenerateMultipleReceipts = async () => {
    try {
      toast.loading('Fetching recent payments...', { id: 'loading-receipts' });
      
      const response = await getRecentPayments();
      const payments = response?.data || [];
      
      toast.dismiss('loading-receipts');
      
      if (!payments || payments.length === 0) {
        toast.error('No payments found in the last 7 days');
        return;
      }

      // Use the payment data directly - it already has all the information we need
      // Filter out any payments that don't have required fields
      const validReceipts = payments.filter(payment => 
        payment && 
        payment.id && 
        payment.student_name && 
        payment.paid_amount > 0
      );
      
      if (validReceipts.length === 0) {
        toast.error('No valid receipts found');
        return;
      }
      
      if (validReceipts.length < payments.length) {
        toast.warning(`Only ${validReceipts.length} out of ${payments.length} receipts are valid`);
      }
      
      setMultipleReceipts(validReceipts);
      setShowMultipleReceiptsModal(true);
      
      // Wait for modal to render, then trigger print
      setTimeout(() => {
        window.print();
      }, 300);
    } catch (error) {
      toast.dismiss('loading-receipts');
      console.error('Error generating multiple receipts:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to generate multiple receipts';
      toast.error(`Error: ${errorMessage}`);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedStudent(null);
    setStudentBalance(null);
    setStudentSearchQuery('');
    setStudentSearchResults([]);
    setShowStudentDropdown(false);
    setFormData({
      admission_id: null,
      student_name: '',
      father_name: '',
      mobile: '',
      trade: '',
      fee_type: '',
      amount: '',
      due_date: '',
      notes: '',
      installment_enabled: false,
      total_installments: 2,
      installment_amounts: [],
      installment_due_dates: [],
      academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      collect_now: true,
      advance_payment: '',
      payment_method: 'Cash',
      payment_date: new Date().toISOString().split('T')[0]
    });
  };

  const updateInstallmentConfig = (numInstallments) => {
    const amount = parseFloat(formData.amount) || 0;
    const perInstallment = amount / numInstallments;
    const amounts = Array(numInstallments).fill(perInstallment.toFixed(2));
    const dates = Array(numInstallments).fill('');
    
    setFormData({
      ...formData,
      total_installments: numInstallments,
      installment_amounts: amounts,
      installment_due_dates: dates
    });
  };

  const getStatusBadge = (status) => {
    if (status === 'Paid') {
      return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Paid</span>;
    } else if (status === 'Partially Paid') {
      return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Partial</span>;
    }
    return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Pending</span>;
  };

  const filteredFees = fees.filter(fee => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return fee.student_name.toLowerCase().includes(query) ||
             fee.trade.toLowerCase().includes(query) ||
             fee.invoice_number?.toLowerCase().includes(query);
    }
    return true;
  });

  const trades = ['Electrician', 'Fitter'];
  const feeTypes = ['Admission Fee', 'Tuition Fee', 'Examination Fee', 'Workshop Fee', 'Library Fee', 'Other'];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-slate-900 dark:text-white text-3xl font-bold tracking-tight">Fee Management</h2>
            <p className="text-slate-500 dark:text-slate-400 text-base">Manage student fees, payments & installments</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleGenerateMultipleReceipts}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold shadow-lg hover:bg-green-700 transition-colors"
            >
              <Receipt className="h-4 w-4" />
              Generate Multiple Receipts (Last 7 Days)
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#195de6] text-white text-sm font-bold shadow-lg hover:bg-[#1e40af] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Collect Fee
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl">
            <div className="flex justify-between items-start mb-2">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Fees</p>
              <CreditCard className="h-5 w-5 text-[#195de6]" />
            </div>
            <p className="text-slate-900 dark:text-white text-2xl font-bold">₹{(summary.total_fees || 0).toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">{summary.total_records} records</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl">
            <div className="flex justify-between items-start mb-2">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Collected</p>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-green-600 dark:text-green-400 text-2xl font-bold">₹{(summary.total_collected || 0).toLocaleString()}</p>
            <p className="text-xs text-green-600 mt-1">{summary.paid_count} fully paid</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl">
            <div className="flex justify-between items-start mb-2">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pending</p>
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-amber-600 dark:text-amber-400 text-2xl font-bold">₹{(summary.total_pending || 0).toLocaleString()}</p>
            <p className="text-xs text-amber-600 mt-1">{summary.pending_count + summary.partial_count} pending</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl">
            <div className="flex justify-between items-start mb-2">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Collection Rate</p>
              <CheckCircle className="h-5 w-5 text-indigo-500" />
            </div>
            <p className="text-indigo-600 dark:text-indigo-400 text-2xl font-bold">
              {summary.total_fees > 0 ? Math.round((summary.total_collected / summary.total_fees) * 100) : 0}%
            </p>
            <p className="text-xs text-slate-400 mt-1">of total fees</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, trade, or invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
              />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid</option>
          </select>
          <select
            value={filterTrade}
            onChange={(e) => setFilterTrade(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
          >
            <option value="">All Trades</option>
            {trades.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Fee Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#195de6] mx-auto mb-4"></div>
              <p className="text-slate-500">Loading fees...</p>
            </div>
          ) : filteredFees.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">No fee records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">Student</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">Trade</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">Fee Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">Paid</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-slate-500">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredFees.map((fee) => (
                    <tr key={fee.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{fee.student_name}</p>
                          {fee.father_name && (
                            <p className="text-xs text-slate-500">S/O {fee.father_name}</p>
                          )}
                          {fee.invoice_number && (
                            <p className="text-xs text-[#195de6] font-mono">{fee.invoice_number}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{fee.trade}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{fee.fee_type}</span>
                        {fee.installment_enabled === 1 && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-full">
                            {fee.total_installments} EMI
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">₹{fee.amount?.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-green-600 dark:text-green-400 font-semibold">₹{(fee.paid_amount || 0).toLocaleString()}</td>
                      <td className="px-6 py-4">{getStatusBadge(fee.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openDetailsModal(fee)}
                            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {fee.status !== 'Paid' && (
                            <button
                              onClick={() => openPaymentModal(fee)}
                              className="p-2 rounded-lg text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                              title="Record Payment"
                            >
                              <DollarSign className="h-4 w-4" />
                            </button>
                          )}
                          {fee.receipt_number && (
                            <button
                              onClick={() => handlePrintReceipt(fee)}
                              className="p-2 rounded-lg text-[#195de6] hover:bg-[#195de6]/10"
                              title="Print Receipt"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(fee.id)}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Fee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-900 p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Collect Fee</h3>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Student Information with Autocomplete */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Student Information</h4>

                {/* Student Name Autocomplete */}
                <div className="relative" ref={studentSearchRef}>
                  <label className="block text-sm font-medium mb-2">Student Name * <span className="text-xs text-slate-400 font-normal">(Type to search)</span></label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={studentSearchQuery || formData.student_name}
                      onChange={(e) => handleStudentSearchInput(e.target.value)}
                      onFocus={() => { if (studentSearchResults.length > 0) setShowStudentDropdown(true); }}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm"
                      placeholder="Type student name to search..."
                    />
                  </div>

                  {/* Search Results Dropdown */}
                  {showStudentDropdown && studentSearchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {studentSearchResults.map((student) => (
                        <button
                          key={student.admission_id}
                          type="button"
                          onClick={() => handleSelectStudent(student)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-b-0 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{student.student_name}</p>
                              <p className="text-xs text-slate-500">S/O {student.father_name} | {student.trade} | {student.mobile}</p>
                            </div>
                            {student.total_due_balance > 0 && (
                              <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                                Due: ₹{student.total_due_balance.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Student Info Card */}
                {selectedStudent && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-blue-600 uppercase">Selected Student</span>
                      <button type="button" onClick={() => {
                        setSelectedStudent(null);
                        setStudentBalance(null);
                        setStudentSearchQuery('');
                        setFormData({ ...formData, admission_id: null, student_name: '', father_name: '', mobile: '', trade: '' });
                      }} className="text-xs text-blue-500 hover:text-blue-700">Clear</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-slate-500">Name:</span> <span className="font-medium">{selectedStudent.student_name}</span></div>
                      <div><span className="text-slate-500">Father:</span> <span className="font-medium">{selectedStudent.father_name}</span></div>
                      <div><span className="text-slate-500">Mobile:</span> <span className="font-medium">{selectedStudent.mobile}</span></div>
                      <div><span className="text-slate-500">Trade:</span> <span className="font-medium">{selectedStudent.trade}</span></div>
                    </div>
                    {studentBalance && (
                      <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Total Fees</p>
                          <p className="font-semibold text-slate-900 dark:text-white">₹{studentBalance.total_fees.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Paid</p>
                          <p className="font-semibold text-green-600">₹{studentBalance.total_paid.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Due Balance</p>
                          <p className="font-semibold text-red-600">₹{studentBalance.total_due.toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Other student fields (editable, auto-filled) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Father's Name</label>
                    <input
                      type="text"
                      value={formData.father_name}
                      onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm"
                      placeholder="Auto-filled on student select"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Mobile Number</label>
                    <input
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm"
                      placeholder="Auto-filled on student select"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Trade *</label>
                    <select
                      required
                      value={formData.trade}
                      onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm"
                    >
                      <option value="">Select Trade</option>
                      {trades.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Fee Details */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Fee Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Fee Type *</label>
                    <select
                      required
                      value={formData.fee_type}
                      onChange={(e) => setFormData({ ...formData, fee_type: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm"
                    >
                      <option value="">Select Fee Type</option>
                      {feeTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Academic Year</label>
                    <input
                      type="text"
                      value={formData.academic_year}
                      onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm"
                      placeholder="e.g., 2024-2025"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Total Amount *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                      <input
                        type="number"
                        required
                        step="0.01"
                        min="1"
                        value={formData.amount}
                        onChange={(e) => {
                          setFormData({ ...formData, amount: e.target.value });
                          if (formData.installment_enabled) {
                            updateInstallmentConfig(formData.total_installments);
                          }
                        }}
                        className="w-full pl-8 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm"
                        placeholder="Enter amount"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Due Date</label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Installment Option */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="installment_enabled"
                    checked={formData.installment_enabled}
                    onChange={(e) => {
                      setFormData({ ...formData, installment_enabled: e.target.checked });
                      if (e.target.checked && formData.amount) {
                        updateInstallmentConfig(formData.total_installments);
                      }
                    }}
                    className="w-5 h-5 text-[#195de6] rounded"
                  />
                  <label htmlFor="installment_enabled" className="text-sm font-medium cursor-pointer">
                    Enable Installment Payment (EMI)
                  </label>
                </div>

                {formData.installment_enabled && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Number of Installments</label>
                      <select
                        value={formData.total_installments}
                        onChange={(e) => updateInstallmentConfig(parseInt(e.target.value))}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                      >
                        <option value="2">2 Installments</option>
                        <option value="3">3 Installments</option>
                        <option value="4">4 Installments</option>
                        <option value="6">6 Installments</option>
                        <option value="12">12 Installments</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Installment Breakdown:</p>
                      {Array.from({ length: formData.total_installments }).map((_, index) => (
                        <div key={index} className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg">
                          <span className="text-xs font-bold text-slate-500 w-6">#{index + 1}</span>
                          <div className="flex-1">
                            <input
                              type="number"
                              step="0.01"
                              value={formData.installment_amounts[index] || ''}
                              onChange={(e) => {
                                const newAmounts = [...formData.installment_amounts];
                                newAmounts[index] = e.target.value;
                                setFormData({ ...formData, installment_amounts: newAmounts });
                              }}
                              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded text-sm"
                              placeholder="Amount"
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              type="date"
                              value={formData.installment_due_dates[index] || ''}
                              onChange={(e) => {
                                const newDates = [...formData.installment_due_dates];
                                newDates[index] = e.target.value;
                                setFormData({ ...formData, installment_due_dates: newDates });
                              }}
                              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm resize-none"
                  rows="2"
                  placeholder="Any additional notes..."
                />
              </div>

              {/* Collect Payment Now */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={formData.collect_now}
                    onChange={(e) => setFormData({ ...formData, collect_now: e.target.checked, advance_payment: e.target.checked ? formData.amount : '' })}
                    className="w-5 h-5 rounded-lg accent-green-600"
                  />
                  <span className="text-sm font-bold text-green-800 dark:text-green-300">Collect Payment Now</span>
                </label>
                {formData.collect_now && (
                  <div className="space-y-3 mt-2">
                    <div>
                      <label className="block text-xs font-medium text-green-700 dark:text-green-400 mb-1">Payment Amount (₹)</label>
                      <input
                        type="number"
                        value={formData.advance_payment}
                        onChange={(e) => setFormData({ ...formData, advance_payment: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-green-300 dark:border-green-700 rounded-lg text-sm"
                        placeholder="Enter amount to collect"
                        max={formData.amount || undefined}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-green-700 dark:text-green-400 mb-1">Payment Method</label>
                        <select
                          value={formData.payment_method}
                          onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-green-300 dark:border-green-700 rounded-lg text-sm"
                        >
                          <option value="Cash">Cash</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="UPI">UPI</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Card">Card</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-green-700 dark:text-green-400 mb-1">Payment Date</label>
                        <input
                          type="date"
                          value={formData.payment_date}
                          onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-green-300 dark:border-green-700 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 px-4 py-3 rounded-xl bg-[#195de6] text-white font-bold hover:bg-[#1e40af] transition-colors">
                  Collect Fee
                </button>
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedFee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Record Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handlePayment} className="p-6 space-y-4">
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl">
                <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">{selectedFee.student_name}</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-slate-500">Total</p>
                    <p className="font-bold text-slate-900 dark:text-white">₹{selectedFee.amount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Paid</p>
                    <p className="font-bold text-green-600">₹{(selectedFee.paid_amount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Remaining</p>
                    <p className="font-bold text-amber-600">₹{(selectedFee.amount - (selectedFee.paid_amount || 0)).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Payment Amount *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="1"
                    max={selectedFee.amount - (selectedFee.paid_amount || 0)}
                    value={paymentData.paid_amount}
                    onChange={(e) => setPaymentData({ ...paymentData, paid_amount: e.target.value })}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Payment Method</label>
                  <select
                    value={paymentData.payment_method}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentData.payment_date}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 px-4 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-colors">
                  Process Payment
                </button>
                <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedFee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-900 p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Fee Details</h3>
              <button onClick={() => setShowDetailsModal(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Student Info */}
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase mb-3">Student Information</h4>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl space-y-2">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedFee.student_name}</p>
                  {selectedFee.father_name && <p className="text-sm text-slate-600 dark:text-slate-400">S/O {selectedFee.father_name}</p>}
                  {selectedFee.mobile && <p className="text-sm text-slate-600 dark:text-slate-400">Mobile: {selectedFee.mobile}</p>}
                  <p className="text-sm text-slate-600 dark:text-slate-400">Trade: {selectedFee.trade}</p>
                </div>
              </div>

              {/* Fee Info */}
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase mb-3">Fee Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                    <p className="text-sm text-slate-500">Total Amount</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">₹{selectedFee.amount?.toLocaleString()}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
                    <p className="text-sm text-green-600">Paid Amount</p>
                    <p className="text-xl font-bold text-green-600">₹{(selectedFee.paid_amount || 0).toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Status:</span>
                  {getStatusBadge(selectedFee.status)}
                </div>
                {selectedFee.invoice_number && (
                  <p className="mt-2 text-sm text-slate-500">Invoice: <span className="font-mono text-[#195de6]">{selectedFee.invoice_number}</span></p>
                )}
                {selectedFee.receipt_number && (
                  <p className="text-sm text-slate-500">Receipt: <span className="font-mono text-green-600">{selectedFee.receipt_number}</span></p>
                )}
              </div>

              {/* Installments */}
              {selectedFee.installments && selectedFee.installments.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-500 uppercase mb-3">Installments</h4>
                  <div className="space-y-2">
                    {selectedFee.installments.map((inst) => (
                      <div key={inst.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">Installment #{inst.installment_number}</p>
                          <p className="text-xs text-slate-500">Due: {inst.due_date || 'Not set'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">₹{inst.amount?.toLocaleString()}</p>
                          {getStatusBadge(inst.status)}
                        </div>
                        {inst.status !== 'Paid' && (
                          <button
                            onClick={() => {
                              setShowDetailsModal(false);
                              openPaymentModal(selectedFee, inst);
                            }}
                            className="ml-2 p-2 rounded-lg text-green-600 hover:bg-green-100"
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedFee.status !== 'Paid' && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    openPaymentModal(selectedFee);
                  }}
                  className="w-full py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-colors"
                >
                  Record Payment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Print Modal */}
      {showReceiptModal && selectedFee && (
        <>
          {/* Print-only styles */}
          <style>{`
            @media print {
              @page {
                size: A4;
                margin: 0;
              }
              body * {
                visibility: hidden;
              }
              .receipt-print, .receipt-print * {
                visibility: visible;
              }
              .receipt-print {
                position: absolute;
                left: 0;
                top: 0;
                width: 25%;
                max-width: 105mm;
                min-width: 90mm;
                background: white !important;
                font-family: 'Inter', sans-serif;
              }
              .receipts-grid {
                display: grid !important;
                grid-template-columns: 1fr 1fr !important;
                grid-template-rows: 1fr 1fr !important;
                width: 100% !important;
                height: 100vh !important;
                gap: 0 !important;
                page-break-inside: avoid !important;
              }
              .receipt-item {
                width: 50% !important;
                height: 50vh !important;
                page-break-inside: avoid !important;
                border: 1px solid #e2e8f0 !important;
                padding: 8px !important;
                box-sizing: border-box !important;
              }
              .receipt-print .receipt-container {
                box-shadow: none !important;
                border: 1px solid #e2e8f0 !important;
                margin: 0 auto !important;
                width: 100% !important;
                max-width: 100% !important;
                padding: 16px !important;
                background: white !important;
              }
              .receipt-print h1 {
                font-size: 1.25rem !important;
                margin-bottom: 4px !important;
              }
              .receipt-print .text-4xl,
              .receipt-print .text-5xl {
                font-size: 1.25rem !important;
              }
              .receipt-print .text-2xl {
                font-size: 1rem !important;
              }
              .receipt-print .text-lg {
                font-size: 1rem !important;
              }
              .receipt-print .font-bold {
                font-weight: 500 !important;
              }
              .receipt-print .font-semibold {
                font-weight: 500 !important;
              }
              .receipt-print .text-sm {
                font-size: 0.75rem !important;
              }
              .receipt-print .text-slate-700 {
                font-size: 0.8rem !important;
              }
              .receipt-print .text-xs {
                font-size: 0.6rem !important;
              }
              .receipt-print .text-\[10px\] {
                font-size: 0.5rem !important;
              }
              .receipt-print .text-9xl {
                font-size: 3rem !important;
              }
              .receipt-print .mb-10 {
                margin-bottom: 10px !important;
              }
              .receipt-print .mb-8 {
                margin-bottom: 8px !important;
              }
              .receipt-print .mb-12 {
                margin-bottom: 10px !important;
              }
              .receipt-print .p-6 {
                padding: 10px !important;
              }
              .receipt-print .p-8,
              .receipt-print .md\\:p-12 {
                padding: 12px !important;
              }
              .receipt-print .py-3 {
                padding-top: 4px !important;
                padding-bottom: 4px !important;
              }
              .receipt-print .py-4 {
                padding-top: 6px !important;
                padding-bottom: 6px !important;
              }
              .receipt-print .gap-4 {
                gap: 6px !important;
              }
              .receipt-print .gap-8 {
                gap: 8px !important;
              }
              .receipt-print .gap-x-8 {
                column-gap: 10px !important;
              }
              .receipt-print .gap-y-4 {
                row-gap: 6px !important;
              }
              .receipt-print .space-y-2 > * + * {
                margin-top: 4px !important;
              }
              .receipt-print .space-y-4 > * + * {
                margin-top: 8px !important;
              }
              .receipt-print .pt-4 {
                padding-top: 8px !important;
              }
              .receipt-print .mt-2 {
                margin-top: 4px !important;
              }
              .receipt-print table {
                font-size: 0.7rem !important;
              }
              .receipt-print .rounded-xl {
                border-radius: 0.375rem !important;
              }
              .receipt-print .rounded-lg {
                border-radius: 0.25rem !important;
              }
              .receipt-print .rounded-full {
                border-radius: 9999px !important;
              }
              .no-print {
                display: none !important;
              }
            }
            @media screen {
              .receipt-print {
                display: none;
              }
            }
          `}</style>

          {/* Screen Modal */}
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-slate-900 p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Fee Receipt</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-[#195de6] text-white rounded-lg font-semibold hover:bg-[#1e40af] transition-colors text-sm"
                  >
                    <Printer className="h-4 w-4 inline mr-2" />
                    Print
                  </button>
                  <button
                    onClick={() => {
                      setShowReceiptModal(false);
                      setSelectedFee(null);
                    }}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                {/* Receipt Preview - Exact Design Clone */}
                <div className="receipt-container bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-100 p-8 md:p-12 relative">
                  {/* Watermark */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03] select-none">
                    <h2 className="text-9xl transform -rotate-12" style={{ fontFamily: "'Playfair Display', serif" }}>MANER ITI</h2>
                  </div>

                  {/* Header */}
                  <div className="text-center mb-10">
                    <h1 className="text-4xl md:text-5xl text-[#1e3a8a] mb-2" style={{ fontFamily: "'Playfair Display', serif", fontWeight: '700' }}>{siteInfo.collegeName}</h1>
                    <p className="text-slate-500 uppercase tracking-widest text-sm font-semibold">Fee Payment Receipt</p>
                  </div>

                  {/* Divider */}
                  <div className="h-px w-full bg-slate-200 mb-8"></div>

                  {/* Receipt Details */}
                  <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <span className="font-medium">Receipt No:</span>
                        <span className="text-slate-900 font-bold">{selectedFee.receipt_number || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <span className="font-medium">Date:</span>
                        <span className="text-slate-900">
                          {selectedFee.payment_date 
                            ? new Date(selectedFee.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          }
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2 text-slate-500 text-sm">
                        <span className="font-medium">Payment Mode:</span>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">
                          {(selectedFee.payment_method || 'Cash').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Student Information Card */}
                  <div className="bg-slate-50 rounded-lg p-6 mb-8 border border-slate-100">
                    <div className="grid grid-cols-2 gap-y-3 gap-x-8">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Student Name</label>
                        <p className="text-sm font-medium text-slate-900">{selectedFee.student_name}</p>
                      </div>
                      {selectedFee.father_name && (
                        <div>
                          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Father's Name (S/O)</label>
                          <p className="text-sm text-slate-700">{selectedFee.father_name}</p>
                        </div>
                      )}
                      {selectedFee.mobile && (
                        <div>
                          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Mobile Number</label>
                          <p className="text-sm text-slate-700">+91 {selectedFee.mobile}</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Trade</label>
                        <p className="text-sm font-medium text-slate-700">{selectedFee.trade}</p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Table */}
                  <div className="mb-8">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="py-3 font-medium text-slate-500 text-sm">Description</th>
                          <th className="py-3 font-medium text-slate-500 text-sm text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-3 text-slate-700 text-sm">{selectedFee.fee_type}</td>
                          <td className="py-3 text-slate-900 text-sm text-right">₹{selectedFee.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-900">
                          <td className="py-3 text-base font-semibold text-slate-900">Total Paid</td>
                          <td className="py-3 text-lg font-semibold text-[#1e3a8a] text-right">₹{(selectedFee.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        {(selectedFee.amount - (selectedFee.paid_amount || 0)) > 0 && (
                          <tr>
                            <td className="py-2 text-sm font-medium text-red-600">Due Balance</td>
                            <td className="py-2 text-sm font-semibold text-red-600 text-right">₹{(selectedFee.amount - (selectedFee.paid_amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        )}
                      </tfoot>
                    </table>
                  </div>

                  {/* Divider */}
                  <div className="h-px w-full bg-slate-200 mb-8"></div>

                  {/* Footer */}
                  <div className="text-center space-y-4">
                    <div className="text-slate-600 text-sm leading-relaxed max-w-lg mx-auto">
                      <p className="font-medium">{siteInfo.address}</p>
                      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                        <span className="flex items-center gap-1">
                          <span>📞</span>
                          {siteInfo.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <span>✉</span>
                          {siteInfo.email}
                        </span>
                      </div>
                    </div>
                    <div className="pt-4" style={{ paddingTop: '8px' }}>
                      <p className="text-[10px] text-slate-400 italic uppercase tracking-widest">Computer-generated receipt - No signature required</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Printable Receipt - Exact Clone Design */}
          <div className="receipt-print">
            <div className="receipt-container bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-100 p-8 md:p-12" style={{ fontFamily: "'Inter', sans-serif", position: 'relative' }}>
              {/* Watermark */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03] select-none" style={{ pointerEvents: 'none', position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.03, userSelect: 'none' }}>
                <h2 className="text-9xl transform -rotate-12" style={{ fontFamily: "'Playfair Display', serif", fontSize: '144px', transform: 'rotate(-12deg)', fontWeight: '700' }}>MANER ITI</h2>
              </div>

              {/* Header */}
              <div className="text-center mb-10" style={{ marginBottom: '10px', textAlign: 'center' }}>
                <h1 className="font-display text-4xl md:text-5xl text-primary mb-2" style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: '#1e3a8a', marginBottom: '4px', fontWeight: '700' }}>{siteInfo.collegeName}</h1>
                <p className="text-slate-500 uppercase tracking-widest text-sm font-semibold" style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.875rem', fontWeight: '600' }}>Fee Payment Receipt</p>
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-slate-200 mb-8" style={{ height: '1px', width: '100%', backgroundColor: '#e2e8f0', marginBottom: '8px' }}></div>

              {/* Receipt Details */}
              <div className="grid grid-cols-2 gap-4 mb-10" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <span className="font-medium" style={{ fontWeight: '500' }}>Receipt No:</span>
                    <span className="text-slate-900 font-bold" style={{ color: '#0f172a', fontWeight: '700' }}>{selectedFee.receipt_number || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <span className="font-medium" style={{ fontWeight: '500' }}>Date:</span>
                    <span className="text-slate-900" style={{ color: '#0f172a' }}>
                      {selectedFee.payment_date 
                        ? new Date(selectedFee.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      }
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2 text-slate-500 text-sm">
                    <span className="font-medium" style={{ fontWeight: '500' }}>Payment Mode:</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider" style={{ padding: '4px 12px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {(selectedFee.payment_method || 'Cash').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Student Information Card */}
              <div className="bg-slate-50 rounded-lg p-6 mb-10 border border-slate-100" style={{ backgroundColor: '#f8fafc', borderRadius: '0.5rem', padding: '12px', marginBottom: '10px', border: '1px solid #e2e8f0' }}>
                <div className="grid grid-cols-2 gap-y-4 gap-x-8" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '500', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Student Name</label>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#0f172a' }}>{selectedFee.student_name}</p>
                  </div>
                  {selectedFee.father_name && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '500', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Father's Name (S/O)</label>
                      <p style={{ color: '#334155', fontSize: '0.875rem', fontWeight: '400' }}>{selectedFee.father_name}</p>
                    </div>
                  )}
                  {selectedFee.mobile && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '500', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Mobile Number</label>
                      <p style={{ color: '#334155', fontSize: '0.875rem', fontWeight: '400' }}>+91 {selectedFee.mobile}</p>
                    </div>
                  )}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: '500', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Trade</label>
                    <p style={{ color: '#334155', fontWeight: '500', fontSize: '0.875rem' }}>{selectedFee.trade}</p>
                  </div>
                </div>
              </div>

              {/* Payment Table */}
              <div className="mb-12" style={{ marginBottom: '10px' }}>
                <table className="w-full text-left" style={{ width: '100%', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px 0', fontWeight: '500', color: '#64748b', fontSize: '0.8rem' }}>Description</th>
                      <th style={{ padding: '8px 0', fontWeight: '500', color: '#64748b', textAlign: 'right', fontSize: '0.8rem' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '10px 0', color: '#334155', fontSize: '0.85rem' }}>{selectedFee.fee_type}</td>
                      <td style={{ padding: '10px 0', color: '#0f172a', textAlign: 'right', fontSize: '0.85rem' }}>₹{selectedFee.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #0f172a' }}>
                      <td style={{ padding: '10px 0', fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>Total Paid</td>
                      <td style={{ padding: '10px 0', fontSize: '1.1rem', fontWeight: '600', color: '#1e3a8a', textAlign: 'right' }}>₹{(selectedFee.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    {(selectedFee.amount - (selectedFee.paid_amount || 0)) > 0 && (
                      <tr>
                        <td style={{ padding: '4px 0', fontSize: '0.8rem', fontWeight: '500', color: '#dc2626' }}>Due Balance</td>
                        <td style={{ padding: '4px 0', fontSize: '0.85rem', fontWeight: '600', color: '#dc2626', textAlign: 'right' }}>₹{(selectedFee.amount - (selectedFee.paid_amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>

              {/* Divider */}
              <div className="h-px w-full bg-slate-200 mb-8" style={{ height: '1px', width: '100%', backgroundColor: '#e2e8f0', marginBottom: '8px' }}></div>

              {/* Footer */}
              <div className="text-center space-y-4" style={{ textAlign: 'center' }}>
                <div className="text-slate-600 text-sm leading-relaxed max-w-lg mx-auto" style={{ color: '#475569', fontSize: '0.875rem', lineHeight: '1.4', maxWidth: '32rem', margin: '0 auto' }}>
                  <p className="font-medium" style={{ fontWeight: '500' }}>{siteInfo.address}</p>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px 12px', marginTop: '4px' }}>
                    <span className="flex items-center gap-1" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '16px' }}>📞</span>
                      {siteInfo.phone}
                    </span>
                    <span className="flex items-center gap-1" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '16px' }}>✉</span>
                      {siteInfo.email}
                    </span>
                  </div>
                </div>
                <div className="pt-4" style={{ paddingTop: '16px' }}>
                  <p className="text-[10px] text-slate-400 italic uppercase tracking-widest" style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Computer-generated receipt - No signature required</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Multiple Receipts Modal */}
      {showMultipleReceiptsModal && multipleReceipts.length > 0 && (
        <>
          {/* Print-only styles for multiple receipts */}
          <style>{`
            @media print {
              @page {
                size: A4;
                margin: 0;
              }
              body * {
                visibility: hidden;
              }
              .receipts-print, .receipts-print * {
                visibility: visible;
              }
              .receipts-print {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white !important;
                font-family: 'Inter', sans-serif;
              }
              .receipts-grid {
                display: grid !important;
                grid-template-columns: repeat(2, 1fr) !important;
                grid-template-rows: repeat(2, 1fr) !important;
                width: 100% !important;
                height: 100vh !important;
                gap: 2mm !important;
                padding: 2mm !important;
                page-break-inside: avoid !important;
                box-sizing: border-box !important;
              }
              .receipt-item {
                width: 100% !important;
                height: 100% !important;
                page-break-inside: avoid !important;
                border: 1px solid #e2e8f0 !important;
                padding: 4mm !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
                position: relative !important;
              }
              .receipt-item .receipt-container {
                box-shadow: none !important;
                border: 1px solid #e2e8f0 !important;
                margin: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                padding: 8px !important;
                background: white !important;
                height: 100% !important;
                font-size: 0.65rem !important;
              }
              .receipt-item h1 {
                font-size: 0.9rem !important;
                margin-bottom: 2px !important;
              }
              .receipt-item .text-4xl,
              .receipt-item .text-5xl {
                font-size: 0.9rem !important;
              }
              .receipt-item .text-2xl {
                font-size: 0.75rem !important;
              }
              .receipt-item .text-lg {
                font-size: 0.7rem !important;
              }
              .receipt-item .text-sm {
                font-size: 0.6rem !important;
              }
              .receipt-item .text-xs {
                font-size: 0.5rem !important;
              }
              .receipt-item .text-\[10px\] {
                font-size: 0.45rem !important;
              }
              .receipt-item .text-9xl {
                font-size: 2rem !important;
              }
              .receipt-item .mb-10 {
                margin-bottom: 6px !important;
              }
              .receipt-item .mb-8 {
                margin-bottom: 4px !important;
              }
              .receipt-item .mb-12 {
                margin-bottom: 6px !important;
              }
              .receipt-item .p-6 {
                padding: 6px !important;
              }
              .receipt-item .p-8 {
                padding: 8px !important;
              }
              .receipt-item .py-3 {
                padding-top: 2px !important;
                padding-bottom: 2px !important;
              }
              .receipt-item .py-4 {
                padding-top: 4px !important;
                padding-bottom: 4px !important;
              }
              .receipt-item .gap-4 {
                gap: 4px !important;
              }
              .receipt-item .gap-8 {
                gap: 6px !important;
              }
              .receipt-item .gap-x-8 {
                column-gap: 6px !important;
              }
              .receipt-item .gap-y-4 {
                row-gap: 4px !important;
              }
              .receipt-item .space-y-2 > * + * {
                margin-top: 2px !important;
              }
              .receipt-item .space-y-4 > * + * {
                margin-top: 4px !important;
              }
              .receipt-item table {
                font-size: 0.6rem !important;
              }
              .no-print {
                display: none !important;
              }
            }
            @media screen {
              .receipts-print {
                display: none;
              }
            }
          `}</style>

          {/* Screen Modal */}
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-slate-900 p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Multiple Receipts ({multipleReceipts.length} payments from last 7 days)
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm"
                  >
                    <Printer className="h-4 w-4 inline mr-2" />
                    Print All
                  </button>
                  <button
                    onClick={() => {
                      setShowMultipleReceiptsModal(false);
                      setMultipleReceipts([]);
                    }}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-600 mb-4">
                  {multipleReceipts.length} receipts will be printed on A4 page (4 per page)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {multipleReceipts.slice(0, 4).map((fee, index) => (
                    <div key={fee.id} className="border border-slate-200 rounded-lg p-4">
                      <p className="text-xs text-slate-500 mb-2">Receipt {index + 1}</p>
                      <p className="text-sm font-semibold">{fee.student_name}</p>
                      <p className="text-xs text-slate-600">₹{(fee.paid_amount || 0).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Printable Multiple Receipts - 4 per A4 page */}
          <div className="receipts-print">
            {Array.from({ length: Math.ceil(multipleReceipts.length / 4) }).map((_, pageIndex) => (
              <div key={pageIndex} className="receipts-grid" style={{ pageBreakAfter: pageIndex < Math.ceil(multipleReceipts.length / 4) - 1 ? 'always' : 'auto' }}>
                {multipleReceipts.slice(pageIndex * 4, (pageIndex + 1) * 4).map((fee, index) => (
                <div key={fee.id} className="receipt-item">
                  <div className="receipt-container bg-white rounded-lg overflow-hidden border border-slate-100 relative" style={{ fontFamily: "'Inter', sans-serif", position: 'relative', height: '100%' }}>
                    {/* Watermark */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.02] select-none">
                      <h2 className="text-9xl transform -rotate-12" style={{ fontFamily: "'Playfair Display', serif" }}>MANER ITI</h2>
                    </div>

                    {/* Header */}
                    <div className="text-center mb-10" style={{ marginBottom: '6px', textAlign: 'center' }}>
                      <h1 className="text-4xl text-[#1e3a8a] mb-2" style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.9rem', color: '#1e3a8a', marginBottom: '2px', fontWeight: '700' }}>{siteInfo.collegeName}</h1>
                      <p className="text-slate-500 uppercase tracking-widest text-sm font-semibold" style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.6rem', fontWeight: '600' }}>Fee Payment Receipt</p>
                    </div>

                    {/* Divider */}
                    <div className="h-px w-full bg-slate-200 mb-8" style={{ height: '1px', width: '100%', backgroundColor: '#e2e8f0', marginBottom: '4px' }}></div>

                    {/* Receipt Details */}
                    <div className="grid grid-cols-2 gap-4 mb-10" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '6px' }}>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <span className="font-medium" style={{ fontWeight: '500', fontSize: '0.6rem' }}>Receipt No:</span>
                          <span className="text-slate-900 font-bold" style={{ color: '#0f172a', fontWeight: '700', fontSize: '0.6rem' }}>{fee.receipt_number || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <span className="font-medium" style={{ fontWeight: '500', fontSize: '0.6rem' }}>Date:</span>
                          <span className="text-slate-900" style={{ color: '#0f172a', fontSize: '0.6rem' }}>
                            {fee.payment_date 
                              ? new Date(fee.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                              : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            }
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2 text-slate-500 text-sm">
                          <span className="font-medium" style={{ fontWeight: '500', fontSize: '0.6rem' }}>Payment:</span>
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase" style={{ padding: '2px 8px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '9999px', fontSize: '0.5rem', fontWeight: '700', textTransform: 'uppercase' }}>
                            {(fee.payment_method || 'Cash').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Student Information */}
                    <div className="bg-slate-50 rounded-lg p-6 mb-10 border border-slate-100" style={{ backgroundColor: '#f8fafc', borderRadius: '0.5rem', padding: '6px', marginBottom: '6px', border: '1px solid #e2e8f0' }}>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-8" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 6px' }}>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1" style={{ fontSize: '0.5rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Student Name</label>
                          <p className="text-lg font-semibold text-slate-900" style={{ fontSize: '0.7rem', fontWeight: '600', color: '#0f172a' }}>{fee.student_name}</p>
                        </div>
                        {fee.father_name && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1" style={{ fontSize: '0.5rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Father's Name</label>
                            <p className="text-slate-700" style={{ color: '#334155', fontSize: '0.6rem' }}>{fee.father_name}</p>
                          </div>
                        )}
                        {fee.mobile && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1" style={{ fontSize: '0.5rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Mobile</label>
                            <p className="text-slate-700" style={{ color: '#334155', fontSize: '0.6rem' }}>+91 {fee.mobile}</p>
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1" style={{ fontSize: '0.5rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Trade</label>
                          <p className="text-slate-700 font-medium" style={{ color: '#334155', fontWeight: '500', fontSize: '0.6rem' }}>{fee.trade}</p>
                        </div>
                      </div>
                    </div>

                    {/* Payment Table */}
                    <div className="mb-12" style={{ marginBottom: '6px' }}>
                      <table className="w-full text-left" style={{ width: '100%', textAlign: 'left', fontSize: '0.6rem' }}>
                        <thead>
                          <tr className="border-b border-slate-200" style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <th className="py-3 font-semibold text-slate-500" style={{ padding: '2px 0', fontWeight: '600', color: '#64748b', fontSize: '0.6rem' }}>Description</th>
                            <th className="py-3 font-semibold text-slate-500 text-right" style={{ padding: '2px 0', fontWeight: '600', color: '#64748b', textAlign: 'right', fontSize: '0.6rem' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-4 text-slate-700" style={{ padding: '4px 0', color: '#334155', fontSize: '0.6rem' }}>{fee.fee_type}</td>
                            <td className="py-4 text-slate-900 text-right" style={{ padding: '4px 0', color: '#0f172a', textAlign: 'right', fontSize: '0.6rem' }}>₹{fee.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>
                          </tr>
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-slate-900" style={{ borderTop: '2px solid #0f172a' }}>
                            <td className="py-4 text-lg font-bold text-slate-900" style={{ padding: '4px 0', fontSize: '0.7rem', fontWeight: '700', color: '#0f172a' }}>Paid Amount</td>
                            <td className="py-4 text-2xl font-bold text-[#1e3a8a] text-right" style={{ padding: '4px 0', fontSize: '0.8rem', fontWeight: '700', color: '#1e3a8a', textAlign: 'right' }}>₹{(fee.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Footer */}
                    <div className="text-center space-y-4" style={{ textAlign: 'center' }}>
                      <div className="text-slate-600 text-sm leading-relaxed" style={{ color: '#475569', fontSize: '0.5rem', lineHeight: '1.3' }}>
                        <p className="font-medium" style={{ fontWeight: '500' }}>{siteInfo.address}</p>
                        <div className="flex flex-wrap justify-center gap-x-2 gap-y-0.5 mt-1" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 8px', marginTop: '2px' }}>
                          <span className="flex items-center gap-0.5" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <span style={{ fontSize: '10px' }}>📞</span>
                            <span style={{ fontSize: '0.5rem' }}>{siteInfo.phone}</span>
                          </span>
                          <span className="flex items-center gap-0.5" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <span style={{ fontSize: '10px' }}>✉</span>
                            <span style={{ fontSize: '0.5rem' }}>{siteInfo.email}</span>
                          </span>
                        </div>
                      </div>
                      <div className="pt-2" style={{ paddingTop: '4px' }}>
                        <p className="text-[10px] text-slate-400 italic uppercase tracking-widest" style={{ fontSize: '0.45rem', color: '#94a3b8', fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Computer-generated receipt</p>
                      </div>
                    </div>
                  </div>
                </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default FeeManagement;
