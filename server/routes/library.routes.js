const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const libraryController = require('../controllers/library.controller');

// Public route - Library Staff Login
router.post('/staff/login', libraryController.staffLogin);

// All routes below require authentication
router.use(auth);

// Dashboard
router.get('/dashboard', libraryController.getDashboard);

// Students
router.get('/students', libraryController.getStudents);
router.get('/students/search', libraryController.searchStudents);
router.get('/students/:id', libraryController.getStudentById);
router.post('/students', libraryController.createStudent);
router.put('/students/:id', libraryController.updateStudent);
router.delete('/students/:id', libraryController.deleteStudent);

// Seats
router.get('/seats', libraryController.getSeats);
router.put('/seats/:id/assign', libraryController.assignSeat);
router.put('/seats/:id/release', libraryController.releaseSeat);

// Lockers
router.get('/lockers', libraryController.getLockers);
router.put('/lockers/:id/assign', libraryController.assignLocker);
router.put('/lockers/:id/release', libraryController.releaseLocker);

// Fees
router.get('/fees', libraryController.getFees);
router.post('/fees/collect', libraryController.collectFee);
router.get('/fees/receipt/:id', libraryController.getFeeReceipt);

// Expenses
router.get('/expenses', libraryController.getExpenses);
router.post('/expenses', libraryController.createExpense);
router.put('/expenses/:id', libraryController.updateExpense);
router.delete('/expenses/:id', libraryController.deleteExpense);

// Staff (Admin only - handled in controller by checking role)
router.get('/staff', libraryController.getStaff);
router.post('/staff', libraryController.createStaff);
router.put('/staff/:id', libraryController.updateStaff);
router.delete('/staff/:id', libraryController.deleteStaff);

// Reports
router.get('/reports/daily', libraryController.getDailyReport);
router.get('/reports/monthly', libraryController.getMonthlyReport);
router.get('/reports/students', libraryController.getStudentReport);
router.get('/reports/seats', libraryController.getSeatReport);
router.get('/reports/expenses', libraryController.getExpenseReport);

// Settings
router.get('/settings', libraryController.getSettings);
router.put('/settings', libraryController.updateSettings);

module.exports = router;
