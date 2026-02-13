const bcrypt = require('bcryptjs');
const { getDb } = require('./database/db');
const db = getDb();

const password = bcrypt.hashSync('staff123', 10);
db.run(
  `INSERT OR IGNORE INTO users (email, password, name, role) VALUES (?, ?, ?, ?)`,
  ['staff@manerpvtiti.com', password, 'Staff User', 'staff'],
  function(err) {
    if (err) console.error('Error:', err.message);
    else console.log('Staff user created. Email: staff@manerpvtiti.com, Password: staff123');
    setTimeout(() => process.exit(0), 300);
  }
);
