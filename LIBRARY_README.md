# Library Management System Documentation

## Overview
A complete Library Management System integrated into the ITI Admin Dashboard. This is a **separate business module** from ITI with its own students, staff, and financial tracking.

---

## Features

### 1. Student Management (`/admin/library/students`)
- Add/Edit/Delete library members
- Seat allocation (170 seats)
- Locker allocation (50 lockers)
- Track admission fee, monthly fee, advance paid
- Auto fee status calculation (Paid/Pending)

### 2. Seat Map (`/admin/library/seats`)
- Visual 17x10 grid (170 seats)
- Green = Available, Red = Occupied
- Click to assign/release seats

### 3. Fee Collection (`/admin/library/fees`)
- Student autocomplete search
- Monthly fee collection
- Receipt generation with:
  - **Print** - Thermal printer format (58mm)
  - **PDF** - Download for sharing
  - **WhatsApp** - Direct send formatted receipt

### 4. Expense Management (`/admin/library/expenses`)
- Fixed expenses (Rent, Electricity, WiFi)
- Variable expenses (Cleaning, Repairs, Other)
- Monthly expense tracking

### 5. Staff Management (`/admin/library/staff`)
- Add/Edit/Delete library staff
- Enable/Disable staff accounts
- Staff login system

### 6. Reports (`/admin/library/reports`)
- Daily Collection Report
- Monthly Collection Report
- Student Report
- Seat Occupancy Report
- Expense Report
- CSV Export functionality

### 7. Settings (`/admin/library/settings`)
- Library name
- Default monthly fee
- Receipt header/footer
- Contact information

---

## Database Schema

### Tables (in `server/database/db.js`)

```sql
-- Library Students/Members
library_students (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  whatsapp_number TEXT,
  has_whatsapp INTEGER DEFAULT 1,
  seat_number INTEGER,
  locker_number INTEGER,
  admission_date TEXT,
  admission_fee REAL DEFAULT 0,      -- One-time admission charge
  monthly_fee REAL DEFAULT 0,        -- Monthly fee amount
  advance_paid REAL DEFAULT 0,       -- Advance amount paid
  fee_status TEXT DEFAULT 'Pending', -- 'Paid' or 'Pending'
  next_due_date TEXT,
  status TEXT DEFAULT 'Active',
  created_at, updated_at
)

-- Library Seats (170 seats auto-initialized)
library_seats (
  id INTEGER PRIMARY KEY,
  seat_number INTEGER NOT NULL UNIQUE,
  status TEXT DEFAULT 'Available',   -- 'Available' or 'Occupied'
  student_id INTEGER,
  created_at, updated_at
)

-- Library Lockers (50 lockers auto-initialized)
library_lockers (
  id INTEGER PRIMARY KEY,
  locker_number INTEGER NOT NULL UNIQUE,
  status TEXT DEFAULT 'Available',
  student_id INTEGER,
  created_at, updated_at
)

-- Fee Collection Records
library_fees (
  id INTEGER PRIMARY KEY,
  student_id INTEGER,
  student_name TEXT,
  amount REAL NOT NULL,
  month TEXT NOT NULL,
  year TEXT NOT NULL,
  payment_mode TEXT DEFAULT 'Cash',  -- 'Cash' or 'UPI'
  payment_date TEXT,
  receipt_number TEXT UNIQUE,        -- Format: LIB{year}{month}{4-digit-random}
  collected_by TEXT,
  notes TEXT,
  created_at
)

-- Library Expenses
library_expenses (
  id INTEGER PRIMARY KEY,
  expense_type TEXT NOT NULL,        -- 'fixed' or 'variable'
  expense_name TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  added_by TEXT,
  notes TEXT,
  created_at
)

-- Library Staff
library_staff (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,            -- bcrypt hashed
  mobile TEXT,
  role TEXT DEFAULT 'staff',         -- 'admin' or 'staff'
  status TEXT DEFAULT 'Active',
  created_at, updated_at
)

-- Library Settings
library_settings (
  id INTEGER PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at
)
-- Keys: library_name, default_monthly_fee, receipt_header, receipt_footer,
--       total_seats, total_lockers, address, phone, email
```

---

## API Endpoints

### Base URL: `/api/library`

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Dashboard** |
| GET | `/dashboard` | Get dashboard stats |
| **Students** |
| GET | `/students` | List all students |
| GET | `/students/search?q=` | Search students (autocomplete) |
| GET | `/students/:id` | Get single student |
| POST | `/students` | Create student |
| PUT | `/students/:id` | Update student |
| DELETE | `/students/:id` | Delete student |
| **Seats** |
| GET | `/seats` | Get all seats with status |
| PUT | `/seats/:id/assign` | Assign seat to student |
| PUT | `/seats/:id/release` | Release seat |
| **Lockers** |
| GET | `/lockers` | Get all lockers |
| PUT | `/lockers/:id/assign` | Assign locker |
| PUT | `/lockers/:id/release` | Release locker |
| **Fees** |
| GET | `/fees` | List fee records |
| POST | `/fees/collect` | Collect fee |
| GET | `/fees/receipt/:id` | Get receipt data |
| **Expenses** |
| GET | `/expenses` | List expenses |
| POST | `/expenses` | Add expense |
| PUT | `/expenses/:id` | Update expense |
| DELETE | `/expenses/:id` | Delete expense |
| **Staff** |
| GET | `/staff` | List staff |
| POST | `/staff` | Create staff |
| PUT | `/staff/:id` | Update staff |
| DELETE | `/staff/:id` | Delete staff |
| POST | `/staff/login` | Staff login (public) |
| **Reports** |
| GET | `/reports/daily?date=` | Daily collection report |
| GET | `/reports/monthly?month=&year=` | Monthly report |
| GET | `/reports/students?status=` | Student report |
| GET | `/reports/seats` | Seat occupancy report |
| GET | `/reports/expenses?month=&year=` | Expense report |
| **Settings** |
| GET | `/settings` | Get all settings |
| PUT | `/settings` | Update settings |

---

## File Structure

```
server/
├── controllers/
│   └── library.controller.js    # All library business logic
├── routes/
│   └── library.routes.js        # API route definitions
├── database/
│   └── db.js                    # Database schema (library tables)

client/src/
├── admin/
│   └── library/
│       ├── LibraryLayout.jsx    # Sub-navigation wrapper
│       ├── LibraryDashboard.jsx # Dashboard with stats
│       ├── LibraryStudents.jsx  # Student CRUD
│       ├── LibrarySeatMap.jsx   # Visual seat grid
│       ├── LibraryFees.jsx      # Fee collection + receipts
│       ├── LibraryExpenses.jsx  # Expense management
│       ├── LibraryStaff.jsx     # Staff management
│       ├── LibraryReports.jsx   # Reports + CSV export
│       └── LibrarySettings.jsx  # Configuration
├── services/
│   └── api.js                   # API functions (library section)
├── components/
│   └── AdminLayout.jsx          # Sidebar with Library link
└── App.jsx                      # Routes configuration
```

---

## Fee Status Logic

```javascript
// Auto-calculated based on advance_paid vs monthly_fee
if (advance_paid >= monthly_fee && monthly_fee > 0) {
  fee_status = 'Paid';    // Green badge
} else {
  fee_status = 'Pending'; // Yellow badge
}
```

---

## Receipt Format

### Thermal Print (58mm width)
```
┌────────────────────┐
│   Study Library    │
│  Fee Payment Receipt│
├────────────────────┤
│ Receipt: LIB202502 │
│ Date: 03/02/2026   │
├────────────────────┤
│ Student: John Doe  │
│ Seat: #45          │
│ Month: Feb 2026    │
├────────────────────┤
│   AMOUNT PAID      │
│     Rs. 400        │
├────────────────────┤
│   Thank you!       │
└────────────────────┘
```

### WhatsApp Message Format
```
═══════════════════
   *Study Library*
   _Fee Payment Receipt_
═══════════════════
📄 *Receipt:* LIB202502XXXX
📅 *Date:* 03/02/2026
───────────────────
👤 *Student:* John Doe
💺 *Seat No:* #45
📆 *Month:* February 2026
💳 *Mode:* Cash
───────────────────
💰 *AMOUNT PAID*
      *₹ 400*
═══════════════════
✅ Thank you for your payment!
═══════════════════
```

---

## Default Credentials

### Library Admin (auto-created)
- **Email:** libadmin@library.com
- **Password:** library123

---

## How to Add New Features

### Adding a new field to Students:

1. **Database** (`server/database/db.js`):
   ```javascript
   db.run(`ALTER TABLE library_students ADD COLUMN new_field TEXT`, () => {});
   ```

2. **Controller** (`server/controllers/library.controller.js`):
   - Add field to `createStudent` INSERT query
   - Add field to `updateStudent` UPDATE query

3. **Frontend** (`client/src/admin/library/LibraryStudents.jsx`):
   - Add to `formData` state
   - Add to `openModal` function
   - Add form field in modal

4. **Restart server** to apply database changes

---

## Troubleshooting

### "Failed to load dashboard data"
- Check if logged in (adminToken in localStorage)
- Restart backend server
- Check API URL in browser console

### Seat/Locker not showing
- Restart server to initialize seats/lockers
- Check `library_seats` and `library_lockers` tables

### Fee status not updating
- Restart backend server
- Check `advance_paid` vs `monthly_fee` values

---

## Dependencies

- **Backend:** Express, SQLite3, bcryptjs, jsonwebtoken
- **Frontend:** React, React Router, Axios, Lucide Icons, React Hot Toast

---

## Contact

For questions about this module, refer to the main project documentation or contact the development team.
