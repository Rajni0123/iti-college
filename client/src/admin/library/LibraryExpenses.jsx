import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Receipt, Calendar } from 'lucide-react';
import { getLibraryExpenses, createLibraryExpense, updateLibraryExpense, deleteLibraryExpense } from '../../services/api';
import { toast } from 'react-hot-toast';

const LibraryExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [formData, setFormData] = useState({
    expense_type: 'fixed',
    expense_name: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const expenseCategories = {
    fixed: ['WiFi Bill', 'Electricity Bill', 'Room Rent', 'Other Fixed'],
    variable: ['Cleaning', 'Repair', 'Maintenance', 'Supplies', 'Other']
  };

  useEffect(() => {
    fetchExpenses();
  }, [filterType]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterType) params.expense_type = filterType;
      const response = await getLibraryExpenses(params);
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        expense_type: expense.expense_type || 'fixed',
        expense_name: expense.expense_name || '',
        amount: expense.amount || '',
        date: expense.date || new Date().toISOString().split('T')[0],
        notes: expense.notes || ''
      });
    } else {
      setEditingExpense(null);
      setFormData({
        expense_type: 'fixed',
        expense_name: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingExpense(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.expense_name || !formData.amount || !formData.date) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (editingExpense) {
        await updateLibraryExpense(editingExpense.id, formData);
        toast.success('Expense updated successfully');
      } else {
        await createLibraryExpense(formData);
        toast.success('Expense added successfully');
      }
      closeModal();
      fetchExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    }
  };

  const handleDelete = async (expense) => {
    if (!window.confirm(`Delete expense "${expense.expense_name}"?`)) return;

    try {
      await deleteLibraryExpense(expense.id);
      toast.success('Expense deleted');
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const fixedTotal = expenses.filter(e => e.expense_type === 'fixed').reduce((sum, e) => sum + (e.amount || 0), 0);
  const variableTotal = expenses.filter(e => e.expense_type === 'variable').reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Expenses</h2>
          <p className="text-slate-500 dark:text-slate-400">Track library expenses</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-[#195de6] text-white rounded-lg hover:bg-[#1550c9] transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Expense
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500">Total Expenses</p>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500">Fixed Expenses</p>
          <p className="text-2xl font-bold text-orange-500">{formatCurrency(fixedTotal)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500">Variable Expenses</p>
          <p className="text-2xl font-bold text-purple-500">{formatCurrency(variableTotal)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterType('')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterType === '' ? 'bg-[#195de6] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterType('fixed')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterType === 'fixed' ? 'bg-[#195de6] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          Fixed
        </button>
        <button
          onClick={() => setFilterType('variable')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterType === 'variable' ? 'bg-[#195de6] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          Variable
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#195de6]"></div>
          </div>
        ) : expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr className="text-left text-sm text-slate-500 dark:text-slate-400">
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Added By</th>
                  <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {new Date(expense.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        expense.expense_type === 'fixed'
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {expense.expense_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {expense.expense_name}
                    </td>
                    <td className="px-6 py-4 font-medium text-red-500">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {expense.added_by}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openModal(expense)}
                          className="p-2 text-slate-500 hover:text-[#195de6] hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense)}
                          className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
        ) : (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">No expenses found</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingExpense ? 'Edit Expense' : 'Add Expense'}
              </h3>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Expense Type *
                </label>
                <select
                  value={formData.expense_type}
                  onChange={(e) => setFormData({ ...formData, expense_type: e.target.value, expense_name: '' })}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6]"
                >
                  <option value="fixed">Fixed Expense</option>
                  <option value="variable">Variable Expense</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Expense Name *
                </label>
                <select
                  value={formData.expense_name}
                  onChange={(e) => setFormData({ ...formData, expense_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6]"
                  required
                >
                  <option value="">Select...</option>
                  {expenseCategories[formData.expense_type].map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#195de6] text-white rounded-lg hover:bg-[#1550c9]"
                >
                  {editingExpense ? 'Update' : 'Add'} Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryExpenses;
