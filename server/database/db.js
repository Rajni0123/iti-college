const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const init = () => {
  // Create tables
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      phone TEXT,
      avatar TEXT,
      role TEXT DEFAULT 'admin',
      permissions TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Add permissions column if it doesn't exist
    db.run(`ALTER TABLE users ADD COLUMN permissions TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding permissions column:', err.message);
      }
    });
    db.run(`ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding is_active column:', err.message);
      }
    });
    // Add name, phone, avatar columns if they don't exist (for existing databases)
    db.run(`ALTER TABLE users ADD COLUMN name TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding name column:', err.message);
      }
    });
    db.run(`ALTER TABLE users ADD COLUMN phone TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding phone column:', err.message);
      }
    });
    db.run(`ALTER TABLE users ADD COLUMN avatar TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding avatar column:', err.message);
      }
    });
    // Add updated_at column if it doesn't exist (for existing databases)
    // Note: SQLite doesn't allow CURRENT_TIMESTAMP as default when adding to existing table
    db.run(`ALTER TABLE users ADD COLUMN updated_at DATETIME`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding updated_at column:', err.message);
      } else if (!err) {
        console.log('✓ updated_at column added to users table');
        // Set initial value for existing rows
        db.run(`UPDATE users SET updated_at = created_at WHERE updated_at IS NULL`, (updateErr) => {
          if (updateErr) {
            console.error('Error setting initial updated_at values:', updateErr.message);
          }
        });
      }
    });

    // Students table
    db.run(`CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admission_id INTEGER,
      student_name TEXT NOT NULL,
      father_name TEXT,
      mother_name TEXT,
      mobile TEXT NOT NULL,
      email TEXT,
      trade TEXT NOT NULL,
      enrollment_number TEXT UNIQUE,
      admission_date TEXT,
      qualification TEXT,
      category TEXT,
      address TEXT,
      photo TEXT,
      status TEXT DEFAULT 'Active',
      academic_year TEXT,
      uidai_number TEXT,
      village_town_city TEXT,
      nearby TEXT,
      police_station TEXT,
      post_office TEXT,
      district TEXT,
      pincode TEXT,
      block TEXT,
      state TEXT,
      pwd_category TEXT,
      pwd_claim TEXT,
      class_10th_school TEXT,
      class_10th_marks_obtained TEXT,
      class_10th_total_marks TEXT,
      class_10th_percentage TEXT,
      class_10th_subject TEXT,
      class_12th_school TEXT,
      class_12th_marks_obtained TEXT,
      class_12th_total_marks TEXT,
      class_12th_percentage TEXT,
      class_12th_subject TEXT,
      session TEXT,
      shift TEXT,
      mis_iti_code TEXT DEFAULT 'PR10001156',
      declaration_agreed INTEGER DEFAULT 0,
      dob TEXT,
      gender TEXT,
      student_credit_card TEXT DEFAULT 'No',
      student_credit_card_details TEXT,
      registration_type TEXT DEFAULT 'Regular',
      state_registration TEXT,
      central_registration TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admission_id) REFERENCES admissions(id)
    )`);
    
    // Add new columns to existing students table if they don't exist
    db.run(`ALTER TABLE students ADD COLUMN uidai_number TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN village_town_city TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN nearby TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN police_station TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN post_office TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN district TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN pincode TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN block TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN state TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN pwd_category TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN pwd_claim TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN class_10th_school TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN class_10th_marks_obtained TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN class_10th_total_marks TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN class_10th_percentage TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN class_10th_subject TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN class_12th_school TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN class_12th_marks_obtained TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN class_12th_total_marks TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN class_12th_percentage TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN class_12th_subject TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN session TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN shift TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN mis_iti_code TEXT DEFAULT 'PR10001156'`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN declaration_agreed INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN dob TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN gender TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN student_credit_card TEXT DEFAULT 'No'`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN student_credit_card_details TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN registration_type TEXT DEFAULT 'Regular'`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN state_registration TEXT`, () => {});
    db.run(`ALTER TABLE students ADD COLUMN central_registration TEXT`, () => {});

    // Notices table
    db.run(`CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      pdf TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Results table
    db.run(`CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      trade TEXT NOT NULL,
      year TEXT NOT NULL,
      pdf TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Gallery table
    db.run(`CREATE TABLE IF NOT EXISTS gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image TEXT NOT NULL,
      category TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Sessions table
    db.run(`CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_name TEXT NOT NULL UNIQUE,
      start_year INTEGER NOT NULL,
      end_year INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, () => {
      // Insert default sessions if table is empty
      db.get('SELECT COUNT(*) as count FROM sessions', (err, row) => {
        if (!err && row.count === 0) {
          const currentYear = new Date().getFullYear();
          const sessions = [
            { name: `${currentYear}-${currentYear + 2}`, start: currentYear, end: currentYear + 2 },
            { name: `${currentYear + 2}-${currentYear + 4}`, start: currentYear + 2, end: currentYear + 4 },
            { name: `${currentYear + 4}-${currentYear + 6}`, start: currentYear + 4, end: currentYear + 6 }
          ];
          
          sessions.forEach(session => {
            db.run(
              'INSERT INTO sessions (session_name, start_year, end_year, is_active) VALUES (?, ?, ?, ?)',
              [session.name, session.start, session.end, 1]
            );
          });
          console.log('✓ Default sessions initialized');
        }
      });
    });

    // Admissions table
    db.run(`CREATE TABLE IF NOT EXISTS admissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      father_name TEXT NOT NULL,
      mother_name TEXT,
      mobile TEXT NOT NULL,
      email TEXT,
      trade TEXT NOT NULL,
      qualification TEXT NOT NULL,
      category TEXT NOT NULL,
      documents TEXT NOT NULL,
      status TEXT DEFAULT 'Pending',
      uidai_number TEXT,
      village_town_city TEXT,
      nearby TEXT,
      police_station TEXT,
      post_office TEXT,
      district TEXT,
      pincode TEXT,
      block TEXT,
      state TEXT,
      pwd_category TEXT,
      pwd_claim TEXT DEFAULT 'No',
      class_10th_school TEXT,
      class_10th_marks_obtained TEXT,
      class_10th_total_marks TEXT,
      class_10th_percentage TEXT,
      class_10th_subject TEXT,
      class_12th_school TEXT,
      class_12th_marks_obtained TEXT,
      class_12th_total_marks TEXT,
      class_12th_percentage TEXT,
      class_12th_subject TEXT,
      session TEXT,
      shift TEXT,
      dob TEXT,
      gender TEXT,
      student_credit_card TEXT DEFAULT 'No',
      student_credit_card_details TEXT,
      registration_type TEXT DEFAULT 'Regular',
      state_registration TEXT,
      central_registration TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Add new columns to existing admissions table if they don't exist
    db.run(`ALTER TABLE admissions ADD COLUMN mother_name TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN uidai_number TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN village_town_city TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN nearby TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN police_station TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN post_office TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN district TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN pincode TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN block TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN state TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN pwd_category TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN pwd_claim TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN class_10th_school TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN class_10th_marks_obtained TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN class_10th_total_marks TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN class_10th_percentage TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN class_10th_subject TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN class_12th_school TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN class_12th_marks_obtained TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN class_12th_total_marks TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN class_12th_percentage TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN class_12th_subject TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN session TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN shift TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN dob TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN gender TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN student_credit_card TEXT DEFAULT 'No'`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN student_credit_card_details TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN registration_type TEXT DEFAULT 'Regular'`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN state_registration TEXT`, () => {});
    db.run(`ALTER TABLE admissions ADD COLUMN central_registration TEXT`, () => {});

    // Contact table
    db.run(`CREATE TABLE IF NOT EXISTS contact (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Site Settings table
    db.run(`CREATE TABLE IF NOT EXISTS site_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Menu Management table
    db.run(`CREATE TABLE IF NOT EXISTS menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      icon TEXT,
      parent_id INTEGER,
      order_index INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Category Management table
    db.run(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      parent_id INTEGER,
      order_index INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Hero Section table
    db.run(`CREATE TABLE IF NOT EXISTS hero_section (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT,
      description TEXT,
      background_image TEXT,
      cta_text TEXT,
      cta_link TEXT,
      cta2_text TEXT,
      cta2_link TEXT,
      is_active INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Add new columns to existing hero_section table if they don't exist
    db.run(`ALTER TABLE hero_section ADD COLUMN cta2_text TEXT`, () => {});
    db.run(`ALTER TABLE hero_section ADD COLUMN cta2_link TEXT`, () => {});

    // Student Fees table (admission_id can be NULL for manual entries)
    db.run(`CREATE TABLE IF NOT EXISTS student_fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admission_id INTEGER,
      student_name TEXT NOT NULL,
      father_name TEXT,
      mobile TEXT,
      trade TEXT NOT NULL,
      fee_type TEXT NOT NULL,
      total_amount REAL NOT NULL,
      amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      due_date TEXT,
      status TEXT DEFAULT 'Pending',
      payment_date TEXT,
      payment_method TEXT,
      receipt_number TEXT,
      invoice_number TEXT,
      notes TEXT,
      installment_enabled INTEGER DEFAULT 0,
      total_installments INTEGER DEFAULT 1,
      academic_year TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admission_id) REFERENCES admissions(id)
    )`);

    // Fee Installments table for tracking individual installment payments
    db.run(`CREATE TABLE IF NOT EXISTS fee_installments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fee_id INTEGER NOT NULL,
      installment_number INTEGER NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT,
      paid_amount REAL DEFAULT 0,
      payment_date TEXT,
      payment_method TEXT,
      receipt_number TEXT,
      status TEXT DEFAULT 'Pending',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fee_id) REFERENCES student_fees(id) ON DELETE CASCADE
    )`);

    // Alter existing student_fees table to add new columns if they don't exist
    db.run(`ALTER TABLE student_fees ADD COLUMN father_name TEXT`, () => {});
    db.run(`ALTER TABLE student_fees ADD COLUMN mobile TEXT`, () => {});
    db.run(`ALTER TABLE student_fees ADD COLUMN total_amount REAL`, () => {});
    db.run(`ALTER TABLE student_fees ADD COLUMN installment_enabled INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE student_fees ADD COLUMN total_installments INTEGER DEFAULT 1`, () => {});
    db.run(`ALTER TABLE student_fees ADD COLUMN academic_year TEXT`, () => {});

    // Migration: Fix student_fees table to allow NULL admission_id
    // Check if migration is needed by trying to insert with NULL admission_id
    db.get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='student_fees'`, [], (err, row) => {
      if (row && row.sql && row.sql.includes('admission_id INTEGER NOT NULL')) {
        console.log('Migrating student_fees table to allow NULL admission_id...');
        
        // Create new table with correct schema
        db.run(`CREATE TABLE IF NOT EXISTS student_fees_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          admission_id INTEGER,
          student_name TEXT NOT NULL,
          father_name TEXT,
          mobile TEXT,
          trade TEXT NOT NULL,
          fee_type TEXT NOT NULL,
          total_amount REAL,
          amount REAL NOT NULL,
          paid_amount REAL DEFAULT 0,
          due_date TEXT,
          status TEXT DEFAULT 'Pending',
          payment_date TEXT,
          payment_method TEXT,
          receipt_number TEXT,
          invoice_number TEXT,
          notes TEXT,
          installment_enabled INTEGER DEFAULT 0,
          total_installments INTEGER DEFAULT 1,
          academic_year TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (admission_id) REFERENCES admissions(id)
        )`, (err) => {
          if (err) {
            console.error('Error creating new fees table:', err);
            return;
          }

          // Copy data from old table
          db.run(`INSERT INTO student_fees_new 
            SELECT id, admission_id, student_name, 
              COALESCE(father_name, '') as father_name, 
              COALESCE(mobile, '') as mobile, 
              trade, fee_type, 
              COALESCE(total_amount, amount) as total_amount, 
              amount, paid_amount, due_date, status, 
              payment_date, payment_method, receipt_number, invoice_number, notes,
              COALESCE(installment_enabled, 0) as installment_enabled,
              COALESCE(total_installments, 1) as total_installments,
              academic_year, created_at, updated_at 
            FROM student_fees`, (err) => {
            
            if (err) {
              console.log('No data to migrate or migration already done');
            }

            // Drop old table and rename new
            db.run(`DROP TABLE IF EXISTS student_fees_old`, () => {
              db.run(`ALTER TABLE student_fees RENAME TO student_fees_old`, (err) => {
                if (!err) {
                  db.run(`ALTER TABLE student_fees_new RENAME TO student_fees`, (err) => {
                    if (!err) {
                      db.run(`DROP TABLE IF EXISTS student_fees_old`, () => {
                        console.log('✓ student_fees table migration completed');
                      });
                    }
                  });
                }
              });
            });
          });
        });
      }
    });

    // Staff Salaries table
    db.run(`CREATE TABLE IF NOT EXISTS staff_salaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id INTEGER NOT NULL,
      staff_name TEXT,
      staff_email TEXT,
      staff_phone TEXT,
      staff_role TEXT,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      basic_salary REAL NOT NULL DEFAULT 0,
      hra REAL DEFAULT 0,
      da REAL DEFAULT 0,
      ta REAL DEFAULT 0,
      bonus REAL DEFAULT 0,
      other_allowances REAL DEFAULT 0,
      pf_deduction REAL DEFAULT 0,
      tax_deduction REAL DEFAULT 0,
      other_deductions REAL DEFAULT 0,
      gross_salary REAL DEFAULT 0,
      net_salary REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'Cash',
      payment_date TEXT,
      slip_number TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (staff_id) REFERENCES users(id)
    )`);

    // Flash News table
    db.run(`CREATE TABLE IF NOT EXISTS flash_news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      link TEXT,
      is_active INTEGER DEFAULT 1,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Header Settings table
    db.run(`CREATE TABLE IF NOT EXISTS header_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT,
      email TEXT,
      student_portal_link TEXT,
      student_portal_text TEXT,
      ncvt_mis_link TEXT,
      ncvt_mis_text TEXT,
      staff_email_link TEXT,
      staff_email_text TEXT,
      logo_text TEXT,
      tagline TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Footer Settings table
    db.run(`CREATE TABLE IF NOT EXISTS footer_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      about_text TEXT,
      facebook_link TEXT,
      twitter_link TEXT,
      linkedin_link TEXT,
      youtube_link TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      copyright_text TEXT,
      privacy_link TEXT,
      terms_link TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Footer Quick Links table
    db.run(`CREATE TABLE IF NOT EXISTS footer_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      category TEXT DEFAULT 'quick_links',
      order_index INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Trades table
    db.run(`CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      image TEXT,
      syllabus_pdf TEXT,
      prospectus_pdf TEXT,
      duration TEXT NOT NULL,
      eligibility TEXT NOT NULL,
      seats TEXT NOT NULL,
      syllabus_json TEXT,
      careers_json TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating trades table:', err);
      } else {
        console.log('✓ Trades table initialized');
        // Add prospectus_pdf column if it doesn't exist (for existing databases)
        db.run(`ALTER TABLE trades ADD COLUMN prospectus_pdf TEXT`, (alterErr) => {
          if (alterErr && !alterErr.message.includes('duplicate column')) {
            console.error('Error adding prospectus_pdf column:', alterErr);
          } else if (!alterErr) {
            console.log('✓ Added prospectus_pdf column to trades table');
          }
        });
      }
    });

    // Insert default trades if not exists
    db.get('SELECT COUNT(*) as count FROM trades', [], (err, row) => {
      if (err) {
        console.error('Error checking trades table:', err);
        return;
      }
      
      const tradeCount = row?.count || 0;
      console.log(`Trades table contains ${tradeCount} records`);
      
      if (tradeCount === 0) {
        console.log('Seeding default trades...');
        const defaultTrades = [
          [
            'Electrician',
            'electrician',
            'Engineering Trade',
            'Master the skills of electrical systems, power distribution, domestic wiring, and industrial machinery maintenance in our state-of-the-art workshops equipped with modern testing tools.',
            'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=60',
            null,
            '2 Years (4 Semesters)',
            '10th Pass (Science & Math)',
            '60 Seats (Per Session)',
            JSON.stringify([
              { title: 'Semester 1: Basics of Electricity & Tools', topics: ['Safety precautions and first aid', 'Hand tools and their uses', 'Fundamental of electricity and Ohm\'s law', 'Common electrical fittings and accessories', 'Basic wiring concepts'] },
              { title: 'Semester 2: Wiring and Battery Systems', topics: ['Domestic wiring installation', 'Types of wiring systems', 'Battery charging and maintenance', 'Electrical measuring instruments', 'Earthing and safety devices'] },
              { title: 'Semester 3: Motors, Alternators & Transformers', topics: ['AC & DC motors working principles', 'Motor maintenance and troubleshooting', 'Single phase transformers', 'Three phase systems', 'Industrial wiring'] },
              { title: 'Semester 4: Advanced Systems & PLC', topics: ['PLC basics and programming', 'Industrial automation', 'Solar panel installation', 'Project work and internship', 'Industry exposure training'] }
            ]),
            JSON.stringify([
              { title: 'Public Sector', description: 'Opportunities in Railways, BSNL, Electricity Boards (MSEB, UPPCL), and DRDO.' },
              { title: 'Private Industries', description: 'Maintenance electrician roles in automobile, manufacturing, and textile plants.' },
              { title: 'Self-Employment', description: 'Start your own electrical consulting, domestic wiring, or repair shop.' },
              { title: 'Renewable Energy', description: 'Technician roles in the fast-growing Solar and Wind power installation sectors.' }
            ]),
            1
          ],
          [
            'Fitter',
            'fitter',
            'Engineering Trade',
            'Learn precision fitting, assembly, and maintenance of mechanical components. Master the use of measuring instruments, machine tools, and modern manufacturing techniques.',
            'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&auto=format&fit=crop&q=60',
            null,
            '2 Years (4 Semesters)',
            '10th Pass (Science & Math)',
            '40 Seats (Per Session)',
            JSON.stringify([
              { title: 'Semester 1: Basic Fitting & Hand Tools', topics: ['Workshop safety and housekeeping', 'Measuring instruments - Vernier, Micrometer', 'Filing, sawing, and chipping operations', 'Drilling and tapping', 'Basic fitting exercises'] },
              { title: 'Semester 2: Machine Operations', topics: ['Lathe machine operations', 'Milling machine basics', 'Grinding operations', 'Sheet metal work', 'Assembly techniques'] },
              { title: 'Semester 3: Advanced Fitting', topics: ['Precision fitting and assembly', 'Hydraulic and pneumatic systems', 'Bearings and lubrication', 'Maintenance practices', 'Quality control basics'] },
              { title: 'Semester 4: Industrial Applications', topics: ['CNC machine basics', 'Industrial maintenance', 'Project work', 'Industry internship', 'Soft skills training'] }
            ]),
            JSON.stringify([
              { title: 'Manufacturing', description: 'Work in automobile, aerospace, and heavy machinery manufacturing units.' },
              { title: 'Maintenance', description: 'Industrial maintenance technician in factories and power plants.' },
              { title: 'Defense Sector', description: 'Technical positions in ordnance factories and defense establishments.' },
              { title: 'Entrepreneurship', description: 'Start fabrication workshops or precision machining businesses.' }
            ]),
            1
          ]
        ];
        
        let insertedCount = 0;
        let errorCount = 0;
        
        defaultTrades.forEach(([name, slug, category, description, image, syllabus_pdf, duration, eligibility, seats, syllabus_json, careers_json, is_active], index) => {
          db.run('INSERT INTO trades (name, slug, category, description, image, syllabus_pdf, duration, eligibility, seats, syllabus_json, careers_json, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [name, slug, category, description, image, syllabus_pdf, duration, eligibility, seats, syllabus_json, careers_json, is_active],
            (err) => {
              if (err) {
                if (!err.message.includes('UNIQUE')) {
                  console.error(`Error creating trade "${name}":`, err.message);
                  errorCount++;
                }
              } else {
                insertedCount++;
                console.log(`  ✓ Created trade: ${name}`);
              }
              
              // Log summary after all trades are processed
              if (index === defaultTrades.length - 1) {
                if (insertedCount > 0) {
                  console.log(`✓ Successfully seeded ${insertedCount} default trades`);
                }
                if (errorCount > 0) {
                  console.warn(`⚠ ${errorCount} trades failed to seed`);
                }
              }
            }
          );
        });
      } else {
        console.log('✓ Trades table already contains data, skipping seed');
      }
    });

    // Insert default categories if not exists
    db.get('SELECT * FROM categories LIMIT 1', [], (err, row) => {
      if (!row) {
        const defaultCategories = [
          ['Electrician', 'electrician', 'Electrician trade course covering electrical installation, maintenance and repair', null, 1, 1],
          ['Fitter', 'fitter', 'Fitter trade course covering fitting, assembly and maintenance of machinery', null, 2, 1],
          ['Workshop', 'workshop', 'Workshop and practical training facilities', null, 3, 1],
          ['Infrastructure', 'infrastructure', 'Campus infrastructure and facilities', null, 4, 1],
          ['Events', 'events', 'College events and activities', null, 5, 1],
          ['Notices', 'notices', 'Important announcements and notices', null, 6, 1],
          ['Results', 'results', 'Examination results and achievements', null, 7, 1],
          ['Placements', 'placements', 'Placement drives and job opportunities', null, 8, 1]
        ];
        
        defaultCategories.forEach(([name, slug, description, parent_id, order_index, is_active]) => {
          db.run('INSERT INTO categories (name, slug, description, parent_id, order_index, is_active) VALUES (?, ?, ?, ?, ?, ?)', 
            [name, slug, description, parent_id, order_index, is_active],
            (err) => {
              if (err && !err.message.includes('UNIQUE')) {
                console.error('Error creating category:', err);
              }
            }
          );
        });
        console.log('Default categories created');
      }
    });

    // Insert default hero section if not exists
    db.get('SELECT * FROM hero_section LIMIT 1', [], (err, row) => {
      if (!row) {
        db.run(`INSERT INTO hero_section (title, subtitle, description, background_image, cta_text, cta_link, cta2_text, cta2_link, is_active) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            'Shape Your Future With Technical Excellence.',
            'ADMISSION OPEN 2024-25',
            "Join the region's leading private ITI to master high-demand technical skills and get 100% placement assistance.",
            'https://lh3.googleusercontent.com/aida-public/AB6AXuBdxCMlJMLVeJ6DemcOw2AIihGbiepX5MPWU8r750l9Vi7pmoTzGVhz-NKXuc0hRLtAOeE2CZfns5-KQWaN0o2jpL8zRMJ1F89VY4gQ1ZRt4NphdCl-E5D7SwEf22H9m9gjfOqbWYea0KCzyZ-fxa4KlT9Go5DizC2onmz_rywidkbWavMPS_UfzoIviQGKr7k5bwI46H13I34QQp4Z9JggtUXLiUm-Wl23DEPPI7_Jcr28lI7YfGgXmL23AqXcG5UU1n0O1njDu__y',
            'Apply Online Now',
            '/apply-admission',
            'Explore Trades',
            '/trades',
            1
          ],
          (err) => {
            if (err) {
              console.error('Error creating default hero section:', err);
            } else {
              console.log('Default hero section created');
            }
          }
        );
      }
    });

    // Insert default navigation menus if not exists
    db.get('SELECT * FROM menus LIMIT 1', [], (err, row) => {
      if (!row) {
        const defaultMenus = [
          ['Home', '/', null, null, 1, 1],
          ['About', '/about', null, null, 2, 1],
          ['Trades', '/trades', null, null, 3, 1],
          ['Admission', '/admission-process', null, null, 4, 1],
          ['Results', '/results', null, null, 5, 1],
          ['Faculty', '/faculty', null, null, 6, 1],
          ['Gallery', '/infrastructure', null, null, 7, 1],
          ['Contact', '/contact', null, null, 8, 1]
        ];
        
        defaultMenus.forEach(([title, url, icon, parent_id, order_index, is_active]) => {
          db.run('INSERT INTO menus (title, url, icon, parent_id, order_index, is_active) VALUES (?, ?, ?, ?, ?, ?)', 
            [title, url, icon, parent_id, order_index, is_active],
            (err) => {
              if (err) {
                console.error('Error creating menu:', err);
              }
            }
          );
        });
        console.log('Default navigation menus created');
      }
    });

    // Insert default header settings
    db.get('SELECT * FROM header_settings LIMIT 1', [], (err, row) => {
      if (!row) {
        db.run(`INSERT INTO header_settings (phone, email, student_portal_link, student_portal_text, ncvt_mis_link, ncvt_mis_text, staff_email_link, staff_email_text, logo_text, tagline) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['+91-9155401839', 'manerpvtiti@gmail.com', '#', 'Student Portal', 'https://ncvtmis.gov.in', 'NCVT MIS', '#', 'Staff Email', 'Maner Pvt ITI', 'Skill India | Digital India']
        );
      }
    });

    // Insert default footer settings
    db.get('SELECT * FROM footer_settings LIMIT 1', [], (err, row) => {
      if (!row) {
        db.run(`INSERT INTO footer_settings (about_text, facebook_link, twitter_link, linkedin_link, youtube_link, address, phone, email, copyright_text, privacy_link, terms_link) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ['A premier private institute for vocational training, committed to creating skilled manpower for the modern industrial era with industry-aligned courses.', 
           '#', '#', '#', '#', 
           'Maner, Mahinawan, Near Vishwakarma Mandir, Maner, Patna - 801108',
           '+91-9155401839', 'manerpvtiti@gmail.com',
           '© 2024 Maner Pvt ITI. All Rights Reserved.',
           '#', '#']
        );
      }
    });

    // About page table
    db.run(`CREATE TABLE IF NOT EXISTS about_page (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hero_title TEXT NOT NULL,
      hero_subtitle TEXT,
      hero_description TEXT,
      hero_image TEXT,
      about_title TEXT,
      about_description TEXT,
      about_image TEXT,
      mission_title TEXT,
      mission_description TEXT,
      vision_title TEXT,
      vision_description TEXT,
      principal_name TEXT,
      principal_message TEXT,
      principal_image TEXT,
      stats_json TEXT,
      values_json TEXT,
      features_json TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating about_page table:', err);
      } else {
        console.log('✓ About page table initialized');
        // Insert default about page content if not exists
        db.get('SELECT * FROM about_page LIMIT 1', [], (err, row) => {
          if (!row) {
            const defaultStats = JSON.stringify([
              { icon: 'GraduationCap', value: '500+', label: 'Students Trained' },
              { icon: 'Briefcase', value: '95%', label: 'Placement Rate' },
              { icon: 'Award', value: '2', label: 'NCVT Trades' },
              { icon: 'Users', value: '15+', label: 'Expert Faculty' }
            ]);
            const defaultValues = JSON.stringify([
              { icon: 'ShieldCheck', title: 'Excellence', description: 'We strive for excellence in every aspect of technical education and training.' },
              { icon: 'Heart', title: 'Integrity', description: 'We maintain the highest standards of honesty and ethical conduct in all our operations.' },
              { icon: 'TrendingUp', title: 'Innovation', description: 'We embrace modern teaching methods and cutting-edge technology in our curriculum.' },
              { icon: 'Users', title: 'Student-Centric', description: 'Our students are at the heart of everything we do, ensuring their success and growth.' }
            ]);
            const defaultFeatures = JSON.stringify([
              { icon: 'BookOpen', title: 'Industry-Aligned Curriculum', description: 'Our courses are designed in collaboration with industry experts to ensure relevance and practical applicability.' },
              { icon: 'Zap', title: 'Hands-On Training', description: 'Extensive practical training in well-equipped workshops with modern tools and machinery.' },
              { icon: 'Briefcase', title: 'Placement Assistance', description: 'Dedicated placement cell that connects students with leading companies and industries.' },
              { icon: 'Award', title: 'NCVT Certification', description: 'All courses are NCVT certified, providing nationwide recognition and better career opportunities.' }
            ]);
            
            db.run(`INSERT INTO about_page (
              hero_title, hero_subtitle, hero_description, hero_image,
              about_title, about_description, about_image,
              mission_title, mission_description,
              vision_title, vision_description,
              principal_name, principal_message, principal_image,
              stats_json, values_json, features_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                'Shaping Futures Through',
                'Technical Excellence',
                'Maner Pvt ITI is a premier institution committed to providing quality vocational training and empowering students with industry-relevant technical skills.',
                'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=80',
                'About Maner Pvt ITI',
                'Maner Pvt ITI has been a pioneer in technical education, providing quality training to students and preparing them for successful careers in various trades. We are committed to excellence in technical education and skill development.\n\nOur institution is recognized by the government and follows the curriculum set by the National Council for Vocational Training (NCVT). We have state-of-the-art infrastructure and experienced faculty members dedicated to student success.',
                'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=80',
                'Our Mission',
                'To provide quality technical education and skill development training that empowers students with industry-relevant skills, fostering employability and entrepreneurship. We aim to bridge the gap between education and industry requirements.',
                'Our Vision',
                'To become a leading institution in technical education, recognized for excellence in skill development and producing skilled professionals who contribute to the nation\'s industrial growth and development.',
                'Dr. Rajesh Kumar',
                'Welcome to Maner Pvt ITI, a premier institution committed to providing quality vocational training. Our mission is to empower students with technical skills that align with industry demands, ensuring successful careers and contributing to nation-building.',
                'https://lh3.googleusercontent.com/aida-public/AB6AXuCNxEaoEaDN2RG5KPxRiN6ylbDwfNpM-Cy5JHvNgvtYKaCyfaWqgvOb23E4Xi01HEJVymR6l6scH3XPEQcL3HfTG5CuxYnFt_qLECUasV7kcA8mNAiY9QAjnvTg3CIlHHq9lwNVglOYWVNeTMFgIT5tEj53mGvRf1Qp4iXLFnrKD2PS8mauQf3Ga2b1zZDCADG9qp3RQQi_fMYTt8HcKhHHEYgRYCNqQMUe3QxDOs_g6YhNJVSuQFVvq2iRAWXZJ6kvYqqalJCBskYe',
                defaultStats,
                defaultValues,
                defaultFeatures
              ],
              (err) => {
                if (err) {
                  console.error('Error creating default about page:', err);
                } else {
                  console.log('✓ Default about page content created');
                }
              }
            );
          }
        });
      }
    });

    // Admission Process table
    db.run(`CREATE TABLE IF NOT EXISTS admission_process (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hero_title TEXT NOT NULL,
      hero_subtitle TEXT,
      hero_description TEXT,
      eligibility_title TEXT,
      eligibility_criteria_json TEXT,
      steps_title TEXT,
      steps_json TEXT,
      dates_title TEXT,
      important_dates_json TEXT,
      documents_title TEXT,
      required_documents_json TEXT,
      cta_title TEXT,
      cta_description TEXT,
      cta_button_text TEXT,
      cta_button_link TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating admission_process table:', err);
      } else {
        console.log('✓ Admission process table initialized');
        // Insert default admission process content if not exists
        db.get('SELECT * FROM admission_process LIMIT 1', [], (err, row) => {
          if (!row) {
            const defaultEligibility = JSON.stringify([
              'Minimum qualification: 10th Pass from a recognized board (CBSE, State Board, or equivalent)',
              'Age limit: 14-40 years (age relaxation as per government norms for reserved categories)',
              'Medical fitness certificate from a registered medical practitioner is mandatory',
              'Reserved category candidates (SC/ST/OBC) must provide valid caste certificate',
              'Candidates must be Indian nationals or have valid citizenship documents',
              'No minimum percentage required, but candidates should have passed all subjects',
              'Physical fitness is essential for workshop-based practical training'
            ]);
            const defaultSteps = JSON.stringify([
              { number: 1, title: 'Online Registration', description: 'Initial signup and form filling on the college portal. Ensure all details match your certificates.', icon: 'FileText' },
              { number: 2, title: 'Merit List Publication', description: 'Official ranking list released based on academic scores. Check the website notifications regularly.', icon: 'CheckCircle' },
              { number: 3, title: 'Document Verification', description: 'Physical validation of original documents on-campus by the admission committee.', icon: 'UserCheck' },
              { number: 4, title: 'Fee Payment', description: 'Final seat confirmation via online or counter payment. Secure your admission officially.', icon: 'CreditCard' }
            ]);
            const defaultDates = JSON.stringify([
              { event: 'Admission Start Date', date: '2024-04-01' },
              { event: 'Last Date for Application', date: '2024-05-31' },
              { event: 'Merit List Publication', date: '2024-06-15' },
              { event: 'Document Verification', date: '2024-06-20' },
              { event: 'Classes Begin', date: '2024-07-01' }
            ]);
            const defaultDocuments = JSON.stringify([
              '10th Marksheet (Original + 2 self-attested copies)',
              'Aadhaar Card (Original + 2 self-attested copies)',
              'Recent Photographs (4 passport size with white background)',
              'Medical Certificate (Fitness certificate from MBBS doctor)',
              'Caste Certificate (For reservation benefits - OBC/SC/ST)',
              'Income Certificate (For scholarship applications)',
              'Domicile Certificate (Proof of residence certificate)',
              'Transfer Certificate (Original from previous institution)'
            ]);
            
            db.run(`INSERT INTO admission_process (
              hero_title, hero_subtitle, hero_description,
              eligibility_title, eligibility_criteria_json,
              steps_title, steps_json,
              dates_title, important_dates_json,
              documents_title, required_documents_json,
              cta_title, cta_description, cta_button_text, cta_button_link
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                'Admission Process',
                'Your Journey to Technical Excellence Starts Here',
                'Follow our simple and transparent admission process to secure your seat in our NCVT certified courses.',
                'Eligibility Criteria',
                defaultEligibility,
                'Admission Journey',
                defaultSteps,
                'Important Dates',
                defaultDates,
                'Required Documents Checklist',
                defaultDocuments,
                'Ready to Start?',
                'Join ITI College today and shape your future with technical excellence.',
                'Apply Now',
                '/apply-admission'
              ],
              (err) => {
                if (err) {
                  console.error('Error creating default admission process:', err);
                } else {
                  console.log('✓ Default admission process content created');
                }
              }
            );
          }
        });
      }
    });

    // Faculty table
    db.run(`CREATE TABLE IF NOT EXISTS faculty (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      designation TEXT NOT NULL,
      department TEXT NOT NULL,
      qualification TEXT,
      experience TEXT,
      image TEXT,
      email TEXT,
      phone TEXT,
      bio TEXT,
      specialization TEXT,
      is_principal INTEGER DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating faculty table:', err);
      } else {
        console.log('✓ Faculty table initialized');
        // Insert default faculty if not exists
        db.get('SELECT COUNT(*) as count FROM faculty', [], (err, row) => {
          if (!row || row.count === 0) {
            const defaultFaculty = [
              // Principal
              {
                name: 'Dr. Arvind Sharma',
                designation: 'Principal & Head of Institution',
                department: 'Administration',
                qualification: 'Ph.D. in Vocational Education',
                experience: '25+ Years Experience',
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOagc40LL98nGNUMYNAJ1_JoA2_4AkyploUaa6Q0-55wJkZWR29iumZZDLxsN6EUbeMrLlYYUUJ4qJy3YyDpTZL9XRCdHFQww3_I1jLSmRi5ErCUwYP0urhrfbsu-t9nb7fapce8DYhlSU6IgtxPCKG0x1J1sx6EBLBi72x2UH_jFiVdsoPmMPNfwQqM523RM1v-h7eJZwbW3ObljHyUQbRvVEz034ByHxRiS1zqWL8gRTz80STjoh2hwP4ie6AY-cjUy-KRaFUZwG',
                email: 'principal@iticollege.edu',
                phone: '+91 123 456 7890',
                bio: 'Our mission is to provide industry-aligned technical education that empowers students with practical skills and the professional ethics needed to excel in today\'s competitive global workforce.',
                specialization: 'Educational Leadership, Vocational Training',
                is_principal: 1,
                display_order: 0
              },
              // Faculty members
              {
                name: 'Mr. Rajesh Kumar',
                designation: 'Senior Instructor',
                department: 'Electrician',
                qualification: 'B.Tech in Electrical Eng.',
                experience: '12+ Years Experience',
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOhtbIL0DSFOaQRkGvisOwxQ2gGkdK9wS2NDAQbv2Yil_aTRYcX7KipK1pe6UDTzWImkC5LkpB7OtPPUMc1sXKAiyKeSwW_bWP8Fbg-hCiJpUypWa-fxbn7kkngYPCXvg4iC0EzGvsoeV5DRiYb20MjbkWXpoWbuUyh2AxGaAwhzdYRuRR4WnjT8sWBedbQF88DNVKnUvcDKdun1oq_NOB-agVIQ0Fc0qM_ppAmEWZLUqum4kkrtrCCt0piW_VHFSU67rNVZHSYIVC',
                email: 'rajesh.kumar@iticollege.edu',
                phone: '+91 123 456 7891',
                bio: 'Expert in electrical systems and industrial wiring',
                specialization: 'Electrical Systems, Industrial Automation',
                is_principal: 0,
                display_order: 1
              },
              {
                name: 'Ms. Anita Deshmukh',
                designation: 'Head of Workshop',
                department: 'Fitter',
                qualification: 'M.Tech Mechanical',
                experience: '8+ Years Experience',
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOJzLsSnadlTRSj4GMD0s_70Yp3DdPcfuCN_ZST14CHIb6qV2BF9aXaoUTs0r_c_wX65HFkF2-xDbra-MUjacuCHbwsvoLZwjoI7qwNtIbO7dTXJ5TxeljcnR0qzt8i45sEMH9t0UQf9q-JN2-zMJxPQt6uOQ0jOVDRcvSrTx__dRETUGTgdjbO1jCt5I2cFoShNQqrjBYTWPquC-9j4wwu4_NR-_pozTBOz6TZJp1-kPcnDZh7x0hlNMMqKLy_OUYMfOoDTZtZByN',
                email: 'anita.deshmukh@iticollege.edu',
                phone: '+91 123 456 7892',
                bio: 'Specialized in mechanical fitting and workshop management',
                specialization: 'Mechanical Fitting, CNC Operations',
                is_principal: 0,
                display_order: 2
              },
              {
                name: 'Mr. Amit Patel',
                designation: 'Assistant Professor',
                department: 'Computer Science',
                qualification: 'MCA, CISCO Certified',
                experience: '6+ Years Experience',
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAf8Hd17nhQLKKhRFFwIXPgltbSiOiW8VEyeSx2vbiFuFG_69BzriEw9RTSO9qI5KeAZxMVcB7usMWzyt0eijBprnvmXrxi8kwI4FXdB3TL-sl79eYLp98YT79FL7z5EEADA8VWmfJBxxeq5x_g-JvS0lF10eNCxIEom4AfE3Xco4Qd5InE2AYGrlfdNx70HCkWOBWUx_Ws8psX6LhTf6-xaweS732FnU9KHh1ffFqx6_FZJOniSsD-ObxWt3kVvZ-Dpyt8FGhvVRI-',
                email: 'amit.patel@iticollege.edu',
                phone: '+91 123 456 7893',
                bio: 'IT expert with focus on networking and programming',
                specialization: 'Network Administration, Web Development',
                is_principal: 0,
                display_order: 3
              },
              {
                name: 'Mrs. Sunita Verma',
                designation: 'Head Registrar',
                department: 'Administration',
                qualification: 'MBA (Admin)',
                experience: '15+ Years Experience',
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUynTkx-t5BmCvfVYPUPX_kqQrqfEMC1y-4WImINaQ_RY6-5Zu7U9FMq1fBnUN8gUrGttFwMMZU4RyVety9LsE0i4e-qTP1FCAAm4_ccNf8GMR74TYNV6NiZNHKVWwkcyb4vmiu2q_YLliGqKyi0vDRBN0qUqEuJ7jbN9aJvaYUsE54O8dK4fQEPCmU213FY6u6OtZ-IGDuF4pS4cOdMzcOMj5VskfQzBPCx6mo4f_yMZKTiSjAVmZvs7B-IQ82rpOtsP2hfR_JEw4',
                email: 'sunita.verma@iticollege.edu',
                phone: '+91 123 456 7894',
                bio: 'Efficient administrative professional managing student records',
                specialization: 'Administration, Student Management',
                is_principal: 0,
                display_order: 4
              },
              {
                name: 'Mr. Vijay Singh',
                designation: 'Trade Lead',
                department: 'Fitter',
                qualification: 'B.Tech Automobile',
                experience: '10+ Years Experience',
                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-xDJcrZSbnSt3borU94eqS4dXLY1HAMCvSCQiLgflJyYh2vp60CjllXW21KQ6QPIcyq80qOqg8h8xtZ7pgtnaRrcHhLvr8LRnqzHBWGEra1pzaphd2mxHUfzTINxho3li3Cxw5Z-ToqAt2-9jTTInxsWod6e4ccltmSl8CanPgaLV5HV_brxNaf20lYQXvkh2ZOu63kgZGGGAQs1iZ1di6R8020gYj_CbrNDhu5v7zRAydpUsrihJyAnB71sis3XRDumPMsrw_yhY',
                email: 'vijay.singh@iticollege.edu',
                phone: '+91 123 456 7895',
                bio: 'Automotive expert with hands-on industry experience',
                specialization: 'Automobile Engineering, Diesel Mechanics',
                is_principal: 0,
                display_order: 5
              }
            ];

            let insertedCount = 0;
            defaultFaculty.forEach((faculty, index) => {
              db.run(`INSERT INTO faculty (
                name, designation, department, qualification, experience,
                image, email, phone, bio, specialization, is_principal, display_order
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  faculty.name, faculty.designation, faculty.department,
                  faculty.qualification, faculty.experience, faculty.image,
                  faculty.email, faculty.phone, faculty.bio,
                  faculty.specialization, faculty.is_principal, faculty.display_order
                ],
                (err) => {
                  if (err) {
                    console.error(`Error creating faculty ${faculty.name}:`, err);
                  } else {
                    insertedCount++;
                    if (insertedCount === defaultFaculty.length) {
                      console.log(`✓ Default faculty members created (${insertedCount} records)`);
                    }
                  }
                }
              );
            });
          } else {
            console.log(`✓ Faculty table already contains ${row.count} records, skipping seed`);
          }
        });
      }
    });

    // Insert default site settings
    db.get('SELECT * FROM site_settings WHERE setting_key = ?', ['header_text'], (err, row) => {
      if (!row) {
        const defaultSettings = [
          ['header_text', 'Admission Open for the Academic Session 2024-25. Apply now to secure your seat in Electrician and Fitter trades.'],
          ['principal_name', 'Dr. Rajesh Kumar'],
          ['principal_message', 'Welcome to Maner Pvt ITI, a premier institution committed to providing quality vocational training. Our mission is to empower students with technical skills that align with industry demands, ensuring successful careers and contributing to nation-building.'],
          ['principal_image', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCNxEaoEaDN2RG5KPxRiN6ylbDwfNpM-Cy5JHvNgvtYKaCyfaWqgvOb23E4Xi01HEJVymR6l6scH3XPEQcL3HfTG5CuxYnFt_qLECUasV7kcA8mNAiY9QAjnvTg3CIlHHq9lwNVglOYWVNeTMFgIT5tEj53mGvRf1Qp4iXLFnrKD2PS8mauQf3Ga2b1zZDCADG9qp3RQQi_fMYTt8HcKhHHEYgRYCNqQMUe3QxDOs_g6YhNJVSuQFVvq2iRAWXZJ6kvYqqalJCBskYe'],
          ['credit_card_enabled', 'true'],
          ['credit_card_title', 'Student Credit Card Facility Available'],
          ['credit_card_description', 'Get financial support through Bihar Student Credit Card Scheme. Apply for interest-free loans up to ₹4 Lakhs for your technical education.']
        ];
        
        defaultSettings.forEach(([key, value]) => {
          db.run('INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)', [key, value]);
        });
      }
    });

    // Create default admin user if not exists
    db.get('SELECT * FROM users WHERE email = ?', ['admin@iticollege.edu'], (err, row) => {
      if (err) {
        console.error('Error checking admin user:', err);
        return;
      }
      if (!row) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.run(
          'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
          ['admin@iticollege.edu', hashedPassword, 'admin'],
          (err) => {
            if (err) {
              console.error('Error creating admin user:', err);
            } else {
              console.log('Default admin user created: admin@iticollege.edu / admin123');
            }
          }
        );
      }
    });

    // ========================================
    // LIBRARY MANAGEMENT SYSTEM TABLES
    // ========================================

    // Library Students/Members table
    db.run(`CREATE TABLE IF NOT EXISTS library_students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      whatsapp_number TEXT,
      has_whatsapp INTEGER DEFAULT 1,
      seat_number INTEGER,
      locker_number INTEGER,
      admission_date TEXT,
      monthly_fee REAL DEFAULT 0,
      fee_status TEXT DEFAULT 'Unpaid',
      next_due_date TEXT,
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating library_students table:', err);
      } else {
        console.log('✓ Library students table initialized');
      }
    });

    // Add new columns to library_students if they don't exist
    db.run(`ALTER TABLE library_students ADD COLUMN admission_fee REAL DEFAULT 0`, () => {});
    db.run(`ALTER TABLE library_students ADD COLUMN advance_paid REAL DEFAULT 0`, () => {});

    // Library Seats table (170 seats)
    db.run(`CREATE TABLE IF NOT EXISTS library_seats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seat_number INTEGER NOT NULL UNIQUE,
      status TEXT DEFAULT 'Available',
      student_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES library_students(id) ON DELETE SET NULL
    )`, (err) => {
      if (err) {
        console.error('Error creating library_seats table:', err);
      } else {
        console.log('✓ Library seats table initialized');
        // Initialize 170 seats if table is empty
        db.get('SELECT COUNT(*) as count FROM library_seats', [], (err, row) => {
          if (!err && row && row.count === 0) {
            console.log('Initializing 170 library seats...');
            for (let i = 1; i <= 170; i++) {
              db.run('INSERT INTO library_seats (seat_number, status) VALUES (?, ?)', [i, 'Available']);
            }
            console.log('✓ 170 library seats created');
          }
        });
      }
    });

    // Library Lockers table
    db.run(`CREATE TABLE IF NOT EXISTS library_lockers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      locker_number INTEGER NOT NULL UNIQUE,
      status TEXT DEFAULT 'Available',
      student_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES library_students(id) ON DELETE SET NULL
    )`, (err) => {
      if (err) {
        console.error('Error creating library_lockers table:', err);
      } else {
        console.log('✓ Library lockers table initialized');
        // Initialize 50 lockers if table is empty
        db.get('SELECT COUNT(*) as count FROM library_lockers', [], (err, row) => {
          if (!err && row && row.count === 0) {
            console.log('Initializing 50 library lockers...');
            for (let i = 1; i <= 50; i++) {
              db.run('INSERT INTO library_lockers (locker_number, status) VALUES (?, ?)', [i, 'Available']);
            }
            console.log('✓ 50 library lockers created');
          }
        });
      }
    });

    // Library Fees table
    db.run(`CREATE TABLE IF NOT EXISTS library_fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      student_name TEXT,
      amount REAL NOT NULL,
      month TEXT NOT NULL,
      year INTEGER NOT NULL,
      payment_mode TEXT DEFAULT 'Cash',
      payment_date TEXT,
      receipt_number TEXT,
      collected_by TEXT,
      status TEXT DEFAULT 'Paid',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES library_students(id) ON DELETE CASCADE
    )`, (err) => {
      if (err) {
        console.error('Error creating library_fees table:', err);
      } else {
        console.log('✓ Library fees table initialized');
      }
    });

    // Library Expenses table
    db.run(`CREATE TABLE IF NOT EXISTS library_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_type TEXT NOT NULL,
      expense_name TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      added_by TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating library_expenses table:', err);
      } else {
        console.log('✓ Library expenses table initialized');
      }
    });

    // Library Staff table
    db.run(`CREATE TABLE IF NOT EXISTS library_staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      mobile TEXT,
      role TEXT DEFAULT 'staff',
      status TEXT DEFAULT 'Active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating library_staff table:', err);
      } else {
        console.log('✓ Library staff table initialized');
        // Create default library admin if not exists
        db.get('SELECT * FROM library_staff WHERE email = ?', ['libadmin@library.com'], (err, row) => {
          if (!err && !row) {
            const hashedPassword = bcrypt.hashSync('library123', 10);
            db.run(
              'INSERT INTO library_staff (name, email, password, role) VALUES (?, ?, ?, ?)',
              ['Library Admin', 'libadmin@library.com', hashedPassword, 'admin'],
              (err) => {
                if (err) {
                  console.error('Error creating library admin:', err);
                } else {
                  console.log('✓ Default library admin created: libadmin@library.com / library123');
                }
              }
            );
          }
        });
      }
    });

    // Library Settings table
    db.run(`CREATE TABLE IF NOT EXISTS library_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating library_settings table:', err);
      } else {
        console.log('✓ Library settings table initialized');
        // Insert default settings if not exists
        db.get('SELECT COUNT(*) as count FROM library_settings', [], (err, row) => {
          if (!err && row && row.count === 0) {
            const defaultSettings = [
              ['library_name', 'Study Library'],
              ['default_monthly_fee', '500'],
              ['receipt_header', 'Study Library - Fee Receipt'],
              ['receipt_footer', 'Thank you for your payment'],
              ['total_seats', '170'],
              ['total_lockers', '50'],
              ['address', ''],
              ['phone', ''],
              ['email', '']
            ];
            defaultSettings.forEach(([key, value]) => {
              db.run('INSERT INTO library_settings (setting_key, setting_value) VALUES (?, ?)', [key, value]);
            });
            console.log('✓ Default library settings created');
          }
        });
      }
    });

  });
};

const getDb = () => db;

module.exports = { init, getDb };
