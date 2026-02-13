/**
 * Seed script: Add 10 dummy students (5 Electrician + 5 Fitter)
 * Run: node seed-students.js
 */
const path = require('path');
const { getDb } = require('./database/db');
const db = getDb();

const students = [
  // Electrician - 5
  { name: 'Amit Kumar', father: 'Rajesh Kumar', mother: 'Sunita Devi', mobile: '9876543210', trade: 'Electrician', category: 'General', qualification: '10th Pass', session: '2025-2026', village: 'Maner', district: 'Patna', state: 'Bihar', pincode: '801108' },
  { name: 'Vikash Yadav', father: 'Ramesh Yadav', mother: 'Meera Devi', mobile: '9876543211', trade: 'Electrician', category: 'OBC', qualification: '10th Pass', session: '2025-2026', village: 'Danapur', district: 'Patna', state: 'Bihar', pincode: '801503' },
  { name: 'Sonu Kumar', father: 'Shiv Kumar', mother: 'Rani Devi', mobile: '9876543212', trade: 'Electrician', category: 'SC', qualification: '10th Pass', session: '2025-2026', village: 'Phulwari', district: 'Patna', state: 'Bihar', pincode: '801505' },
  { name: 'Ravi Ranjan', father: 'Manoj Prasad', mother: 'Kavita Devi', mobile: '9876543213', trade: 'Electrician', category: 'General', qualification: '12th Pass', session: '2025-2026', village: 'Khagaul', district: 'Patna', state: 'Bihar', pincode: '801105' },
  { name: 'Deepak Sharma', father: 'Anil Sharma', mother: 'Anita Sharma', mobile: '9876543214', trade: 'Electrician', category: 'OBC', qualification: '10th Pass', session: '2024-2025', village: 'Bihta', district: 'Patna', state: 'Bihar', pincode: '801110' },
  // Fitter - 5
  { name: 'Rahul Paswan', father: 'Sunil Paswan', mother: 'Geeta Devi', mobile: '9876543215', trade: 'Fitter', category: 'SC', qualification: '10th Pass', session: '2025-2026', village: 'Naubatpur', district: 'Patna', state: 'Bihar', pincode: '801109' },
  { name: 'Pradeep Gupta', father: 'Vinod Gupta', mother: 'Sarita Devi', mobile: '9876543216', trade: 'Fitter', category: 'General', qualification: '12th Pass', session: '2025-2026', village: 'Masaurhi', district: 'Patna', state: 'Bihar', pincode: '804452' },
  { name: 'Manish Kumar', father: 'Ratan Kumar', mother: 'Poonam Devi', mobile: '9876543217', trade: 'Fitter', category: 'OBC', qualification: '10th Pass', session: '2025-2026', village: 'Paliganj', district: 'Patna', state: 'Bihar', pincode: '801110' },
  { name: 'Ajay Thakur', father: 'Dinesh Thakur', mother: 'Manju Devi', mobile: '9876543218', trade: 'Fitter', category: 'General', qualification: '10th Pass', session: '2024-2025', village: 'Fatuha', district: 'Patna', state: 'Bihar', pincode: '803201' },
  { name: 'Santosh Mandal', father: 'Ramchandra Mandal', mother: 'Lakshmi Devi', mobile: '9876543219', trade: 'Fitter', category: 'OBC', qualification: '12th Pass', session: '2025-2026', village: 'Bakhtiarpur', district: 'Patna', state: 'Bihar', pincode: '803212' },
];

let completed = 0;

students.forEach((s, idx) => {
  const docs = JSON.stringify({ photo: 'manual_verified', aadhaar: 'manual_verified', marksheet: 'manual_verified' });

  // Insert into admissions as Approved
  db.run(
    `INSERT INTO admissions (name, father_name, mother_name, mobile, email, trade, qualification, category, documents, status, village_town_city, district, state, pincode, session, shift)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', ?, ?, ?, ?, ?, '1st Shift')`,
    [s.name, s.father, s.mother, s.mobile, `${s.name.toLowerCase().replace(/\s/g, '')}@example.com`, s.trade, s.qualification, s.category, docs, s.village, s.district, s.state, s.pincode, s.session],
    function (err) {
      if (err) {
        console.error(`Failed to insert admission for ${s.name}:`, err.message);
        checkDone();
        return;
      }

      const admissionId = this.lastID;
      const enrollNum = `EN${s.session.slice(0, 4)}${String(idx + 1).padStart(4, '0')}`;

      // Insert into students table
      db.run(
        `INSERT INTO students (admission_id, student_name, father_name, mother_name, mobile, email, trade, enrollment_number, qualification, category, photo, status, academic_year, village_town_city, district, state, pincode, session, shift, mis_iti_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual_verified', 'Active', ?, ?, ?, ?, ?, ?, '1st Shift', 'PR10001156')`,
        [admissionId, s.name, s.father, s.mother, s.mobile, `${s.name.toLowerCase().replace(/\s/g, '')}@example.com`, s.trade, enrollNum, s.qualification, s.category, s.session, s.village, s.district, s.state, s.pincode, s.session],
        function (err) {
          if (err) {
            console.error(`Failed to insert student ${s.name}:`, err.message);
          } else {
            console.log(`✓ Added: ${s.name} (${s.trade}) - ${enrollNum}`);
          }
          checkDone();
        }
      );
    }
  );
});

function checkDone() {
  completed++;
  if (completed >= students.length) {
    console.log(`\nDone! Added ${students.length} students.`);
    setTimeout(() => process.exit(0), 500);
  }
}
