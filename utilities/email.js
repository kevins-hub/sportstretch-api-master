// Import Nodemailer
const nodemailer = require("nodemailer");

const customerServiceEmail = "sportstretchapp@gmail.com";

// Create a transporter using SMTP transport (for Gmail)
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "kevinkliu.dev@gmail.com", // Your Gmail email address
    pass: "owzhodmblenxglaa", // Your Gmail password or an app-specific password
  },
});

const makeEmail = (message, toEmail, subject) => {
  return {
    from: "kevinkliu.dev@@gmail.com", // Sender email address
    to: email, // Recipient email address (can be a comma-separated list for multiple recipients)
    subject: subject, // Email subject
    text: message, // Email content (plain text)
    // You can also use 'html' key for sending HTML content in the email
  };
};

// Send the email
const sendTokenEmail = (token, email) => {
  const tokenMessage = `Your code is ${token}. Do not share under any circumstances`;
  const tokenSubject = "One-time passcode";
  const mailObj = makeEmail(tokenMessage, email);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
};

// send email for reported issues
const sendReportIssueEmail = (issue, reporterEmail, bookingId) => {
  const issueMessage = `Issue reported by ${reporterEmail}: ${issue}`;
  const issueSubject = `Issue reported for booking ID: ${bookingId}`;
  const mailObj = makeEmail(issueMessage, customerServiceEmail, issueSubject);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
}

const sendReportIssueConfirmationEmail = (issue, reporterEmail, bookingId) => {
  const issueMessage = `Thank you for reporting the issue: ${issue}. Our team is looking into it and we will reach out to you with updates in 3-5 business days.`;
  const issueSubject = `Issue reported for booking ID: ${bookingId}`;
  const mailObj = makeEmail(issueMessage, reporterEmail, issueSubject);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
}

module.exports = {
  sendTokenEmail,
  sendReportIssueEmail,
  sendReportIssueConfirmationEmail,
};
