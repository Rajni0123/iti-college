const { getDb } = require('../database/db');
const db = getDb();

// Get all students
exports.getAllStudents = (req, res) => {
  const { trade, status, search, session } = req.query;
  let query = 'SELECT * FROM students WHERE 1=1';
  const params = [];

  if (trade) {
    query += ' AND trade = ?';
    params.push(trade);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (session) {
    query += ' AND (session = ? OR academic_year = ?)';
    params.push(session, session);
  }
  if (search) {
    query += ' AND (student_name LIKE ? OR mobile LIKE ? OR enrollment_number LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, students) => {
    if (err) {
      console.error('Error fetching students:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch students',
        error: err.message
      });
    }

    res.json({
      success: true,
      data: students
    });
  });
};

// Get student by ID
exports.getStudentById = (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM students WHERE id = ?', [id], (err, student) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch student',
        error: err.message
      });
    }
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: student
    });
  });
};

// Create student
exports.createStudent = (req, res) => {
  const {
    admission_id,
    student_name,
    father_name,
    mother_name,
    mobile,
    email,
    trade,
    enrollment_number,
    admission_date,
    qualification,
    category,
    address,
    photo,
    status,
    academic_year
  } = req.body;

  if (!student_name || !mobile || !trade) {
    return res.status(400).json({
      success: false,
      message: 'Student name, mobile, and trade are required'
    });
  }

  const currentYear = new Date().getFullYear();
  const academicYearValue = academic_year || `${currentYear}-${currentYear + 1}`;

  db.run(
    `INSERT INTO students (
      admission_id, student_name, father_name, mother_name, mobile, email,
      trade, enrollment_number, admission_date, qualification, category,
      address, photo, status, academic_year
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      admission_id || null,
      student_name,
      father_name || null,
      mother_name || null,
      mobile,
      email || null,
      trade,
      enrollment_number || null,
      admission_date || null,
      qualification || null,
      category || null,
      address || null,
      photo || null,
      status || 'Active',
      academicYearValue
    ],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({
            success: false,
            message: 'Enrollment number already exists'
          });
        }
        console.error('Error creating student:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to create student',
          error: err.message
        });
      }

      res.status(201).json({
        success: true,
        message: 'Student created successfully',
        id: this.lastID
      });
    }
  );
};

// Update student
exports.updateStudent = (req, res) => {
  const { id } = req.params;
  const {
    student_name,
    father_name,
    mother_name,
    mobile,
    email,
    trade,
    enrollment_number,
    admission_date,
    qualification,
    category,
    address,
    photo,
    status,
    academic_year
  } = req.body;

  const updates = [];
  const values = [];

  if (student_name !== undefined) {
    updates.push('student_name = ?');
    values.push(student_name);
  }
  if (father_name !== undefined) {
    updates.push('father_name = ?');
    values.push(father_name);
  }
  if (mother_name !== undefined) {
    updates.push('mother_name = ?');
    values.push(mother_name);
  }
  if (mobile !== undefined) {
    updates.push('mobile = ?');
    values.push(mobile);
  }
  if (email !== undefined) {
    updates.push('email = ?');
    values.push(email);
  }
  if (trade !== undefined) {
    updates.push('trade = ?');
    values.push(trade);
  }
  if (enrollment_number !== undefined) {
    updates.push('enrollment_number = ?');
    values.push(enrollment_number);
  }
  if (admission_date !== undefined) {
    updates.push('admission_date = ?');
    values.push(admission_date);
  }
  if (qualification !== undefined) {
    updates.push('qualification = ?');
    values.push(qualification);
  }
  if (category !== undefined) {
    updates.push('category = ?');
    values.push(category);
  }
  if (address !== undefined) {
    updates.push('address = ?');
    values.push(address);
  }
  if (photo !== undefined) {
    updates.push('photo = ?');
    values.push(photo);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    values.push(status);
  }
  if (academic_year !== undefined) {
    updates.push('academic_year = ?');
    values.push(academic_year);
  }

  if (updates.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No fields to update'
    });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  db.run(
    `UPDATE students SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({
            success: false,
            message: 'Enrollment number already exists'
          });
        }
        console.error('Error updating student:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to update student',
          error: err.message
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      res.json({
        success: true,
        message: 'Student updated successfully'
      });
    }
  );
};

// Delete student
exports.deleteStudent = (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM students WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Error deleting student:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete student',
        error: err.message
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  });
};

// Get students with high dues (>50%)
exports.getStudentsWithHighDues = (req, res) => {
  const query = `
    SELECT 
      s.id,
      s.student_name,
      s.mobile,
      s.trade,
      s.enrollment_number,
      COALESCE(SUM(sf.amount), 0) as total_dues,
      COALESCE(SUM(sf.paid_amount), 0) as total_paid,
      COALESCE(MAX(sf.payment_date), '') as last_payment_date,
      COALESCE(MAX(sf.paid_amount), 0) as last_paid_amount
    FROM students s
    LEFT JOIN student_fees sf ON s.id = sf.admission_id OR s.student_name = sf.student_name
    WHERE s.status = 'Active'
    GROUP BY s.id, s.student_name, s.mobile, s.trade, s.enrollment_number
    HAVING total_dues > 0 AND (total_paid / total_dues) < 0.5
    ORDER BY (total_paid / total_dues) ASC, total_dues DESC
    LIMIT 20
  `;

  db.all(query, [], (err, students) => {
    if (err) {
      console.error('Error fetching students with high dues:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch students with high dues',
        error: err.message
      });
    }

    res.json({
      success: true,
      data: students.map(s => ({
        ...s,
        total_dues: parseFloat(s.total_dues) || 0,
        total_paid: parseFloat(s.total_paid) || 0,
        last_paid_amount: parseFloat(s.last_paid_amount) || 0,
        dues_percentage: s.total_dues > 0 ? ((s.total_paid / s.total_dues) * 100).toFixed(1) : 0
      }))
    });
  });
};
