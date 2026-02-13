const { getDb } = require('../database/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = getDb();

// ========================================
// DASHBOARD
// ========================================

exports.getDashboard = (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const stats = {};

  // Get today's collection
  db.get(
    `SELECT COALESCE(SUM(amount), 0) as today_collection FROM library_fees
     WHERE DATE(payment_date) = DATE(?)`,
    [today],
    (err, row) => {
      if (err) return res.status(500).json({ message: 'Error fetching stats', error: err.message });
      stats.today_collection = row?.today_collection || 0;

      // Get monthly collection
      db.get(
        `SELECT COALESCE(SUM(amount), 0) as monthly_collection FROM library_fees
         WHERE month = ? AND year = ?`,
        [currentMonth.toString(), currentYear],
        (err, row) => {
          if (err) return res.status(500).json({ message: 'Error fetching stats', error: err.message });
          stats.monthly_collection = row?.monthly_collection || 0;

          // Get total students
          db.get(
            `SELECT COUNT(*) as total_students FROM library_students WHERE status = 'Active'`,
            [],
            (err, row) => {
              if (err) return res.status(500).json({ message: 'Error fetching stats', error: err.message });
              stats.total_students = row?.total_students || 0;

              // Get paid students (this month)
              db.get(
                `SELECT COUNT(DISTINCT student_id) as paid_students FROM library_fees
                 WHERE month = ? AND year = ?`,
                [currentMonth.toString(), currentYear],
                (err, row) => {
                  if (err) return res.status(500).json({ message: 'Error fetching stats', error: err.message });
                  stats.paid_students = row?.paid_students || 0;
                  stats.unpaid_students = stats.total_students - stats.paid_students;

                  // Get monthly expenses
                  db.get(
                    `SELECT COALESCE(SUM(amount), 0) as monthly_expenses FROM library_expenses
                     WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?`,
                    [currentMonth.toString().padStart(2, '0'), currentYear.toString()],
                    (err, row) => {
                      if (err) return res.status(500).json({ message: 'Error fetching stats', error: err.message });
                      stats.monthly_expenses = row?.monthly_expenses || 0;
                      stats.monthly_profit = stats.monthly_collection - stats.monthly_expenses;

                      // Get seat stats
                      db.get(
                        `SELECT
                          COUNT(*) as total_seats,
                          SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as available_seats,
                          SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END) as occupied_seats
                         FROM library_seats`,
                        [],
                        (err, row) => {
                          if (err) return res.status(500).json({ message: 'Error fetching stats', error: err.message });
                          stats.total_seats = row?.total_seats || 170;
                          stats.available_seats = row?.available_seats || 170;
                          stats.occupied_seats = row?.occupied_seats || 0;

                          // Get recent payments
                          db.all(
                            `SELECT lf.*, ls.name as student_name
                             FROM library_fees lf
                             LEFT JOIN library_students ls ON lf.student_id = ls.id
                             ORDER BY lf.created_at DESC LIMIT 5`,
                            [],
                            (err, payments) => {
                              if (err) return res.status(500).json({ message: 'Error fetching stats', error: err.message });
                              stats.recent_payments = payments || [];

                              res.json(stats);
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
};

// ========================================
// STUDENTS
// ========================================

exports.getStudents = (req, res) => {
  const { search, status } = req.query;
  let query = `SELECT * FROM library_students WHERE 1=1`;
  const params = [];

  if (search) {
    query += ` AND (name LIKE ? OR mobile LIKE ? OR seat_number LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  query += ` ORDER BY created_at DESC`;

  db.all(query, params, (err, students) => {
    if (err) return res.status(500).json({ message: 'Error fetching students', error: err.message });
    res.json(students);
  });
};

exports.getStudentById = (req, res) => {
  const { id } = req.params;
  db.get(`SELECT * FROM library_students WHERE id = ?`, [id], (err, student) => {
    if (err) return res.status(500).json({ message: 'Error fetching student', error: err.message });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  });
};

exports.createStudent = (req, res) => {
  const {
    name, mobile, whatsapp_number, has_whatsapp,
    seat_number, locker_number, admission_date,
    monthly_fee, next_due_date, admission_fee, advance_paid
  } = req.body;

  if (!name || !mobile) {
    return res.status(400).json({ message: 'Name and mobile are required' });
  }

  // Check if seat is available
  if (seat_number) {
    db.get(
      `SELECT * FROM library_seats WHERE seat_number = ? AND status = 'Available'`,
      [seat_number],
      (err, seat) => {
        if (err) return res.status(500).json({ message: 'Error checking seat', error: err.message });
        if (!seat) return res.status(400).json({ message: 'Seat is not available' });

        insertStudent();
      }
    );
  } else {
    insertStudent();
  }

  function insertStudent() {
    // Calculate fee_status based on advance_paid
    const monthlyFeeAmount = Number(monthly_fee) || 0;
    const advancePaidAmount = Number(advance_paid) || 0;
    const admissionFeeAmount = Number(admission_fee) || 0;

    // Paid if advance >= monthly fee, otherwise Pending
    let feeStatus = 'Pending';
    if (monthlyFeeAmount > 0 && advancePaidAmount >= monthlyFeeAmount) {
      feeStatus = 'Paid';
    }

    console.log('Creating student:', { monthlyFeeAmount, advancePaidAmount, feeStatus });

    db.run(
      `INSERT INTO library_students (
        name, mobile, whatsapp_number, has_whatsapp,
        seat_number, locker_number, admission_date,
        monthly_fee, fee_status, next_due_date, admission_fee, advance_paid
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, mobile, whatsapp_number || mobile, has_whatsapp ? 1 : 0,
        seat_number, locker_number, admission_date || new Date().toISOString().split('T')[0],
        monthlyFeeAmount, feeStatus, next_due_date, admissionFeeAmount, advancePaidAmount
      ],
      function(err) {
        if (err) return res.status(500).json({ message: 'Error creating student', error: err.message });

        const studentId = this.lastID;

        // Update seat status if assigned
        if (seat_number) {
          db.run(
            `UPDATE library_seats SET status = 'Occupied', student_id = ?, updated_at = CURRENT_TIMESTAMP
             WHERE seat_number = ?`,
            [studentId, seat_number]
          );
        }

        // Update locker status if assigned
        if (locker_number) {
          db.run(
            `UPDATE library_lockers SET status = 'Occupied', student_id = ?, updated_at = CURRENT_TIMESTAMP
             WHERE locker_number = ?`,
            [studentId, locker_number]
          );
        }

        res.status(201).json({ success: true, id: studentId, message: 'Student created successfully' });
      }
    );
  }
};

exports.updateStudent = (req, res) => {
  const { id } = req.params;
  const {
    name, mobile, whatsapp_number, has_whatsapp,
    seat_number, locker_number, monthly_fee,
    fee_status, next_due_date, status, admission_fee, advance_paid
  } = req.body;

  // Get current student data
  db.get(`SELECT * FROM library_students WHERE id = ?`, [id], (err, student) => {
    if (err) return res.status(500).json({ message: 'Error fetching student', error: err.message });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Handle seat change
    if (seat_number !== student.seat_number) {
      // Release old seat
      if (student.seat_number) {
        db.run(
          `UPDATE library_seats SET status = 'Available', student_id = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE seat_number = ?`,
          [student.seat_number]
        );
      }
      // Assign new seat
      if (seat_number) {
        db.run(
          `UPDATE library_seats SET status = 'Occupied', student_id = ?, updated_at = CURRENT_TIMESTAMP
           WHERE seat_number = ?`,
          [id, seat_number]
        );
      }
    }

    // Handle locker change
    if (locker_number !== student.locker_number) {
      // Release old locker
      if (student.locker_number) {
        db.run(
          `UPDATE library_lockers SET status = 'Available', student_id = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE locker_number = ?`,
          [student.locker_number]
        );
      }
      // Assign new locker
      if (locker_number) {
        db.run(
          `UPDATE library_lockers SET status = 'Occupied', student_id = ?, updated_at = CURRENT_TIMESTAMP
           WHERE locker_number = ?`,
          [id, locker_number]
        );
      }
    }

    // Calculate fee_status based on advance_paid
    const finalMonthlyFee = monthly_fee !== undefined ? Number(monthly_fee) : Number(student.monthly_fee) || 0;
    const finalAdvancePaid = advance_paid !== undefined ? Number(advance_paid) : Number(student.advance_paid) || 0;
    const finalAdmissionFee = admission_fee !== undefined ? Number(admission_fee) : Number(student.admission_fee) || 0;

    // Auto-calculate fee_status: if advance >= monthly fee, mark as Paid, otherwise Pending
    let finalFeeStatus = 'Pending';
    if (finalMonthlyFee > 0 && finalAdvancePaid >= finalMonthlyFee) {
      finalFeeStatus = 'Paid';
    }

    console.log('Updating student:', { finalMonthlyFee, finalAdvancePaid, finalFeeStatus });

    // Update student
    db.run(
      `UPDATE library_students SET
        name = ?, mobile = ?, whatsapp_number = ?, has_whatsapp = ?,
        seat_number = ?, locker_number = ?, monthly_fee = ?,
        fee_status = ?, next_due_date = ?, status = ?,
        admission_fee = ?, advance_paid = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name || student.name,
        mobile || student.mobile,
        whatsapp_number || student.whatsapp_number,
        has_whatsapp !== undefined ? (has_whatsapp ? 1 : 0) : student.has_whatsapp,
        seat_number !== undefined ? seat_number : student.seat_number,
        locker_number !== undefined ? locker_number : student.locker_number,
        finalMonthlyFee,
        finalFeeStatus,
        next_due_date || student.next_due_date,
        status || student.status,
        finalAdmissionFee,
        finalAdvancePaid,
        id
      ],
      (err) => {
        if (err) return res.status(500).json({ message: 'Error updating student', error: err.message });
        res.json({ success: true, message: 'Student updated successfully' });
      }
    );
  });
};

exports.deleteStudent = (req, res) => {
  const { id } = req.params;

  db.get(`SELECT * FROM library_students WHERE id = ?`, [id], (err, student) => {
    if (err) return res.status(500).json({ message: 'Error fetching student', error: err.message });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Release seat
    if (student.seat_number) {
      db.run(
        `UPDATE library_seats SET status = 'Available', student_id = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE seat_number = ?`,
        [student.seat_number]
      );
    }

    // Release locker
    if (student.locker_number) {
      db.run(
        `UPDATE library_lockers SET status = 'Available', student_id = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE locker_number = ?`,
        [student.locker_number]
      );
    }

    // Delete student
    db.run(`DELETE FROM library_students WHERE id = ?`, [id], (err) => {
      if (err) return res.status(500).json({ message: 'Error deleting student', error: err.message });
      res.json({ success: true, message: 'Student deleted successfully' });
    });
  });
};

// ========================================
// SEATS
// ========================================

exports.getSeats = (req, res) => {
  db.all(
    `SELECT ls.*, lst.name as student_name, lst.mobile as student_mobile
     FROM library_seats ls
     LEFT JOIN library_students lst ON ls.student_id = lst.id
     ORDER BY ls.seat_number`,
    [],
    (err, seats) => {
      if (err) return res.status(500).json({ message: 'Error fetching seats', error: err.message });
      res.json(seats);
    }
  );
};

exports.assignSeat = (req, res) => {
  const { id } = req.params;
  const { student_id } = req.body;

  db.get(`SELECT * FROM library_seats WHERE id = ?`, [id], (err, seat) => {
    if (err) return res.status(500).json({ message: 'Error fetching seat', error: err.message });
    if (!seat) return res.status(404).json({ message: 'Seat not found' });
    if (seat.status === 'Occupied') return res.status(400).json({ message: 'Seat is already occupied' });

    db.run(
      `UPDATE library_seats SET status = 'Occupied', student_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [student_id, id],
      (err) => {
        if (err) return res.status(500).json({ message: 'Error assigning seat', error: err.message });

        // Update student's seat number
        db.run(
          `UPDATE library_students SET seat_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [seat.seat_number, student_id]
        );

        res.json({ success: true, message: 'Seat assigned successfully' });
      }
    );
  });
};

exports.releaseSeat = (req, res) => {
  const { id } = req.params;

  db.get(`SELECT * FROM library_seats WHERE id = ?`, [id], (err, seat) => {
    if (err) return res.status(500).json({ message: 'Error fetching seat', error: err.message });
    if (!seat) return res.status(404).json({ message: 'Seat not found' });

    // Update student's seat to null
    if (seat.student_id) {
      db.run(
        `UPDATE library_students SET seat_number = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [seat.student_id]
      );
    }

    db.run(
      `UPDATE library_seats SET status = 'Available', student_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id],
      (err) => {
        if (err) return res.status(500).json({ message: 'Error releasing seat', error: err.message });
        res.json({ success: true, message: 'Seat released successfully' });
      }
    );
  });
};

// ========================================
// LOCKERS
// ========================================

exports.getLockers = (req, res) => {
  db.all(
    `SELECT ll.*, lst.name as student_name, lst.mobile as student_mobile
     FROM library_lockers ll
     LEFT JOIN library_students lst ON ll.student_id = lst.id
     ORDER BY ll.locker_number`,
    [],
    (err, lockers) => {
      if (err) return res.status(500).json({ message: 'Error fetching lockers', error: err.message });
      res.json(lockers);
    }
  );
};

exports.assignLocker = (req, res) => {
  const { id } = req.params;
  const { student_id } = req.body;

  db.get(`SELECT * FROM library_lockers WHERE id = ?`, [id], (err, locker) => {
    if (err) return res.status(500).json({ message: 'Error fetching locker', error: err.message });
    if (!locker) return res.status(404).json({ message: 'Locker not found' });
    if (locker.status === 'Occupied') return res.status(400).json({ message: 'Locker is already occupied' });

    db.run(
      `UPDATE library_lockers SET status = 'Occupied', student_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [student_id, id],
      (err) => {
        if (err) return res.status(500).json({ message: 'Error assigning locker', error: err.message });

        // Update student's locker number
        db.run(
          `UPDATE library_students SET locker_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [locker.locker_number, student_id]
        );

        res.json({ success: true, message: 'Locker assigned successfully' });
      }
    );
  });
};

exports.releaseLocker = (req, res) => {
  const { id } = req.params;

  db.get(`SELECT * FROM library_lockers WHERE id = ?`, [id], (err, locker) => {
    if (err) return res.status(500).json({ message: 'Error fetching locker', error: err.message });
    if (!locker) return res.status(404).json({ message: 'Locker not found' });

    // Update student's locker to null
    if (locker.student_id) {
      db.run(
        `UPDATE library_students SET locker_number = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [locker.student_id]
      );
    }

    db.run(
      `UPDATE library_lockers SET status = 'Available', student_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id],
      (err) => {
        if (err) return res.status(500).json({ message: 'Error releasing locker', error: err.message });
        res.json({ success: true, message: 'Locker released successfully' });
      }
    );
  });
};

// ========================================
// FEES
// ========================================

exports.getFees = (req, res) => {
  const { student_id, month, year } = req.query;
  let query = `SELECT lf.*, ls.name as student_name, ls.mobile, ls.whatsapp_number, ls.has_whatsapp, ls.seat_number
               FROM library_fees lf
               LEFT JOIN library_students ls ON lf.student_id = ls.id
               WHERE 1=1`;
  const params = [];

  if (student_id) {
    query += ` AND lf.student_id = ?`;
    params.push(student_id);
  }

  if (month) {
    query += ` AND lf.month = ?`;
    params.push(month);
  }

  if (year) {
    query += ` AND lf.year = ?`;
    params.push(year);
  }

  query += ` ORDER BY lf.created_at DESC`;

  db.all(query, params, (err, fees) => {
    if (err) return res.status(500).json({ message: 'Error fetching fees', error: err.message });
    res.json(fees);
  });
};

exports.collectFee = (req, res) => {
  const { student_id, amount, month, year, payment_mode, payment_date, notes } = req.body;

  if (!student_id || !amount || !month || !year) {
    return res.status(400).json({ message: 'Student, amount, month, and year are required' });
  }

  // Generate receipt number
  const receiptNumber = `LIB${year}${month.toString().padStart(2, '0')}${Math.floor(1000 + Math.random() * 9000)}`;

  // Get student details including current advance_paid, monthly_fee, and contact info
  db.get(`SELECT name, mobile, whatsapp_number, has_whatsapp, advance_paid, monthly_fee FROM library_students WHERE id = ?`, [student_id], (err, student) => {
    if (err) return res.status(500).json({ message: 'Error fetching student', error: err.message });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const collectedBy = req.user?.name || req.user?.email || 'Admin';
    const collectedAmount = Number(amount) || 0;
    const currentAdvance = Number(student.advance_paid) || 0;
    const monthlyFee = Number(student.monthly_fee) || 0;

    // Calculate new advance_paid (add collected amount)
    const newAdvancePaid = currentAdvance + collectedAmount;

    // Calculate new fee_status
    let newFeeStatus = 'Pending';
    if (monthlyFee > 0 && newAdvancePaid >= monthlyFee) {
      newFeeStatus = 'Paid';
    }

    console.log('Collecting fee:', { collectedAmount, currentAdvance, newAdvancePaid, monthlyFee, newFeeStatus });

    db.run(
      `INSERT INTO library_fees (
        student_id, student_name, amount, month, year,
        payment_mode, payment_date, receipt_number, collected_by, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student_id, student.name, collectedAmount, month, year,
        payment_mode || 'Cash', payment_date || new Date().toISOString().split('T')[0],
        receiptNumber, collectedBy, notes
      ],
      function(err) {
        if (err) return res.status(500).json({ message: 'Error collecting fee', error: err.message });

        // Update student: add to advance_paid and update fee_status
        const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
        const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
        const nextDueDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;

        db.run(
          `UPDATE library_students SET
            advance_paid = ?,
            fee_status = ?,
            next_due_date = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [newAdvancePaid, newFeeStatus, nextDueDate, student_id]
        );

        res.status(201).json({
          success: true,
          id: this.lastID,
          receipt_number: receiptNumber,
          student_name: student.name,
          mobile: student.mobile,
          whatsapp_number: student.whatsapp_number || student.mobile,
          has_whatsapp: student.has_whatsapp,
          amount: collectedAmount,
          month: month,
          year: year,
          payment_mode: payment_mode || 'Cash',
          message: 'Fee collected successfully'
        });
      }
    );
  });
};

exports.getFeeReceipt = (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT lf.*, ls.name as student_name, ls.mobile, ls.seat_number, ls.whatsapp_number, ls.has_whatsapp
     FROM library_fees lf
     LEFT JOIN library_students ls ON lf.student_id = ls.id
     WHERE lf.id = ?`,
    [id],
    (err, fee) => {
      if (err) return res.status(500).json({ message: 'Error fetching receipt', error: err.message });
      if (!fee) return res.status(404).json({ message: 'Receipt not found' });

      // Get library settings for receipt
      db.all(`SELECT setting_key, setting_value FROM library_settings`, [], (err, settings) => {
        if (err) return res.status(500).json({ message: 'Error fetching settings', error: err.message });

        const settingsObj = {};
        settings.forEach(s => {
          settingsObj[s.setting_key] = s.setting_value;
        });

        res.json({
          ...fee,
          library_name: settingsObj.library_name || 'Study Library',
          receipt_header: settingsObj.receipt_header || 'Fee Receipt',
          receipt_footer: settingsObj.receipt_footer || 'Thank you',
          library_address: settingsObj.address || '',
          library_phone: settingsObj.phone || '',
          library_email: settingsObj.email || ''
        });
      });
    }
  );
};

// ========================================
// EXPENSES
// ========================================

exports.getExpenses = (req, res) => {
  const { expense_type, month, year } = req.query;
  let query = `SELECT * FROM library_expenses WHERE 1=1`;
  const params = [];

  if (expense_type) {
    query += ` AND expense_type = ?`;
    params.push(expense_type);
  }

  if (month && year) {
    query += ` AND strftime('%m', date) = ? AND strftime('%Y', date) = ?`;
    params.push(month.toString().padStart(2, '0'), year.toString());
  }

  query += ` ORDER BY date DESC`;

  db.all(query, params, (err, expenses) => {
    if (err) return res.status(500).json({ message: 'Error fetching expenses', error: err.message });
    res.json(expenses);
  });
};

exports.createExpense = (req, res) => {
  const { expense_type, expense_name, amount, date, notes } = req.body;

  if (!expense_type || !expense_name || !amount || !date) {
    return res.status(400).json({ message: 'Expense type, name, amount, and date are required' });
  }

  const addedBy = req.user?.name || req.user?.email || 'Admin';

  db.run(
    `INSERT INTO library_expenses (expense_type, expense_name, amount, date, added_by, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [expense_type, expense_name, amount, date, addedBy, notes],
    function(err) {
      if (err) return res.status(500).json({ message: 'Error creating expense', error: err.message });
      res.status(201).json({ success: true, id: this.lastID, message: 'Expense added successfully' });
    }
  );
};

exports.updateExpense = (req, res) => {
  const { id } = req.params;
  const { expense_type, expense_name, amount, date, notes } = req.body;

  db.run(
    `UPDATE library_expenses SET
      expense_type = ?, expense_name = ?, amount = ?, date = ?, notes = ?
     WHERE id = ?`,
    [expense_type, expense_name, amount, date, notes, id],
    (err) => {
      if (err) return res.status(500).json({ message: 'Error updating expense', error: err.message });
      res.json({ success: true, message: 'Expense updated successfully' });
    }
  );
};

exports.deleteExpense = (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM library_expenses WHERE id = ?`, [id], (err) => {
    if (err) return res.status(500).json({ message: 'Error deleting expense', error: err.message });
    res.json({ success: true, message: 'Expense deleted successfully' });
  });
};

// ========================================
// STAFF (Admin only)
// ========================================

exports.getStaff = (req, res) => {
  db.all(
    `SELECT id, name, email, mobile, role, status, created_at FROM library_staff ORDER BY created_at DESC`,
    [],
    (err, staff) => {
      if (err) return res.status(500).json({ message: 'Error fetching staff', error: err.message });
      res.json(staff);
    }
  );
};

exports.createStaff = (req, res) => {
  const { name, email, password, mobile, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO library_staff (name, email, password, mobile, role) VALUES (?, ?, ?, ?, ?)`,
    [name, email, hashedPassword, mobile, role || 'staff'],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ message: 'Email already exists' });
        }
        return res.status(500).json({ message: 'Error creating staff', error: err.message });
      }
      res.status(201).json({ success: true, id: this.lastID, message: 'Staff created successfully' });
    }
  );
};

exports.updateStaff = (req, res) => {
  const { id } = req.params;
  const { name, email, password, mobile, role, status } = req.body;

  let query = `UPDATE library_staff SET name = ?, email = ?, mobile = ?, role = ?, status = ?, updated_at = CURRENT_TIMESTAMP`;
  const params = [name, email, mobile, role, status];

  if (password) {
    query += `, password = ?`;
    params.push(bcrypt.hashSync(password, 10));
  }

  query += ` WHERE id = ?`;
  params.push(id);

  db.run(query, params, (err) => {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      return res.status(500).json({ message: 'Error updating staff', error: err.message });
    }
    res.json({ success: true, message: 'Staff updated successfully' });
  });
};

exports.deleteStaff = (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM library_staff WHERE id = ?`, [id], (err) => {
    if (err) return res.status(500).json({ message: 'Error deleting staff', error: err.message });
    res.json({ success: true, message: 'Staff deleted successfully' });
  });
};

// Library Staff Login
exports.staffLogin = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  db.get(`SELECT * FROM library_staff WHERE email = ?`, [email], (err, staff) => {
    if (err) return res.status(500).json({ message: 'Error during login', error: err.message });
    if (!staff) return res.status(401).json({ message: 'Invalid credentials' });
    if (staff.status !== 'Active') return res.status(401).json({ message: 'Account is disabled' });

    const validPassword = bcrypt.compareSync(password, staff.password);
    if (!validPassword) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: staff.id, email: staff.email, role: staff.role, type: 'library' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role
      }
    });
  });
};

// ========================================
// REPORTS
// ========================================

exports.getDailyReport = (req, res) => {
  const { date } = req.query;
  const reportDate = date || new Date().toISOString().split('T')[0];

  db.all(
    `SELECT lf.*, ls.name as student_name, ls.seat_number
     FROM library_fees lf
     LEFT JOIN library_students ls ON lf.student_id = ls.id
     WHERE DATE(lf.payment_date) = DATE(?)
     ORDER BY lf.created_at`,
    [reportDate],
    (err, payments) => {
      if (err) return res.status(500).json({ message: 'Error fetching report', error: err.message });

      const totalCollection = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

      res.json({
        date: reportDate,
        payments,
        total_collection: totalCollection,
        total_transactions: payments.length
      });
    }
  );
};

exports.getMonthlyReport = (req, res) => {
  const { month, year } = req.query;
  const currentDate = new Date();
  const reportMonth = month || (currentDate.getMonth() + 1).toString();
  const reportYear = year || currentDate.getFullYear().toString();

  // Get fee collection
  db.all(
    `SELECT lf.*, ls.name as student_name, ls.seat_number
     FROM library_fees lf
     LEFT JOIN library_students ls ON lf.student_id = ls.id
     WHERE lf.month = ? AND lf.year = ?
     ORDER BY lf.payment_date`,
    [reportMonth, reportYear],
    (err, payments) => {
      if (err) return res.status(500).json({ message: 'Error fetching report', error: err.message });

      // Get expenses
      db.all(
        `SELECT * FROM library_expenses
         WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?
         ORDER BY date`,
        [reportMonth.toString().padStart(2, '0'), reportYear],
        (err, expenses) => {
          if (err) return res.status(500).json({ message: 'Error fetching expenses', error: err.message });

          const totalCollection = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
          const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

          res.json({
            month: reportMonth,
            year: reportYear,
            payments,
            expenses,
            total_collection: totalCollection,
            total_expenses: totalExpenses,
            net_profit: totalCollection - totalExpenses,
            total_transactions: payments.length
          });
        }
      );
    }
  );
};

exports.getStudentReport = (req, res) => {
  const { status } = req.query;

  let query = `SELECT * FROM library_students WHERE 1=1`;
  const params = [];

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  query += ` ORDER BY name`;

  db.all(query, params, (err, students) => {
    if (err) return res.status(500).json({ message: 'Error fetching report', error: err.message });
    res.json({
      students,
      total: students.length
    });
  });
};

exports.getSeatReport = (req, res) => {
  db.all(
    `SELECT ls.*, lst.name as student_name, lst.mobile
     FROM library_seats ls
     LEFT JOIN library_students lst ON ls.student_id = lst.id
     ORDER BY ls.seat_number`,
    [],
    (err, seats) => {
      if (err) return res.status(500).json({ message: 'Error fetching report', error: err.message });

      const available = seats.filter(s => s.status === 'Available').length;
      const occupied = seats.filter(s => s.status === 'Occupied').length;

      res.json({
        seats,
        total: seats.length,
        available,
        occupied,
        occupancy_rate: ((occupied / seats.length) * 100).toFixed(1)
      });
    }
  );
};

exports.getExpenseReport = (req, res) => {
  const { month, year } = req.query;
  const currentDate = new Date();
  const reportMonth = month || (currentDate.getMonth() + 1).toString();
  const reportYear = year || currentDate.getFullYear().toString();

  db.all(
    `SELECT * FROM library_expenses
     WHERE strftime('%m', date) = ? AND strftime('%Y', date) = ?
     ORDER BY date`,
    [reportMonth.toString().padStart(2, '0'), reportYear],
    (err, expenses) => {
      if (err) return res.status(500).json({ message: 'Error fetching report', error: err.message });

      const fixedExpenses = expenses.filter(e => e.expense_type === 'fixed');
      const variableExpenses = expenses.filter(e => e.expense_type === 'variable');

      res.json({
        month: reportMonth,
        year: reportYear,
        expenses,
        fixed_expenses: fixedExpenses,
        variable_expenses: variableExpenses,
        total_fixed: fixedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
        total_variable: variableExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
        total: expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
      });
    }
  );
};

// ========================================
// SETTINGS
// ========================================

exports.getSettings = (req, res) => {
  db.all(`SELECT setting_key, setting_value FROM library_settings`, [], (err, settings) => {
    if (err) return res.status(500).json({ message: 'Error fetching settings', error: err.message });

    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.setting_key] = s.setting_value;
    });

    res.json(settingsObj);
  });
};

exports.updateSettings = (req, res) => {
  const settings = req.body;

  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ message: 'Settings object is required' });
  }

  const updatePromises = Object.entries(settings).map(([key, value]) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO library_settings (setting_key, setting_value, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?, updated_at = CURRENT_TIMESTAMP`,
        [key, value, value],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  });

  Promise.all(updatePromises)
    .then(() => res.json({ success: true, message: 'Settings updated successfully' }))
    .catch(err => res.status(500).json({ message: 'Error updating settings', error: err.message }));
};

// ========================================
// SEARCH STUDENTS (for autocomplete)
// ========================================

exports.searchStudents = (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.json([]);
  }

  db.all(
    `SELECT id, name, mobile, whatsapp_number, has_whatsapp, seat_number, monthly_fee, fee_status
     FROM library_students
     WHERE status = 'Active' AND (name LIKE ? OR mobile LIKE ?)
     ORDER BY name
     LIMIT 10`,
    [`%${q}%`, `%${q}%`],
    (err, students) => {
      if (err) return res.status(500).json({ message: 'Error searching students', error: err.message });
      res.json(students);
    }
  );
};
