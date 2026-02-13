import { useState, useEffect } from 'react';
import { Armchair, Lock, X, Phone, User } from 'lucide-react';
import { getLibrarySeats, getLibraryLockers, releaseLibrarySeat, releaseLibraryLocker } from '../../services/api';
import { toast } from 'react-hot-toast';

const LibrarySeatMap = () => {
  const [seats, setSeats] = useState([]);
  const [lockers, setLockers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [selectedLocker, setSelectedLocker] = useState(null);
  const [activeTab, setActiveTab] = useState('seats');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [seatsRes, lockersRes] = await Promise.all([
        getLibrarySeats(),
        getLibraryLockers()
      ]);
      setSeats(seatsRes.data);
      setLockers(lockersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load seat map');
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseSeat = async (seat) => {
    if (!window.confirm(`Release seat #${seat.seat_number} from ${seat.student_name}?`)) {
      return;
    }

    try {
      await releaseLibrarySeat(seat.id);
      toast.success('Seat released successfully');
      setSelectedSeat(null);
      fetchData();
    } catch (error) {
      console.error('Error releasing seat:', error);
      toast.error('Failed to release seat');
    }
  };

  const handleReleaseLocker = async (locker) => {
    if (!window.confirm(`Release locker #${locker.locker_number} from ${locker.student_name}?`)) {
      return;
    }

    try {
      await releaseLibraryLocker(locker.id);
      toast.success('Locker released successfully');
      setSelectedLocker(null);
      fetchData();
    } catch (error) {
      console.error('Error releasing locker:', error);
      toast.error('Failed to release locker');
    }
  };

  const occupiedSeats = seats.filter(s => s.status === 'Occupied').length;
  const availableSeats = seats.filter(s => s.status === 'Available').length;
  const occupiedLockers = lockers.filter(l => l.status === 'Occupied').length;
  const availableLockers = lockers.filter(l => l.status === 'Available').length;

  // Create 17x10 grid for seats
  const seatRows = [];
  for (let row = 0; row < 17; row++) {
    const rowSeats = [];
    for (let col = 0; col < 10; col++) {
      const seatNumber = row * 10 + col + 1;
      if (seatNumber <= 170) {
        const seat = seats.find(s => s.seat_number === seatNumber);
        rowSeats.push(seat || { seat_number: seatNumber, status: 'Available' });
      }
    }
    seatRows.push(rowSeats);
  }

  // Create 5x10 grid for lockers
  const lockerRows = [];
  for (let row = 0; row < 5; row++) {
    const rowLockers = [];
    for (let col = 0; col < 10; col++) {
      const lockerNumber = row * 10 + col + 1;
      if (lockerNumber <= 50) {
        const locker = lockers.find(l => l.locker_number === lockerNumber);
        rowLockers.push(locker || { locker_number: lockerNumber, status: 'Available' });
      }
    }
    lockerRows.push(rowLockers);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#195de6]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Seats & Lockers</h2>
          <p className="text-slate-500 dark:text-slate-400">Visual seat and locker allocation map</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-green-500"></div>
            <span className="text-sm text-slate-600 dark:text-slate-400">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-red-500"></div>
            <span className="text-sm text-slate-600 dark:text-slate-400">Occupied</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Seats</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{seats.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">Available Seats</p>
          <p className="text-2xl font-bold text-green-600">{availableSeats}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Lockers</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{lockers.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">Available Lockers</p>
          <p className="text-2xl font-bold text-green-600">{availableLockers}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('seats')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'seats'
              ? 'bg-[#195de6] text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Armchair className="h-5 w-5" />
          Seats ({occupiedSeats}/{seats.length})
        </button>
        <button
          onClick={() => setActiveTab('lockers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'lockers'
              ? 'bg-[#195de6] text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Lock className="h-5 w-5" />
          Lockers ({occupiedLockers}/{lockers.length})
        </button>
      </div>

      {/* Seat Map */}
      {activeTab === 'seats' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="overflow-x-auto">
            <div className="min-w-fit">
              {/* Column Headers */}
              <div className="flex gap-2 mb-2 pl-8">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((col) => (
                  <div key={col} className="w-10 h-6 flex items-center justify-center text-xs font-medium text-slate-500">
                    {col}
                  </div>
                ))}
              </div>

              {/* Seat Grid */}
              {seatRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-2 mb-2">
                  {/* Row Label */}
                  <div className="w-6 h-10 flex items-center justify-center text-xs font-medium text-slate-500">
                    {String.fromCharCode(65 + rowIndex)}
                  </div>

                  {/* Seats */}
                  {row.map((seat) => (
                    <button
                      key={seat.seat_number}
                      onClick={() => seat.status === 'Occupied' && setSelectedSeat(seat)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                        seat.status === 'Occupied'
                          ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'
                          : 'bg-green-500 text-white cursor-default'
                      }`}
                      title={seat.status === 'Occupied' ? `${seat.student_name} - Click for details` : `Seat #${seat.seat_number} - Available`}
                    >
                      {seat.seat_number}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Locker Map */}
      {activeTab === 'lockers' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="overflow-x-auto">
            <div className="min-w-fit">
              {/* Column Headers */}
              <div className="flex gap-2 mb-2 pl-8">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((col) => (
                  <div key={col} className="w-12 h-6 flex items-center justify-center text-xs font-medium text-slate-500">
                    {col}
                  </div>
                ))}
              </div>

              {/* Locker Grid */}
              {lockerRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-2 mb-2">
                  {/* Row Label */}
                  <div className="w-6 h-12 flex items-center justify-center text-xs font-medium text-slate-500">
                    {rowIndex + 1}
                  </div>

                  {/* Lockers */}
                  {row.map((locker) => (
                    <button
                      key={locker.locker_number}
                      onClick={() => locker.status === 'Occupied' && setSelectedLocker(locker)}
                      className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all ${
                        locker.status === 'Occupied'
                          ? 'bg-orange-500 text-white hover:bg-orange-600 cursor-pointer'
                          : 'bg-green-500 text-white cursor-default'
                      }`}
                      title={locker.status === 'Occupied' ? `${locker.student_name} - Click for details` : `Locker #${locker.locker_number} - Available`}
                    >
                      <Lock className="h-4 w-4" />
                      {locker.locker_number}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Seat Detail Modal */}
      {selectedSeat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Seat #{selectedSeat.seat_number}
              </h3>
              <button
                onClick={() => setSelectedSeat(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[#195de6]/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-[#195de6]" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedSeat.student_name}</p>
                  <p className="text-sm text-slate-500">Student</p>
                </div>
              </div>

              {selectedSeat.student_mobile && (
                <a
                  href={`tel:${selectedSeat.student_mobile}`}
                  className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-[#195de6]"
                >
                  <Phone className="h-4 w-4" />
                  {selectedSeat.student_mobile}
                </a>
              )}

              <button
                onClick={() => handleReleaseSeat(selectedSeat)}
                className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Release Seat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Locker Detail Modal */}
      {selectedLocker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Locker #{selectedLocker.locker_number}
              </h3>
              <button
                onClick={() => setSelectedLocker(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <User className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedLocker.student_name}</p>
                  <p className="text-sm text-slate-500">Student</p>
                </div>
              </div>

              {selectedLocker.student_mobile && (
                <a
                  href={`tel:${selectedLocker.student_mobile}`}
                  className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-[#195de6]"
                >
                  <Phone className="h-4 w-4" />
                  {selectedLocker.student_mobile}
                </a>
              )}

              <button
                onClick={() => handleReleaseLocker(selectedLocker)}
                className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Release Locker
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibrarySeatMap;
