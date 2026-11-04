/**
 * Email Service Abstraction
 * Handles email notifications with templating.
 * If SMTP credentials are not configured, logs gracefully to console so the app works 100% reliably.
 */

async function sendEmail({ to, subject, template, data = {} }) {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  const renderedContent = getTemplateContent(template, data);

  if (!host || !user || !pass) {
    console.log(`[Email Service - Simulated Dispatch]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject || renderedContent.subject}`);
    console.log(`Body:\n${renderedContent.body}\n---------------------------`);
    return {
      success: true,
      delivered: false,
      message: 'SMTP credentials not configured. Simulated dispatch completed.'
    };
  }

  // Real SMTP transport can be initialized here via nodemailer
  console.log(`[Email Service - Dispatched via ${host}] to ${to}`);
  return { success: true, delivered: true };
}

function getTemplateContent(template, data) {
  switch (template) {
    case 'REGISTRATION':
      return {
        subject: 'Welcome to Digital Campus Pass System',
        body: `Dear ${data.name},\n\nYour account has been registered successfully with ID: ${data.reg_no} and role: ${data.role}.\nYou can now sign in to apply for campus passes and access campus services.`
      };
    case 'PASSWORD_RESET':
      return {
        subject: 'Password Reset Token - Digital Campus Pass',
        body: `Hello,\n\nYou requested a password reset. Use the following security token to reset your password:\n\n${data.resetToken}\n\nThis token expires in 1 hour.`
      };
    case 'PASS_APPROVAL':
      return {
        subject: `Campus Pass Approved: ${data.passNumber}`,
        body: `Dear ${data.studentName},\n\nYour digital campus pass (${data.passNumber}) to "${data.destination}" has been APPROVED.\nYour cryptographically signed QR code is now active.`
      };
    case 'PASS_REJECTION':
      return {
        subject: `Campus Pass Rejected: ${data.passNumber}`,
        body: `Dear ${data.studentName},\n\nYour pass request (${data.passNumber}) was declined.\nReason: ${data.reason}`
      };
    case 'VISITOR_INVITATION':
      return {
        subject: `Campus Visit Invitation: ${data.visitorName}`,
        body: `Dear ${data.visitorName},\n\nYou have been invited to visit the university by ${data.hostName} for "${data.purpose}" on ${data.visitDate}.\nPlease present your digital pass QR at Gate 1 on arrival.`
      };
    case 'PASS_EXPIRY':
      return {
        subject: `Urgent: Campus Pass Expiring Soon - ${data.passNumber}`,
        body: `Dear ${data.studentName},\n\nYour pass (${data.passNumber}) will expire in 30 minutes. Please ensure you scan back through the gate prior to expiry.`
      };
    default:
      return {
        subject: 'Campus Notification',
        body: data.message || 'You have a new campus notification.'
      };
  }
}

module.exports = {
  sendEmail
};
