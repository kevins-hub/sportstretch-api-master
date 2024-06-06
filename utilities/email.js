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
    to: toEmail, // Recipient email address (can be a comma-separated list for multiple recipients)
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

// send email for when therapist is approved
const sendTherapistApprovedEmail = (email) => {
  const message = `Congratulations! Your application to be a recovery specialist on Sport
  Stretch has been approved. Once you set up payment, you will be able to accept bookings!`;
  const subject = "Recovery Specialist Application Approved";
  const mailObj = makeEmail(message, email, subject);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
}

const sendTherapistDeclinedEmail = (email) => {
  const message = `We regret to inform you that your application to be a recovery specialist on Sport
  Stretch has been declined.`;
  const subject = "Recovery Specialist Application Declined";
  const mailObj = makeEmail(message, email, subject);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
}

const sendTherapistEnabledEmail = (email) => {
  const message = `Your Recovery Specialist account has been enabled. You can now accept bookings on the SportStretch app.`;
  const subject = "Recovery Specialist Account Enabled";
  const mailObj = makeEmail(message, email, subject);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
}

const sendTherapistDisabledEmail = (email) => {
  const message = `Your Recovery Specialist account has been disabled. Please contact customer service for more information.`;
  const subject = "Recovery Specialist Account Disabled";
  const mailObj = makeEmail(message, email, subject);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
}

const sendBookingConfirmationEmail = (email, bookingId, therapistName) => {
  const message = `Your booking with ${therapistName} has been confirmed. Please log in to the SportStretch app for more information.`;
  const subject = `Booking with ${therapistName} Confirmed (Booking ID: ${bookingId})`;
  const mailObj = makeEmail(message, email, subject);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
}

const sendAthleteCancelledBookingEmail = (therapistEmail, bookingId, athleteFirstName, refunded) => {
  const message = `${athleteFirstName} has cancelled their appointment with you. ${refunded ? "Since the cancellation was within the allowed time-frame, they have been refunded." : "They have been charged a cancellation fee."}`;
  const subject = `Appointment with ${athleteFirstname} (Booking ID ${bookingId}) Cancelled`;
  const mailObj = makeEmail(message, therapistEmail, subject);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
}

const sendTherapistCancelledBookingEmail = (athleteEmail, bookingId, therapistName) => {
  const message = `${therapistName} has cancelled your appointment. You will be refunded in full.`;
  const subject = `Appointment with ${therapistName} (Booking ID ${bookingId}) Cancelled`;
  const mailObj = makeEmail(message, athleteEmail, subject);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
}

const sendBookingDeclinedEmail = (email, bookingId, therapistName, reason) => {
  const message = `${therapistName} has declined your booking request for the following reason: ${reason}  Please contact customer service for more information.`;
  const subject = `Booking with ${therapistName} Declined (Booking ID: ${bookingId})`;
  const mailObj = makeEmail(message, email, subject);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
}

const sendBookingReminderEmail = (email, firstName) => {
  const message = `Hello ${firstName}, this is a reminder that you have one or multiple appointments scheduled for today Please log in to the SportStretch app for more information.`;
  const subject = "Appointment(s) Reminder";
  const mailObj = makeEmail(message, email, subject);
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
  sendTherapistApprovedEmail,
  sendTherapistDeclinedEmail,
  sendBookingConfirmationEmail,
  sendAthleteCancelledBookingEmail,
  sendTherapistCancelledBookingEmail,
  sendBookingDeclinedEmail,
  sendBookingReminderEmail,
  sendTherapistEnabledEmail,
  sendTherapistDisabledEmail,
};
