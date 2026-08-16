import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Resend } from 'resend';
import twilio from 'twilio';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Providers
const resend = new Resend(process.env.RESEND_API_KEY);

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

app.post('/api/notify', async (req, res) => {
  try {
    const { type, subject, message, recipients } = req.body;
    // type: 'email' | 'sms' | 'both'
    // recipients: [{ email: string, phone: string, name: string }]

    const results = {
      emailsSent: 0,
      smsSent: 0,
      errors: []
    };

    // 1. Send Emails
    if (type === 'email' || type === 'both') {
      const emailRecipients = recipients.filter(r => r.email).map(r => r.email);
      
      if (emailRecipients.length > 0 && process.env.RESEND_API_KEY) {
        try {
          const data = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'Acme School <onboarding@resend.dev>',
            to: emailRecipients, // In production, use bcc or send individually
            subject: subject,
            html: `<p>Hello,</p><p>${message.replace(/\n/g, '<br>')}</p><br><p>Best regards,<br>School Administration</p>`
          });
          results.emailsSent = emailRecipients.length;
        } catch (error) {
          results.errors.push(`Email error: ${error.message}`);
        }
      }
    }

    // 2. Send SMS
    if (type === 'sms' || type === 'both') {
      const phoneRecipients = recipients.filter(r => r.phone).map(r => r.phone);
      
      if (phoneRecipients.length > 0 && twilioClient) {
        // Twilio recommends sending SMS sequentially or via Messaging Services for bulk
        for (const phone of phoneRecipients) {
          try {
            await twilioClient.messages.create({
              body: message,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: phone
            });
            results.smsSent++;
          } catch (error) {
            results.errors.push(`SMS error for ${phone}: ${error.message}`);
          }
        }
      } else if (phoneRecipients.length > 0 && !twilioClient) {
         results.errors.push('Twilio is not configured properly.');
      }
    }

    res.status(200).json({ success: true, results });

  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to send notifications' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Notification Server running on port ${PORT}`);
});
