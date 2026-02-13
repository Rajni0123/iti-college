const { getDb } = require('../database/db');
const db = getDb();

// Generate unique receipt/invoice number
const generateReceiptNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RCP${year}${month}${random}`;
};

const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV${year}${month}${random}`;
};

// Search students for autocomplete (from admissions table)
exports.searchStudents = (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.json([]);
  }
  const search = `%${q.trim()}%`;

  // Search from admissions table (approved students) and also students table
  const query = `
    SELECT DISTINCT
      a.id as admission_id,
      a.name as student_name,
      a.father_name,
      a.mobile,
      a.trade,
      a.email,
      a.session,
      a.shift,
      COALESCE(
        (SELECT SUM(sf.amount - sf.paid_amount) FROM student_fees sf WHERE sf.admission_id = a.id AND sf.status != 'Paid'),
        0
      ) as total_due_balance
    FROM admissions a
    WHERE (a.name LIKE ? OR a.father_name LIKE ? OR a.mobile LIKE ?)
    AND a.status = 'Approved'
    ORDER BY a.name ASC
    LIMIT 20
  `;

  db.all(query, [search, search, search], (err, results) => {
    if (err) {
      console.error('Error searching students:', err);
      return res.status(500).json({ message: 'Failed to search students' });
    }
    res.json(results || []);
  });
};

// Get fee balance for a specific student (admission_id)
exports.getStudentFeeBalance = (req, res) => {
  const { admission_id } = req.params;

  db.all(
    `SELECT * FROM student_fees WHERE admission_id = ? ORDER BY created_at DESC`,
    [admission_id],
    (err, fees) => {
      if (err) {
        console.error('Error fetching student fees:', err);
        return res.status(500).json({ message: 'Failed to fetch student fees' });
      }

      const totalFees = (fees || []).reduce((sum, f) => sum + (f.amount || 0), 0);
      const totalPaid = (fees || []).reduce((sum, f) => sum + (f.paid_amount || 0), 0);
      const totalDue = totalFees - totalPaid;

      res.json({
        fees: fees || [],
        total_fees: totalFees,
        total_paid: totalPaid,
        total_due: totalDue
      });
    }
  );
};

// Get all fees
exports.getFees = (req, res) => {
  const { admission_id, status, trade, academic_year } = req.query;
  let query = 'SELECT * FROM student_fees WHERE 1=1';
  const params = [];

  if (admission_id) {
    query += ' AND admission_id = ?';
    params.push(admission_id);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (trade) {
    query += ' AND trade = ?';
    params.push(trade);
  }
  if (academic_year) {
    query += ' AND academic_year = ?';
    params.push(academic_year);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, fees) => {
    if (err) {
      console.error('Error fetching fees:', err);
      return res.status(500).json({ message: 'Failed to fetch fees', error: err.message });
    }
    res.json(fees);
  });
};

// Get recent payments (last 7 days)
exports.getRecentPayments = (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString().split('T')[0];

    console.log('Fetching payments from date:', dateStr);

    // Get all payments with payment_date in last 7 days and paid_amount > 0
    // Also include payments where payment_date might be NULL but status is Paid/Partially Paid
    const query = `
      SELECT * FROM student_fees 
      WHERE (
        (payment_date >= ? AND paid_amount > 0) 
        OR (payment_date IS NULL AND paid_amount > 0 AND status IN ('Paid', 'Partially Paid'))
      )
      ORDER BY COALESCE(payment_date, created_at) DESC, created_at DESC
    `;

    db.all(query, [dateStr], (err, fees) => {
      if (err) {
        console.error('Error fetching recent payments:', err);
        return res.status(500).json({ message: 'Failed to fetch recent payments', error: err.message });
      }
      if (!fees) {
        console.log('No fees found, returning empty array');
        return res.json([]);
      }
      console.log(`Found ${fees.length} payments in last 7 days`);
      res.json(fees);
    });
  } catch (error) {
    console.error('Error in getRecentPayments:', error);
    return res.status(500).json({ message: 'Failed to fetch recent payments', error: error.message });
  }
};

// Get fee by ID with installments
exports.getFeeById = (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM student_fees WHERE id = ?', [id], (err, fee) => {
    if (err) {
      console.error('Error fetching fee:', err);
      return res.status(500).json({ message: 'Failed to fetch fee record' });
    }
    if (!fee) {
      return res.status(404).json({ message: 'Fee record not found' });
    }

    // Get installments if enabled
    if (fee.installment_enabled) {
      db.all('SELECT * FROM fee_installments WHERE fee_id = ? ORDER BY installment_number', [id], (err, installments) => {
        if (err) {
          console.error('Error fetching installments:', err);
          return res.json({ ...fee, installments: [] });
        }
        res.json({ ...fee, installments: installments || [] });
      });
    } else {
      res.json({ ...fee, installments: [] });
    }
  });
};

// Create fee record (with optional advance payment)
exports.createFee = (req, res) => {
  const {
    admission_id,
    student_name,
    father_name,
    mobile,
    trade,
    fee_type,
    amount,
    due_date,
    notes,
    installment_enabled,
    total_installments,
    installment_amounts,
    installment_due_dates,
    academic_year,
    // Advance payment fields
    advance_payment,
    payment_method,
    payment_date
  } = req.body;

  console.log('Creating fee record:', req.body);

  // Validate required fields
  if (!student_name || !trade || !fee_type || !amount) {
    return res.status(400).json({ message: 'Student name, trade, fee type, and amount are required' });
  }

  // Convert amount to number
  const feeAmount = parseFloat(amount);
  if (isNaN(feeAmount) || feeAmount <= 0) {
    return res.status(400).json({ message: 'Amount must be a valid positive number' });
  }

  const invoiceNumber = generateInvoiceNumber();
  const currentYear = new Date().getFullYear();
  const academicYearValue = academic_year || `${currentYear}-${currentYear + 1}`;
  const isInstallment = installment_enabled === true || installment_enabled === 1 || installment_enabled === '1';
  const numInstallments = parseInt(total_installments) || 1;

  // Handle advance payment
  const advanceAmount = advance_payment ? parseFloat(advance_payment) : 0;
  const paidAmount = Math.min(advanceAmount, feeAmount);
  const receiptNumber = paidAmount > 0 ? generateReceiptNumber() : null;
  const pMethod = paidAmount > 0 ? (payment_method || 'Cash') : null;
  const pDate = paidAmount > 0 ? (payment_date || new Date().toISOString().split('T')[0]) : null;

  // Auto-calculate status
  let status = 'Pending';
  if (paidAmount >= feeAmount) status = 'Paid';
  else if (paidAmount > 0) status = 'Partially Paid';

  db.run(
    `INSERT INTO student_fees (
      admission_id, student_name, father_name, mobile, trade, fee_type,
      total_amount, amount, paid_amount, due_date, notes, invoice_number,
      receipt_number, payment_method, payment_date, status,
      installment_enabled, total_installments, academic_year
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      admission_id || null,
      student_name,
      father_name || null,
      mobile || null,
      trade,
      fee_type,
      feeAmount,
      feeAmount,
      paidAmount,
      due_date || null,
      notes || null,
      invoiceNumber,
      receiptNumber,
      pMethod,
      pDate,
      status,
      isInstallment ? 1 : 0,
      numInstallments,
      academicYearValue
    ],
    function (err) {
      if (err) {
        console.error('Error creating fee:', err);
        return res.status(500).json({ message: 'Failed to create fee record', error: err.message });
      }

      const feeId = this.lastID;

      // If installment is enabled, create installment records
      if (isInstallment && numInstallments > 1) {
        const installmentAmountsArr = installment_amounts || [];
        const installmentDueDatesArr = installment_due_dates || [];
        const defaultInstallmentAmount = feeAmount / numInstallments;

        const installmentPromises = [];
        for (let i = 0; i < numInstallments; i++) {
          const instAmount = installmentAmountsArr[i] ? parseFloat(installmentAmountsArr[i]) : defaultInstallmentAmount;
          const instDueDate = installmentDueDatesArr[i] || null;

          installmentPromises.push(new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO fee_installments (fee_id, installment_number, amount, due_date) VALUES (?, ?, ?, ?)`,
              [feeId, i + 1, instAmount, instDueDate],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          }));
        }

        Promise.all(installmentPromises)
          .then(() => {
            res.json({
              id: feeId,
              invoice_number: invoiceNumber,
              receipt_number: receiptNumber,
              status: status,
              paid_amount: paidAmount,
              message: 'Fee record created with installments successfully'
            });
          })
          .catch((err) => {
            console.error('Error creating installments:', err);
            res.json({
              id: feeId,
              invoice_number: invoiceNumber,
              receipt_number: receiptNumber,
              status: status,
              paid_amount: paidAmount,
              message: 'Fee record created but some installments failed'
            });
          });
      } else {
        res.json({
          id: feeId,
          invoice_number: invoiceNumber,
          receipt_number: receiptNumber,
          status: status,
          paid_amount: paidAmount,
          message: paidAmount > 0
            ? `Fee created & ₹${paidAmount} payment collected. Receipt: ${receiptNumber}`
            : 'Fee record created successfully'
        });
      }
    }
  );
};

// Update fee record
exports.updateFee = (req, res) => {
  const { id } = req.params;
  const { fee_type, amount, due_date, notes, status, student_name, father_name, mobile, trade } = req.body;

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
  if (mobile !== undefined) {
    updates.push('mobile = ?');
    values.push(mobile);
  }
  if (trade !== undefined) {
    updates.push('trade = ?');
    values.push(trade);
  }
  if (fee_type !== undefined) {
    updates.push('fee_type = ?');
    values.push(fee_type);
  }
  if (amount !== undefined) {
    updates.push('amount = ?');
    updates.push('total_amount = ?');
    values.push(amount);
    values.push(amount);
  }
  if (due_date !== undefined) {
    updates.push('due_date = ?');
    values.push(due_date);
  }
  if (notes !== undefined) {
    updates.push('notes = ?');
    values.push(notes);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    values.push(status);
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'No fields to update' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  db.run(
    `UPDATE student_fees SET ${updates.join(', ')} WHERE id = ?`,
    values,
    (err) => {
      if (err) {
        console.error('Error updating fee:', err);
        return res.status(500).json({ message: 'Failed to update fee record' });
      }
      res.json({ message: 'Fee record updated successfully' });
    }
  );
};

// Pay fee (full or partial)
exports.payFee = (req, res) => {
  const { id } = req.params;
  const { paid_amount, payment_method, payment_date, installment_id } = req.body;

  if (!paid_amount || parseFloat(paid_amount) <= 0) {
    return res.status(400).json({ message: 'Valid paid amount is required' });
  }

  const paymentAmount = parseFloat(paid_amount);

  // If paying an installment
  if (installment_id) {
    db.get('SELECT * FROM fee_installments WHERE id = ?', [installment_id], (err, installment) => {
      if (err || !installment) {
        return res.status(404).json({ message: 'Installment not found' });
      }

      const remainingAmount = installment.amount - (installment.paid_amount || 0);
      if (paymentAmount > remainingAmount) {
        return res.status(400).json({ message: `Payment amount cannot exceed remaining amount (₹${remainingAmount})` });
      }

      const newPaidAmount = (installment.paid_amount || 0) + paymentAmount;
      const receiptNumber = generateReceiptNumber();
      const instStatus = newPaidAmount >= installment.amount ? 'Paid' : 'Partially Paid';

      db.run(
        `UPDATE fee_installments SET 
          paid_amount = ?, payment_method = ?, payment_date = ?, 
          receipt_number = ?, status = ? WHERE id = ?`,
        [
          newPaidAmount, 
          payment_method || 'Cash', 
          payment_date || new Date().toISOString().split('T')[0],
          receiptNumber,
          instStatus,
          installment_id
        ],
        (err) => {
          if (err) {
            console.error('Error updating installment:', err);
            return res.status(500).json({ message: 'Failed to process installment payment' });
          }

          // Update main fee record
          updateMainFeeFromInstallments(installment.fee_id, res, receiptNumber);
        }
      );
    });
  } else {
    // Direct payment to main fee
    db.get('SELECT * FROM student_fees WHERE id = ?', [id], (err, fee) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      if (!fee) {
        return res.status(404).json({ message: 'Fee record not found' });
      }

      const remainingAmount = fee.amount - (fee.paid_amount || 0);
      if (paymentAmount > remainingAmount) {
        return res.status(400).json({ message: `Payment amount cannot exceed remaining amount (₹${remainingAmount})` });
      }

      const newPaidAmount = (fee.paid_amount || 0) + paymentAmount;
      const receiptNumber = generateReceiptNumber();
      const invoiceNumber = fee.invoice_number || generateInvoiceNumber();
      const status = newPaidAmount >= fee.amount ? 'Paid' : 'Partially Paid';

      db.run(
        `UPDATE student_fees SET 
          paid_amount = ?, payment_method = ?, payment_date = ?, 
          receipt_number = ?, invoice_number = ?, status = ?, 
          updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [
          newPaidAmount, 
          payment_method || 'Cash', 
          payment_date || new Date().toISOString().split('T')[0], 
          receiptNumber, 
          invoiceNumber, 
          status, 
          id
        ],
        (err) => {
          if (err) {
            console.error('Error processing payment:', err);
            return res.status(500).json({ message: 'Failed to process payment' });
          }
          res.json({
            message: 'Payment processed successfully',
            receipt_number: receiptNumber,
            invoice_number: invoiceNumber,
            status: status,
            paid_amount: newPaidAmount,
            remaining: fee.amount - newPaidAmount
          });
        }
      );
    });
  }
};

// Helper to update main fee from installments
function updateMainFeeFromInstallments(feeId, res, receiptNumber) {
  db.all('SELECT * FROM fee_installments WHERE fee_id = ?', [feeId], (err, installments) => {
    if (err) {
      return res.json({ message: 'Installment paid, but failed to update main record', receipt_number: receiptNumber });
    }

    const totalPaid = installments.reduce((sum, inst) => sum + (inst.paid_amount || 0), 0);
    const allPaid = installments.every(inst => inst.status === 'Paid');
    const anyPaid = installments.some(inst => (inst.paid_amount || 0) > 0);
    
    let mainStatus = 'Pending';
    if (allPaid) mainStatus = 'Paid';
    else if (anyPaid) mainStatus = 'Partially Paid';

    db.run(
      `UPDATE student_fees SET paid_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [totalPaid, mainStatus, feeId],
      (err) => {
        if (err) {
          console.error('Error updating main fee:', err);
        }
        res.json({
          message: 'Installment payment processed successfully',
          receipt_number: receiptNumber,
          total_paid: totalPaid,
          status: mainStatus
        });
      }
    );
  });
}

// Get installments for a fee
exports.getInstallments = (req, res) => {
  const { id } = req.params;

  db.all(
    'SELECT * FROM fee_installments WHERE fee_id = ? ORDER BY installment_number',
    [id],
    (err, installments) => {
      if (err) {
        console.error('Error fetching installments:', err);
        return res.status(500).json({ message: 'Failed to fetch installments' });
      }
      res.json(installments || []);
    }
  );
};

// Pay installment
exports.payInstallment = (req, res) => {
  const { id, installmentId } = req.params;
  const { paid_amount, payment_method, payment_date } = req.body;

  req.body.installment_id = installmentId;
  exports.payFee({ params: { id } }, res);
};

// Delete fee record
exports.deleteFee = (req, res) => {
  const { id } = req.params;

  // First delete associated installments
  db.run('DELETE FROM fee_installments WHERE fee_id = ?', [id], (err) => {
    if (err) {
      console.error('Error deleting installments:', err);
    }

    db.run('DELETE FROM student_fees WHERE id = ?', [id], (err) => {
      if (err) {
        console.error('Error deleting fee:', err);
        return res.status(500).json({ message: 'Failed to delete fee record' });
      }
      res.json({ message: 'Fee record deleted successfully' });
    });
  });
};

// Get fee summary/statistics
exports.getFeeSummary = (req, res) => {
  const { trade, academic_year } = req.query;
  
  let whereClause = '1=1';
  const params = [];
  
  if (trade) {
    whereClause += ' AND trade = ?';
    params.push(trade);
  }
  if (academic_year) {
    whereClause += ' AND academic_year = ?';
    params.push(academic_year);
  }

  db.get(
    `SELECT 
      COUNT(*) as total_records,
      SUM(amount) as total_fees,
      SUM(paid_amount) as total_collected,
      SUM(amount - paid_amount) as total_pending,
      COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paid_count,
      COUNT(CASE WHEN status = 'Partially Paid' THEN 1 END) as partial_count,
      COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_count
    FROM student_fees WHERE ${whereClause}`,
    params,
    (err, summary) => {
      if (err) {
        console.error('Error fetching summary:', err);
        return res.status(500).json({ message: 'Failed to fetch fee summary' });
      }
      res.json(summary || {
        total_records: 0,
        total_fees: 0,
        total_collected: 0,
        total_pending: 0,
        paid_count: 0,
        partial_count: 0,
        pending_count: 0
      });
    }
  );
};
