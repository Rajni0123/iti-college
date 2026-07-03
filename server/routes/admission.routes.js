const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { handleMulterError } = upload;
const admissionController = require('../controllers/admission.controller');

// Check UIDAI availability
router.get('/check-uidai/:uidai', admissionController.checkUidaiAvailability);

router.post('/', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'aadhaar', maxCount: 1 },
  { name: 'marksheet', maxCount: 1 },
  { name: 'student_credit_card_doc', maxCount: 1 },
]), handleMulterError, admissionController.applyAdmission);

module.exports = router;
