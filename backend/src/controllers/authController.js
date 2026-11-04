const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateToken } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');
const { sendEmail } = require('../services/emailService');

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email/Student ID and password are required.' });
    }

    const identifier = email.trim().toLowerCase();

    // Support login via official campus email OR Student/Employee ID (reg_no)
    const user = await db.get(`
      SELECT * FROM users 
      WHERE LOWER(email) = $1 OR LOWER(reg_no) = $2
    `, [identifier, identifier]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'This account has been deactivated. Please contact campus administration.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password. Authentication failed.' });
    }

    const token = generateToken(user);

    await logAudit({
      actorId: user.id,
      action: 'USER_LOGIN',
      entityType: 'AUTH',
      entityId: user.id,
      details: { role: user.role, reg_no: user.reg_no },
      ipAddress: req.ip
    });

    const { password_hash, reset_token, reset_expires, ...safeUser } = user;

    res.json({
      message: 'Login successful',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
}

async function register(req, res) {
  try {
    const { reg_no, name, email, password, role, department, course, year, section, phone, emergency_contact } = req.body;

    if (!reg_no || !name || !email || !password || !role) {
      return res.status(400).json({ error: 'Registration number, name, email, password, and role are required.' });
    }

    const validRoles = ['ADMIN', 'SECURITY', 'FACULTY', 'STUDENT', 'VISITOR'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Allowed roles: ${validRoles.join(', ')}` });
    }

    const existing = await db.get(`
      SELECT id FROM users WHERE LOWER(email) = $1 OR LOWER(reg_no) = $2
    `, [email.toLowerCase().trim(), reg_no.toLowerCase().trim()]);

    if (existing) {
      return res.status(409).json({ error: 'An account with this email or registration number already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);
    const id = `usr-${uuidv4().slice(0, 8)}`;

    await db.query(`
      INSERT INTO users (
        id, reg_no, name, email, password_hash, role, department, course, year, section, phone, emergency_contact, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ACTIVE')
    `, [
      id,
      reg_no.trim(),
      name.trim(),
      email.toLowerCase().trim(),
      password_hash,
      role,
      department || null,
      course || null,
      year || null,
      section || null,
      phone || null,
      emergency_contact || null
    ]);

    const newUser = { id, reg_no: reg_no.trim(), name: name.trim(), email: email.toLowerCase().trim(), role, department, course, year, section, phone, status: 'ACTIVE' };
    const token = generateToken(newUser);

    await logAudit({
      actorId: id,
      action: 'USER_REGISTER',
      entityType: 'AUTH',
      entityId: id,
      details: { role, email: newUser.email },
      ipAddress: req.ip
    });

    sendEmail({
      to: newUser.email,
      template: 'REGISTRATION',
      data: newUser
    });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: newUser
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
}

async function getMe(req, res) {
  try {
    const user = await db.get(`
      SELECT id, reg_no, name, email, role, department, course, year, section, phone, emergency_contact, status, created_at 
      FROM users WHERE id = $1
    `, [req.user.id]);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user });
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const user = await db.get('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Current password does not match.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

    await logAudit({
      actorId: userId,
      action: 'PASSWORD_CHANGED',
      entityType: 'AUTH',
      entityId: userId,
      details: 'User successfully changed password',
      ipAddress: req.ip
    });

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('ChangePassword error:', err);
    res.status(500).json({ error: 'Internal server error changing password.' });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const user = await db.get('SELECT * FROM users WHERE LOWER(email) = $1', [email.toLowerCase().trim()]);
    if (!user) {
      return res.json({ message: 'If that email exists in our system, password reset instructions have been dispatched.' });
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await db.query('UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3', [resetToken, resetExpires, user.id]);

    sendEmail({
      to: user.email,
      template: 'PASSWORD_RESET',
      data: { resetToken }
    });

    res.json({
      message: 'Password reset token generated.',
      resetToken
    });
  } catch (err) {
    console.error('ForgotPassword error:', err);
    res.status(500).json({ error: 'Internal server error processing password reset.' });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required.' });
    }

    const user = await db.get('SELECT * FROM users WHERE reset_token = $1', [token]);
    if (!user || new Date() > new Date(user.reset_expires)) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);

    await db.query('UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2', [newHash, user.id]);

    res.json({ message: 'Password has been reset successfully. You may now log in with your new password.' });
  } catch (err) {
    console.error('ResetPassword error:', err);
    res.status(500).json({ error: 'Internal server error resetting password.' });
  }
}

function getTestUsers(req, res) {
  res.json({
    testUsers: [
      { role: 'STUDENT', email: 'nihal@campus.edu', name: 'P. Nihal (Batch 17)', password: 'student123', reg_no: '24A81A0549' },
      { role: 'FACULTY', email: 'faculty@campus.edu', name: 'Prof. Sunita Reddy', password: 'faculty123', reg_no: 'FAC-101' },
      { role: 'SECURITY', email: 'guard@campus.edu', name: 'Officer Vikram Singh', password: 'security123', reg_no: 'SEC-007' },
      { role: 'ADMIN', email: 'admin@campus.edu', name: 'Dr. Ramesh Sharma', password: 'admin123', reg_no: 'ADM-001' },
      { role: 'VISITOR', email: 'visitor@gmail.com', name: 'Anand Verma', password: 'visitor123', reg_no: 'VIS-999' }
    ]
  });
}

module.exports = {
  login,
  register,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
  getTestUsers
};
