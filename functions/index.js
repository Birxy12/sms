const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// ----------------------------------------------------------------------
// 1. EMAIL CLOUD FUNCTION
// Listens for new documents in the "mail" collection
// ----------------------------------------------------------------------
exports.sendEmailNotification = functions.firestore
  .document('mail/{docId}')
  .onCreate(async (snap, context) => {
    const mailData = snap.data();
    
    // Using standard environment variables (.env file)
    const host = process.env.SMTP_HOST || 'smtp.sendgrid.net';
    const port = process.env.SMTP_PORT || 465;
    const user = process.env.SMTP_USER || 'apikey';
    const pass = process.env.SMTP_PASS || 'YOUR_SMTP_PASSWORD'; 
    const fromAddress = process.env.SMTP_FROM || 'noreply@bonusdominus.edu.ng';

    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: port == 465, // true for 465, false for other ports
      auth: {
        user: user,
        pass: pass,
      },
    });

    const mailOptions = {
      from: `School Portal <${fromAddress}>`,
      to: mailData.to,
      subject: mailData.message.subject,
      text: mailData.message.text,
      html: mailData.message.html,
      attachments: mailData.message.attachments || [],
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully: ', info.messageId);
      // Mark as delivered in the database
      return snap.ref.update({
        delivery: {
          state: 'SUCCESS',
          info: info.messageId,
          time: admin.firestore.FieldValue.serverTimestamp()
        }
      });
    } catch (error) {
      console.error('Error sending email:', error);
      return snap.ref.update({
        delivery: {
          state: 'ERROR',
          error: error.message,
          time: admin.firestore.FieldValue.serverTimestamp()
        }
      });
    }
  });
