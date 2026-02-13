import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Phone,
  Armchair,
  Lock
} from 'lucide-react';
import {
  getLibraryStudents,
  createLibraryStudent,
  updateLibraryStudent,
  deleteLibraryStudent,
  getLibrarySeats,
  getLibraryLockers
} from '../../services/api';
import { toast } from 'react-hot-toast';

const LibraryStudents = () => {
  const [students, setStudents] = useState([]);
  const [availableSeats, setAvailableSeats] = useState([]);
  const [availableLockers, setAvailableLockers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    whatsapp_number: '',
    has_whatsapp: true,
    seat_number: '',
    locker_number: '',
    admission_date: new Date().toISOString().split('T')[0],
    monthly_fee: '',
    next_due_date: '',
    admission_fee: '',
    advance_paid: ''
  });

  useEffect(() => {
    fetchStudents();
    fetchSeatsAndLockers();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await getLibraryStudents({ search: searchTerm });
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchSeatsAndLockers = async () => {
    try {
      const [seatsRes, lockersRes] = await Promise.all([
        getLibrarySeats(),
        getLibraryLockers()
      ]);
      setAvailableSeats(seatsRes.data.filter(s => s.status === 'Available'));
      setAvailableLockers(lockersRes.data.filter(l => l.status === 'Available'));
    } catch (error) {
      console.error('Error fetching seats/lockers:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  const openModal = (student = null) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        name: student.name || '',
        mobile: student.mobile || '',
        whatsapp_number: student.whatsapp_number || '',
        has_whatsapp: student.has_whatsapp === 1,
        seat_number: student.seat_number || '',
        locker_number: student.locker_number || '',
        admission_date: student.admission_date || '',
        monthly_fee: student.monthly_fee || '',
        next_due_date: student.next_due_date || '',
        admission_fee: student.admission_fee || '',
        advance_paid: student.advance_paid || ''
      });
    } else {
      setEditingStudent(null);
      setFormData({
        name: '',
        mobile: '',
        whatsapp_number: '',
        has_whatsapp: true,
        seat_number: '',
        locker_number: '',
        admission_date: new Date().toISOString().split('T')[0],
        monthly_fee: '',
        next_due_date: '',
        admission_fee: '',
        advance_paid: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStudent(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.mobile) {
      toast.error('Name and mobile are required');
      return;
    }

    try {
      const data = {
        ...formData,
        seat_number: formData.seat_number || null,
        locker_number: formData.locker_number || null,
        monthly_fee: parseFloat(formData.monthly_fee) || 0,
        admission_fee: parseFloat(formData.admission_fee) || 0,
        advance_paid: parseFloat(formData.advance_paid) || 0
      };

      if (editingStudent) {
        await updateLibraryStudent(editingStudent.id, data);
        toast.success('Student updated successfully');
      } else {
        await createLibraryStudent(data);
        toast.success('Student added successfully');
      }

      closeModal();
      fetchStudents();
      fetchSeatsAndLockers();
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error(error.response?.data?.message || 'Failed to save student');
    }
  };

  const handleDelete = async (student) => {
    if (!window.confirm(`Are you sure you want to delete ${student.name}?`)) {
      return;
    }

    try {
      await deleteLibraryStudent(student.id);
      toast.success('Student deleted successfully');
      fetchStudents();
      fetchSeatsAndLockers();
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Students</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage library members</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-[#195de6] text-white rounded-lg hover:bg-[#1550c9] transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Student
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, mobile, or seat number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6] focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#195de6]"></div>
          </div>
        ) : students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr className="text-left text-sm text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-4 font-medium">Name</th>
                  <th className="px-4 py-4 font-medium">Mobile</th>
                  <th className="px-4 py-4 font-medium">Seat</th>
                  <th className="px-4 py-4 font-medium">Adm. Fee</th>
                  <th className="px-4 py-4 font-medium">Monthly</th>
                  <th className="px-4 py-4 font-medium">Advance</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-[#195de6]/10 flex items-center justify-center text-[#195de6] font-bold text-sm">
                          {student.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white text-sm">{student.name}</p>
                          {student.has_whatsapp === 1 && (
                            <span className="text-xs text-green-600">WhatsApp</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <a href={`tel:${student.mobile}`} className="text-sm text-slate-600 dark:text-slate-300 hover:text-[#195de6]">
                        {student.mobile}
                      </a>
                    </td>
                    <td className="px-4 py-4">
                      {student.seat_number ? (
                        <span className="text-sm text-slate-900 dark:text-white">#{student.seat_number}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-slate-900 dark:text-white">
                      {formatCurrency(student.admission_fee || 0)}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-slate-900 dark:text-white">
                      {formatCurrency(student.monthly_fee)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-sm font-medium ${
                        student.advance_paid >= student.monthly_fee
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-orange-500 dark:text-orange-400'
                      }`}>
                        {formatCurrency(student.advance_paid || 0)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        student.fee_status === 'Paid'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {student.fee_status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openModal(student)}
                          className="p-1.5 text-slate-500 hover:text-[#195de6] hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(student)}
                          className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
        ) : (
          <div className="text-center py-12">
            <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Search className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400">No students found</p>
            <button
              onClick={() => openModal()}
              className="mt-4 text-[#195de6] hover:underline"
            >
              Add your first student
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingStudent ? 'Edit Student' : 'Add New Student'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6] focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsapp_number}
                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                    placeholder="Same as mobile"
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="has_whatsapp"
                  checked={formData.has_whatsapp}
                  onChange={(e) => setFormData({ ...formData, has_whatsapp: e.target.checked })}
                  className="h-4 w-4 text-[#195de6] border-slate-300 rounded focus:ring-[#195de6]"
                />
                <label htmlFor="has_whatsapp" className="text-sm text-slate-700 dark:text-slate-300">
                  Has WhatsApp on this number
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Seat Number
                  </label>
                  <select
                    value={formData.seat_number}
                    onChange={(e) => setFormData({ ...formData, seat_number: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6] focus:border-transparent"
                  >
                    <option value="">Select Seat</option>
                    {editingStudent?.seat_number && (
                      <option value={editingStudent.seat_number}>
                        #{editingStudent.seat_number} (Current)
                      </option>
                    )}
                    {availableSeats.map((seat) => (
                      <option key={seat.id} value={seat.seat_number}>
                        Seat #{seat.seat_number}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Locker Number
                  </label>
                  <select
                    value={formData.locker_number}
                    onChange={(e) => setFormData({ ...formData, locker_number: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6] focus:border-transparent"
                  >
                    <option value="">Select Locker</option>
                    {editingStudent?.locker_number && (
                      <option value={editingStudent.locker_number}>
                        #{editingStudent.locker_number} (Current)
                      </option>
                    )}
                    {availableLockers.map((locker) => (
                      <option key={locker.id} value={locker.locker_number}>
                        Locker #{locker.locker_number}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Admission Date
                  </label>
                  <input
                    type="date"
                    value={formData.admission_date}
                    onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Fee
                  </label>
                  <input
                    type="number"
                    value={formData.monthly_fee}
                    onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                    placeholder="500"
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Admission Fee
                  </label>
                  <input
                    type="number"
                    value={formData.admission_fee}
                    onChange={(e) => setFormData({ ...formData, admission_fee: e.target.value })}
                    placeholder="1000"
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Advance Paid
                  </label>
                  <input
                    type="number"
                    value={formData.advance_paid}
                    onChange={(e) => setFormData({ ...formData, advance_paid: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Next Due Date
                </label>
                <input
                  type="date"
                  value={formData.next_due_date}
                  onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#195de6] focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#195de6] text-white rounded-lg hover:bg-[#1550c9] transition-colors"
                >
                  {editingStudent ? 'Update Student' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryStudents;
