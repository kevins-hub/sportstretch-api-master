// Import Nodemailer
const nodemailer = require('nodemailer');

// Create a transporter using SMTP transport (for Gmail)
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'kevinkliu.dev@gmail.com', // Your Gmail email address
    pass: 'owzhodmblenxglaa' // Your Gmail password or an app-specific password
  }
});

const makeEmail = (token) => {
    return {
        from: 'kevinkliu.dev@@gmail.com', // Sender email address
        to: email, // Recipient email address (can be a comma-separated list for multiple recipients)
        subject: 'One-time passcode', // Email subject
        text: `Your code is ${token}. Do not share under any circumstances` // Email content (plain text)
        // You can also use 'html' key for sending HTML content in the email
    }
}

// Send the email
const sendEmail = (token, email) => {
    const mailObj = makeEmail(token, email);
    transporter.sendMail(mailObj, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
        } else {
          console.warn('Email sent successfully!');
          console.warn('Message ID:', info.messageId);
        }
      });
}

module.exports = sendEmail;
