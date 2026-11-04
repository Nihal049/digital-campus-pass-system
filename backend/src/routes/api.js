const express = require('express');
const multer = require('multer');
const path = require('path');
const os = require('os');

const { authenticateToken, requireRoles } = require('../middleware/auth');
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const passController = require('../controllers/passController');
const gateController = require('../controllers/gateController');
const gateManagementController = require('../controllers/gateManagementController');
const visitorController = require('../controllers/visitorController');
const auditController = require('../controllers/auditController');
const notificationController = require('../controllers/notificationController');
const ragController = require('../controllers/ragController');

const router = express.Router();

const upload = multer({
  dest: path.join(os.tmpdir(), 'campus-rag-uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// --- Authentication Routes ---
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);
router.get('/auth/me', authenticateToken, authController.getMe);
router.post('/auth/change-password', authenticateToken, authController.changePassword);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);
router.get('/auth/test-users', authController.getTestUsers);

// --- User Profile & Admin User Management Routes ---
router.get('/users/profile', authenticateToken, userController.getProfile);
router.put('/users/profile', authenticateToken, userController.updateProfile);
router.get('/users', authenticateToken, requireRoles('ADMIN'), userController.listUsers);
router.put('/users/:id/status', authenticateToken, requireRoles('ADMIN'), userController.updateUserStatus);
router.get('/departments', userController.getDepartments);

// --- Digital Pass Routes ---
router.post('/passes/request', authenticateToken, requireRoles('STUDENT', 'FACULTY', 'ADMIN', 'VISITOR'), passController.requestPass);
router.get('/passes', authenticateToken, passController.getPasses);
router.get('/passes/:id', authenticateToken, passController.getPassById);
router.put('/passes/:id/approve', authenticateToken, requireRoles('FACULTY', 'ADMIN'), passController.approvePass);
router.put('/passes/:id/reject', authenticateToken, requireRoles('FACULTY', 'ADMIN'), passController.rejectPass);
router.put('/passes/:id/cancel', authenticateToken, passController.cancelPass);
router.put('/passes/:id/revoke', authenticateToken, requireRoles('SECURITY', 'ADMIN'), passController.revokePass);

// --- Campus Gates Management Routes ---
router.get('/gates', gateManagementController.getGates);
router.post('/gates', authenticateToken, requireRoles('ADMIN'), gateManagementController.createGate);
router.put('/gates/:id', authenticateToken, requireRoles('ADMIN'), gateManagementController.updateGate);
router.delete('/gates/:id', authenticateToken, requireRoles('ADMIN'), gateManagementController.deleteGate);

// --- Pass Types Management Routes ---
router.get('/pass-types', gateManagementController.getPassTypes);
router.post('/pass-types', authenticateToken, requireRoles('ADMIN'), gateManagementController.createPassType);

// --- Gate Scanning & Movement Tracking Routes ---
router.post('/gate/verify-qr', authenticateToken, requireRoles('SECURITY', 'ADMIN'), gateController.verifyPassQR);
router.post('/gate/scan', authenticateToken, requireRoles('SECURITY', 'ADMIN'), gateController.recordGateScan);
router.get('/gate/history', authenticateToken, requireRoles('SECURITY', 'ADMIN'), gateController.getScanHistory);
router.get('/gate/currently-inside', authenticateToken, requireRoles('SECURITY', 'ADMIN'), gateManagementController.getCurrentlyInside);

// --- Visitor Management Routes ---
router.post('/visitors/register', visitorController.registerVisitor);
router.get('/visitors', authenticateToken, visitorController.getVisitors);
router.put('/visitors/:id/approve', authenticateToken, requireRoles('FACULTY', 'ADMIN', 'STUDENT'), visitorController.approveVisitor);
router.put('/visitors/:id/status', authenticateToken, requireRoles('SECURITY', 'ADMIN'), visitorController.updateVisitorStatus);

// --- In-App Notifications Routes ---
router.get('/notifications', authenticateToken, notificationController.getMyNotifications);
router.put('/notifications/:id/read', authenticateToken, notificationController.readNotification);
router.put('/notifications/read-all', authenticateToken, notificationController.readAll);

// --- Dashboard Statistics Route ---
router.get('/dashboard/stats', authenticateToken, gateManagementController.getDashboardStats);

// --- Audit Log Routes ---
router.get('/audit-logs', authenticateToken, requireRoles('ADMIN', 'SECURITY'), auditController.getAuditLogs);

// --- RAG AI Campus Assistant Routes ---
router.post('/rag/query', (req, res, next) => {
  // Optional auth to enable live pass status personalization
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    authenticateToken(req, res, () => ragController.queryAssistant(req, res));
  } else {
    ragController.queryAssistant(req, res);
  }
});
router.post('/rag/ingest', authenticateToken, requireRoles('ADMIN'), upload.single('document'), ragController.ingestCampusDocument);
router.get('/rag/documents', ragController.getIngestedDocuments);
router.delete('/rag/documents/:id', authenticateToken, requireRoles('ADMIN'), ragController.deleteDocument);
router.post('/rag/documents/:id/reindex', authenticateToken, requireRoles('ADMIN'), ragController.reindexDocument);
router.get('/rag/stats', ragController.getStats);

// --- OpenAPI 3.0 Documentation ---
router.get('/docs', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Digital Campus Pass & RAG Assistant API',
      version: '1.0.0',
      description: 'Production REST API for Digital Campus Pass Management, QR Verification, Gate Movement, Visitor Management, Notifications, and RAG AI Assistant'
    },
    paths: {
      '/api/auth/login': { post: { summary: 'Login user via email or reg_no and return JWT' } },
      '/api/auth/register': { post: { summary: 'Register a new user account' } },
      '/api/auth/change-password': { post: { summary: 'Change current user password' } },
      '/api/auth/forgot-password': { post: { summary: 'Dispatch password reset token' } },
      '/api/auth/reset-password': { post: { summary: 'Reset password using token' } },
      '/api/users/profile': { get: { summary: 'Get current user profile' }, put: { summary: 'Update profile details' } },
      '/api/users': { get: { summary: 'Admin list users with filtering' } },
      '/api/passes/request': { post: { summary: 'Submit pass request' } },
      '/api/passes': { get: { summary: 'List passes with role scoping' } },
      '/api/passes/{id}/approve': { put: { summary: 'Approve pass and issue HMAC QR' } },
      '/api/passes/{id}/reject': { put: { summary: 'Decline pass request with reason' } },
      '/api/gate/verify-qr': { post: { summary: 'Cryptographic QR token validation' } },
      '/api/gate/scan': { post: { summary: 'Record gate ENTRY or EXIT and update currently inside' } },
      '/api/gate/currently-inside': { get: { summary: 'List all people currently inside campus' } },
      '/api/gates': { get: { summary: 'List campus gates' }, post: { summary: 'Admin create gate' } },
      '/api/pass-types': { get: { summary: 'List configured pass types' } },
      '/api/visitors': { get: { summary: 'List visitors' }, post: { summary: 'Register visitor' } },
      '/api/notifications': { get: { summary: 'List user in-app notifications' } },
      '/api/dashboard/stats': { get: { summary: 'Get real-time database stats' } },
      '/api/audit-logs': { get: { summary: 'Search and inspect system audit trail' } },
      '/api/rag/query': { post: { summary: 'Hybrid query to RAG assistant with live DB fallback' } },
      '/api/rag/ingest': { post: { summary: 'Admin upload and chunk campus document' } }
    }
  });
});

module.exports = router;
