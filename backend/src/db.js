const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let pool = null;
let embeddedPgInstance = null;

function normalizeQuery(sql) {
  let index = 1;
  // Convert ? placeholders to PostgreSQL $1, $2, ...
  let normalized = sql.replace(/\?/g, () => `$${index++}`);
  // Normalize SQLite date functions to PostgreSQL standard
  normalized = normalized.replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');
  return normalized;
}

async function ensurePostgresServer() {
  const connString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/digital_campus_pass';
  const url = new URL(connString);
  const host = url.hostname;
  const port = parseInt(url.port || '5432', 10);
  const user = url.username || 'postgres';
  const password = url.password || 'password';
  const targetDb = url.pathname.replace(/^\//, '') || 'digital_campus_pass';

  // 1. Check if PostgreSQL server is reachable
  const testPool = new Pool({
    host,
    port,
    user,
    password,
    database: 'postgres',
    connectionTimeoutMillis: 2000
  });

  let reachable = false;
  try {
    await testPool.query('SELECT 1;');
    reachable = true;
  } catch (err) {
    reachable = false;
  } finally {
    await testPool.end().catch(() => {});
  }

  // 2. If not reachable on localhost, launch embedded PostgreSQL server
  if (!reachable && (host === 'localhost' || host === '127.0.0.1')) {
    console.log('📡 Local PostgreSQL not detected. Starting Embedded PostgreSQL 18 server...');
    const dbDir = path.join(__dirname, '..', '.pgdata');
    const pidFile = path.join(dbDir, 'postmaster.pid');

    // Clean up stale lock file if the process is dead
    if (fs.existsSync(pidFile)) {
      try {
        const lines = fs.readFileSync(pidFile, 'utf8').trim().split('\n');
        const recordedPid = parseInt(lines[0], 10);
        let alive = false;
        try {
          process.kill(recordedPid, 0);
          alive = true;
        } catch (e) {
          alive = false;
        }
        if (!alive) {
          console.log(`🧹 Removing stale postmaster.pid (PID ${recordedPid} is inactive)...`);
          fs.unlinkSync(pidFile);
        }
      } catch (cleanErr) {
        console.warn('Notice checking postmaster.pid:', cleanErr.message);
      }
    }

    const EmbeddedPostgres = require('embedded-postgres').default;
    embeddedPgInstance = new EmbeddedPostgres({
      port,
      databaseDir: dbDir,
      user,
      password,
      persistent: true
    });

    try {
      await embeddedPgInstance.start();
      console.log(`✅ Embedded PostgreSQL server started on port ${port}.`);
    } catch (startErr) {
      console.log('PostgreSQL notice:', startErr.message || startErr);
    }

    // Wait until PostgreSQL is ready to accept connections
    for (let i = 0; i < 10; i++) {
      const pingPool = new Pool({
        host,
        port,
        user,
        password,
        database: 'postgres',
        connectionTimeoutMillis: 1000
      });
      try {
        await pingPool.query('SELECT 1;');
        await pingPool.end();
        break;
      } catch (pingErr) {
        await pingPool.end().catch(() => {});
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  // 3. Ensure target database exists
  const adminPool = new Pool({
    host,
    port,
    user,
    password,
    database: 'postgres',
    connectionTimeoutMillis: 5000
  });

  try {
    const dbCheck = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDb]
    );
    if (dbCheck.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE ${targetDb};`);
      console.log(`✅ Created PostgreSQL database "${targetDb}".`);
    }
  } catch (err) {
    console.warn(`Database creation check notice: ${err.message}`);
  } finally {
    await adminPool.end().catch(() => {});
  }
}

async function initDatabase() {
  await ensurePostgresServer();

  const connString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/digital_campus_pass';
  pool = new Pool({
    connectionString: connString,
    max: 25,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  // Verify connection
  const client = await pool.connect();
  try {
    const v = await client.query('SELECT version();');
    console.log(`🐘 Connected to PostgreSQL: ${v.rows[0].version.split(',')[0]}`);
  } finally {
    client.release();
  }

  // Run Migrations
  const migration1 = fs.readFileSync(path.join(__dirname, '..', 'migrations', '001_initial_schema.sql'), 'utf8');
  await pool.query(migration1);

  const migration2 = fs.readFileSync(path.join(__dirname, '..', 'migrations', '002_pgvector_rag.sql'), 'utf8');
  await pool.query(migration2);

  // Run Baseline Seeds if users table is empty
  const userCheck = await pool.query('SELECT COUNT(*) as count FROM users');
  if (parseInt(userCheck.rows[0].count, 10) === 0) {
    await seedInitialData();
  }
}

async function seedInitialData() {
  console.log('🌱 Seeding PostgreSQL database with baseline campus configuration...');

  // Departments
  const departments = [
    ['dept-cse', 'Computer Science & Engineering', 'CSE', 'Department of Computer Science and Engineering'],
    ['dept-ece', 'Electronics & Communication', 'ECE', 'Department of Electronics and Communication Engineering'],
    ['dept-mech', 'Mechanical Engineering', 'MECH', 'Department of Mechanical Engineering'],
    ['dept-civil', 'Civil Engineering', 'CIVIL', 'Department of Civil Engineering'],
    ['dept-mgmt', 'School of Business & Management', 'MBA', 'Department of Management Studies']
  ];
  for (const [id, name, code, desc] of departments) {
    await pool.query(
      `INSERT INTO departments (id, name, code, description) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [id, name, code, desc]
    );
  }

  // Campus Gates
  const gates = [
    ['gate-main', 'Main Entrance Gate', 'GATE-01', 'North Campus Ring Road', 'Primary vehicular & pedestrian gate with biometric and QR scanner kiosks', 'ACTIVE'],
    ['gate-north', 'North Gate (Academic Block)', 'GATE-02', 'Academic Quadrangle', 'Fast-lane access to Engineering Blocks A, B, and Central Labs', 'ACTIVE'],
    ['gate-hostel', 'Hostel Gate (Residential)', 'GATE-03', 'Student Residential Complex', 'Strict pass & curfew check gate for boys and girls hostels', 'ACTIVE'],
    ['gate-library', 'East Library Gate', 'GATE-04', 'Central Library & Admin Lawn', 'Pedestrian-only entry for faculty, researchers, and library members', 'ACTIVE']
  ];
  for (const [id, name, number, loc, desc, status] of gates) {
    await pool.query(
      `INSERT INTO campus_gates (id, gate_name, gate_number, location, description, status) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
      [id, name, number, loc, desc, status]
    );
  }

  // Pass Types
  const passTypes = [
    ['pt-student-out', 'STUDENT_OUT_PASS', 'Student Out Pass', 'Authorized temporary exit pass for hostellers and day scholars during college hours', 12, true, 'ACTIVE'],
    ['pt-visitor', 'VISITOR_PASS', 'Visitor Campus Pass', 'Official visitor access pass for parents, vendors, guest lecturers, and auditors', 8, true, 'ACTIVE'],
    ['pt-faculty', 'FACULTY_PASS', 'Faculty & Staff Movement Pass', 'Off-campus official duty and movement clearance pass for faculty members', 24, false, 'ACTIVE'],
    ['pt-event', 'EVENT_PASS', 'Campus Event / Hackathon Pass', 'Access pass for workshops, symposiums, hackathons, and placement drives', 48, true, 'ACTIVE'],
    ['pt-emergency', 'EMERGENCY_PASS', 'Medical Emergency Pass', 'Expedited clearance pass for health clinic or hospital visits', 6, false, 'ACTIVE']
  ];
  for (const [id, code, name, desc, maxH, reqAppr, status] of passTypes) {
    await pool.query(
      `INSERT INTO pass_types (id, code, name, description, max_duration_hours, requires_approval, status) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
      [id, code, name, desc, maxH, reqAppr, status]
    );
  }

  // Users (Pass: role + 123)
  const users = [
    ['usr-admin-1', 'ADM-001', 'Dr. Ramesh Sharma', 'admin@campus.edu', bcrypt.hashSync('admin123', 10), 'ADMIN', 'Administration', 'Campus Operations', 'N/A', 'N/A', '+91 98765 00001', '+91 98765 00099', 'ACTIVE'],
    ['usr-sec-1', 'SEC-007', 'Officer Vikram Singh', 'guard@campus.edu', bcrypt.hashSync('security123', 10), 'SECURITY', 'Campus Security', 'Main Security Division', 'N/A', 'N/A', '+91 98765 00002', '+91 98765 00099', 'ACTIVE'],
    ['usr-fac-1', 'FAC-101', 'Prof. Sunita Reddy', 'faculty@campus.edu', bcrypt.hashSync('faculty123', 10), 'FACULTY', 'Computer Science & Engineering', 'Faculty of Engineering', 'N/A', 'N/A', '+91 98765 00003', '+91 98765 00099', 'ACTIVE'],
    ['usr-stu-1', '24A81A0549', 'P. Nihal', 'nihal@campus.edu', bcrypt.hashSync('student123', 10), 'STUDENT', 'Computer Science & Engineering', 'B.Tech CSE', '3rd Year', 'Section A', '+91 98765 43210', '+91 98765 99999', 'ACTIVE'],
    ['usr-stu-2', '25A81A0254', 'R. Eswar', 'eswar@campus.edu', bcrypt.hashSync('student123', 10), 'STUDENT', 'Electrical & Electronics', 'B.Tech EEE', '2nd Year', 'Section B', '+91 98765 43211', '+91 98765 99998', 'ACTIVE'],
    ['usr-vis-1', 'VIS-999', 'Anand Verma', 'visitor@gmail.com', bcrypt.hashSync('visitor123', 10), 'VISITOR', 'External Organization', 'TechCorp Solutions', 'N/A', 'N/A', '+91 98765 11111', '+91 98765 00000', 'ACTIVE']
  ];
  for (const [id, reg, name, email, hash, role, dept, course, year, sec, phone, emerg, status] of users) {
    await pool.query(
      `INSERT INTO users (id, reg_no, name, email, password_hash, role, department, course, year, section, phone, emergency_contact, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT DO NOTHING`,
      [id, reg, name, email, hash, role, dept, course, year, sec, phone, emerg, status]
    );
  }

  // Pre-seed an approved pass for P. Nihal
  const validFrom = new Date(Date.now() - 3600000).toISOString();
  const validTo = new Date(Date.now() + 86400000).toISOString();
  await pool.query(
    `INSERT INTO digital_passes (id, pass_number, user_id, pass_type, reason, destination, valid_from, valid_to, status, approved_by, approval_notes, approval_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING`,
    [
      'pas-nihal-1', 'PASS-20261001-5324', 'usr-stu-1', 'STUDENT_OUT_PASS',
      'Technical Paper Presentation at State University Tech Fest',
      'Auditorium Complex, City University Center',
      validFrom, validTo, 'APPROVED', 'usr-fac-1',
      'Approved for official inter-collegiate symposium presentation. Return by 9:00 PM.'
    ]
  );

  // System Settings
  const settings = [
    ['campus_name', 'TechVision University of Technology', 'Institution official identity'],
    ['hostel_curfew_time', '21:30:00', 'Standard student residential hostel entry cutoff time'],
    ['visitor_visiting_hours', '09:00 - 17:00', 'Public visiting hours window for campus premises'],
    ['qr_expiry_window_minutes', '720', 'Validity period of generated QR security tokens']
  ];
  for (const [k, v, desc] of settings) {
    await pool.query(
      `INSERT INTO system_settings (key, value, description) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [k, v, desc]
    );
  }

  console.log('✅ PostgreSQL seeding complete.');
}

// Asynchronous DB Methods for PostgreSQL
const db = {
  get pool() {
    return pool;
  },

  async query(sql, params = []) {
    const norm = normalizeQuery(sql);
    return pool.query(norm, params);
  },

  async get(sql, params = []) {
    const norm = normalizeQuery(sql);
    const res = await pool.query(norm, params);
    return res.rows[0] || null;
  },

  async all(sql, params = []) {
    const norm = normalizeQuery(sql);
    const res = await pool.query(norm, params);
    return res.rows;
  },

  async run(sql, params = []) {
    const norm = normalizeQuery(sql);
    const res = await pool.query(norm, params);
    return {
      rowCount: res.rowCount,
      rows: res.rows,
      id: res.rows[0]?.id
    };
  },

  async transaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tx = {
        async query(sql, params = []) {
          return client.query(normalizeQuery(sql), params);
        },
        async get(sql, params = []) {
          const res = await client.query(normalizeQuery(sql), params);
          return res.rows[0] || null;
        },
        async all(sql, params = []) {
          const res = await client.query(normalizeQuery(sql), params);
          return res.rows;
        },
        async run(sql, params = []) {
          const res = await client.query(normalizeQuery(sql), params);
          return { rowCount: res.rowCount, rows: res.rows, id: res.rows[0]?.id };
        }
      };

      const result = await callback(tx);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  prepare(sql) {
    const self = this;
    return {
      async get(...params) {
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        return self.get(sql, flatParams);
      },
      async all(...params) {
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        return self.all(sql, flatParams);
      },
      async run(...params) {
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        return self.run(sql, flatParams);
      }
    };
  },

  async closePool() {
    if (pool) {
      await pool.end().catch(() => {});
      pool = null;
    }
  },

  getPool() {
    return pool;
  }
};

db.initDatabase = initDatabase;
module.exports = db;
