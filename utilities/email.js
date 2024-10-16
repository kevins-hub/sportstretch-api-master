// Import Nodemailer
const nodemailer = require("nodemailer");
const Pool = require("pg").Pool;
const config = require("config");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || config.get("connectionString"),
  ssl: {
    rejectUnauthorized: false,
  },
});

// const customerServiceEmail = "kevinkliu.dev@gmail.com"
const customerServiceEmail = "sportstretchapp@gmail.com"

// Create a transporter using SMTP transport (for Gmail)
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: customerServiceEmail, // Your Gmail email address
    // pass: "owzhodmblenxglaa", // Your Gmail password or an app-specific password
    pass: "ostl gnos iyrs wphd",
  },
});

const makeEmail = (message, toEmail, subject) => {
  return {
    from: customerServiceEmail, // Sender email address
    to: toEmail, // Recipient email address (can be a comma-separated list for multiple recipients)
    subject: subject, // Email subject
    text: message, // Email content (plain text)
    // You can also use 'html' key for sending HTML content in the email
  };
};

/*
therapistObj: {
  first_name: string,
  email:string,
  profession: string,
  hourly_rate: number,
}

athleteObj: {
  first_name: string,
  last_name: string,
  email: string,
}

*/

const getAthleteObj = async (athleteId) => {
  const athlete = await pool.query(
    "SELECT a.first_name, a.last_name, auth.email FROM tb_athlete a JOIN tb_authorization auth ON a.fk_authorization_id = auth.authorization_id WHERE athlete_id = $1",
    [athleteId]
  );
  const athleteObj = {
    first_name: athlete.rows[0].first_name,
    last_name: athlete.rows[0].last_name,
    email: athlete.rows[0].email,
  }
  return athleteObj;
};

const getTherapistObj = async (therapistId) => {
  const therapist = await pool.query(
    "SELECT t.first_name, auth.email, t.profession, t.hourly_rate FROM tb_therapist t JOIN tb_authorization auth ON t.fk_authorization_id = auth.authorization_id WHERE therapist_id = $1",
    [therapistId]
  );
  const therapistObj = {
    first_name: therapist.rows[0].first_name,
    email: therapist.rows[0].email,
    profession: therapist.rows[0].profession,
    hourly_rate: therapist.rows[0].hourly_rate,
  }
  return therapistObj;
};

// Send Forgot Password Token email
const sendTokenEmail = (token, email) => {
  const tokenMessage = `Your forgotten password code is ${token}. Do not share under any circumstances`;
  const tokenSubject = "One-time passcode";
  const mailObj = makeEmail(tokenMessage, email, tokenSubject);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
};

const sendVerificationEmail = (token, email) => {
  const tokenMessage = `Your email verification code is ${token}. Do not share under any circumstances`;
  const tokenSubject = "One-time passcode";
  const mailObj = makeEmail(tokenMessage, email, tokenSubject);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
}

// Send Reported Issues Email
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
};

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
};

// send email for when therapist is approved
// const sendTherapistApprovedEmail = (email) => {
//   const message = `Congratulations! Your application to be a recovery specialist on Sport
//   Stretch has been approved. Once you set up payment, you will be able to accept bookings!`;
//   const subject = "Recovery Specialist Application Approved";
//   const mailObj = makeEmail(message, email, subject);
//   transporter.sendMail(mailObj, (error, info) => {
//     if (error) {
//       console.error("Error sending email:", error);
//     } else {
//       console.warn("Email sent successfully!");
//       console.warn("Message ID:", info.messageId);
//     }
//   });
// };

// send email for when therapist is approved
const sendTherapistApprovedEmails = async (therapistId) => {
  const therapist = await getTherapistObj(therapistId);
  // send email to therapist
  const message = `Congratulations! Your application to be a recovery specialist on Sport
    Stretch has been approved. Once you set up payment, you will be able to accept bookings!`;
  const subject = "Recovery Specialist Application Approved";
  const mailObj = makeEmail(message, therapist.email, subject);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
  // send email to admin (customer service)
  const messageAdmin = `Recovery Specialist ${therapist.first_name} has been approved. Please reach out to them if they have any issues setting up payment.`;
  const subjectAdmin = "Recovery Specialist Approved";
  const mailObjAdmin = makeEmail(messageAdmin, customerServiceEmail, subjectAdmin);
  transporter.sendMail(mailObjAdmin, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });

};

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
};

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
};

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
};

// const sendBookingConfirmationEmail = (email, bookingId, therapistName) => {
//   const message = `Your booking with ${therapistName} has been confirmed. Please log in to the SportStretch app for more information.`;
//   const subject = `Booking with ${therapistName} Confirmed (Booking ID: ${bookingId})`;
//   const mailObj = makeEmail(message, email, subject);
//   transporter.sendMail(mailObj, (error, info) => {
//     if (error) {
//       console.error("Error sending email:", error);
//     } else {
//       console.warn("Email sent successfully!");
//       console.warn("Message ID:", info.messageId);
//     }
//   });
// };

const sendBookingConfirmationEmail = async (
  athleteId,
  bookingId,
  therapistId
) => {
  const athlete = await getAthleteObj(athleteId);
  const therapist = await getTherapistObj(therapistId);
  // email athlete
  const message = `Your booking with ${therapist.first_name} has been confirmed and your payment method has been charged. Please log in to the SportStretch app for more information.`;
  const subject = `Booking with ${therapist.first_name} Confirmed (Booking ID: ${bookingId})`;
  const mailObj = makeEmail(message, athlete.email, subject);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
  // email therapist
  const messageTherapist = `You have confirmed your booking with ${athlete.first_name} ${athlete.last_name} and their payment has been processed. Please log in to the SportStretch app for more information and options.`;
  const subjectTherapist = `Confirmed Booking (Booking ID: ${bookingId}) with ${athlete.first_name}`;
  const mailObjTherapist = makeEmail(
    messageTherapist,
    therapist.email,
    subjectTherapist
  );
  transporter.sendMail(mailObjTherapist, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
};

// const sendAthleteCancelledBookingEmail = (
//   therapistEmail,
//   bookingId,
//   athleteFirstName,
//   refunded
// ) => {
//   const message = `${athleteFirstName} has cancelled their appointment with you. ${
//     refunded
//       ? "Since the cancellation was within the allowed time-frame, they have been refunded."
//       : "They have been charged a cancellation fee."
//   }`;
//   const subject = `Appointment with ${athleteFirstName} (Booking ID ${bookingId}) Cancelled`;
//   const mailObj = makeEmail(message, therapistEmail, subject);
//   transporter.sendMail(mailObj, (error, info) => {
//     if (error) {
//       console.error("Error sending email:", error);
//     } else {
//       console.warn("Email sent successfully!");
//       console.warn("Message ID:", info.messageId);
//     }
//   });
// };

const sendAthleteCancelledBookingEmails = async (
  therapistId,
  bookingId,
  athleteId,
  refunded
) => {
  const therapist = await getTherapistObj(therapistId);
  const athlete = await getAthleteObj(athleteId);

  // email to therapist
  const message = `${
    athlete.first_name
  } has cancelled their appointment with you. ${
    refunded
      ? "Since the cancellation was within the allowed time-frame, they have been refunded."
      : "They have been charged a cancellation fee."
  }`;
  const subject = `Appointment with ${athlete.first_name} (Booking ID ${bookingId}) Cancelled`;
  const mailObj = makeEmail(message, therapist.email, subject);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
  // email to athlete
  const messageAthlete = `You have successfully cancelled your appointment with ${
    therapist.first_name
  }. ${
    refunded
      ? "You have been refunded."
      : "You have been charged a cancellation fee."
  }`;
  const subjectAthlete = `Appointment with ${therapist.first_name} (Booking ID ${bookingId}) Cancelled`;
  const mailObjAthlete = makeEmail(
    messageAthlete,
    athlete.email,
    subjectAthlete
  );
  transporter.sendMail(mailObjAthlete, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
};

// const sendTherapistCancelledBookingEmail = (
//   athleteEmail,
//   bookingId,
//   therapistName
// ) => {
//   const message = `${therapistName} has cancelled your appointment. You have been given a full refund.`;
//   const subject = `Appointment with ${therapistName} (Booking ID ${bookingId}) Cancelled`;
//   const mailObj = makeEmail(message, athleteEmail, subject);
//   transporter.sendMail(mailObj, (error, info) => {
//     if (error) {
//       console.error("Error sending email:", error);
//     } else {
//       console.warn("Email sent successfully!");
//       console.warn("Message ID:", info.messageId);
//     }
//   });
// };

const sendTherapistCancelledBookingEmails = async (
  athleteId,
  bookingId,
  therapistId
) => {
  const athlete = await getAthleteObj(athleteId);
  const therapist = await getTherapistObj(therapistId);
  // email to athlete
  const message = `${therapist.first_name} has cancelled your appointment. You have been given a full refund.`;
  const subject = `Appointment with ${therapist.first_name} (Booking ID ${bookingId}) Cancelled`;
  const mailObj = makeEmail(message, athlete.email, subject);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
  // email to therapist
  const messageTherapist = `You have successfully cancelled your appointment with ${athlete.first_name}. They have been given a full refund.`;
  const subjectTherapist = `Appointment with ${athlete.first_name} (Booking ID ${bookingId}) Cancelled`;
  const mailObjTherapist = makeEmail(
    messageTherapist,
    therapist.email,
    subjectTherapist
  );
  transporter.sendMail(mailObjTherapist, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
};

// const sendBookingDeclinedEmail = (
//   email,
//   bookingId,
//   therapistName,
//   reason,
//   suggestedBookingTime = null
// ) => {
//   const message = !suggestedBookingTime
//     ? `${therapistName} has declined your booking request for the following reason: ${reason}  Please contact customer service for more information.`
//     : `${therapistName} has declined your booking request for the following reason: ${reason}  They have suggested a new booking time: ${suggestedBookingTime} Please log in to the SportStretch app to make an appointment with the new time.`;
//   const subject = `Booking with ${therapistName} Declined (Booking ID: ${bookingId})`;
//   const mailObj = makeEmail(message, email, subject);
//   transporter.sendMail(mailObj, (error, info) => {
//     if (error) {
//       console.error("Error sending email:", error);
//     } else {
//       console.warn("Email sent successfully!");
//       console.warn("Message ID:", info.messageId);
//     }
//   });
// };

const sendBookingDeclinedEmails = async (
  athleteId,
  bookingId,
  therapistId,
  reason,
  suggestedBookingTime = null
) => {
  const athlete = await getAthleteObj(athleteId);
  const therapist = await getTherapistObj(therapistId);
  // send email to athlete
  const message = !suggestedBookingTime
    ? `${therapist.first_name} has declined your booking request for the following reason: ${reason}  Please contact customer service for more information.`
    : `${therapist.first_name} has declined your booking request for the following reason: ${reason}  They have suggested a new booking time: ${suggestedBookingTime} Please log in to the SportStretch app to make an appointment with the new time.`;
  const subject = `Booking with ${therapist.first_name} Declined (Booking ID: ${bookingId})`;
  const mailObj = makeEmail(message, athlete.email, subject);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
  // send email to therapist
  const messageTherapist = `You have declined the booking request from ${
    athlete.first_name
  } ${athlete.last_name} for the following reason: ${reason}. ${
    suggestedBookingTime
      ? `You have suggested a new booking time: ${suggestedBookingTime}.`
      : ""
  }`;
  const subjectTherapist = `Booking Request Declined (Booking ID: ${bookingId}) from ${athlete.first_name}`;
  const mailObjTherapist = makeEmail(
    messageTherapist,
    therapist.email,
    subjectTherapist
  );
  transporter.sendMail(mailObjTherapist, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
  // send email to admin
  const messageAdmin = `${therapist.first_name} has declined the booking request from ${
    athlete.first_name
  } ${athlete.last_name} for the following reason: ${reason}. ${
    suggestedBookingTime
      ? `They have suggested a new booking time: ${suggestedBookingTime}.`
      : ""
  }`;
  const subjectAdmin = `Booking Request Declined (Booking ID: ${bookingId}) by ${therapist.first_name} ${therapist.last_name} (therapistId: ${therapistId}) from ${athlete.first_name}`;
  const mailObjAdmin = makeEmail(messageAdmin, customerServiceEmail, subjectAdmin);
  transporter.sendMail(mailObjAdmin, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
};

const sendBookingReminderEmail = (email, firstName) => {
  const message = `Hello ${firstName}, this is a reminder that you have one or multiple appointments scheduled for today. Please log in to the SportStretch app for more information.`;
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
};

const sendBookingRequestedEmail = async (therapistId, athleteId, bookingId) => {
  const athlete = await getAthleteObj(athleteId);
  const therapist = await getTherapistObj(therapistId);
  const message = `You have a new booking request from ${athlete.first_name} ${athlete.last_name}. Please log in to the SportStretch app to accept or decline the request.`;
  const subject = `New Booking Request (Booking ID: ${bookingId}) from ${athlete.first_name}!`;
  const mailObj = makeEmail(message, therapist.email, subject);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
};

const sendTherapistWelcomeEmail = async (therapistId) => {
  const therapist = await getTherapistObj(therapistId);
  const message = `Welcome to SportStretch, ${therapist.first_name}! We are excited to have you as a recovery specialist on our platform. We are in the process of reviewing your profile and will notify you once you are approved. In the meantime, please feel free to explore the app and familiarize yourself with the features.`;
  const subject = "Welcome to SportStretch!";
  const mailObj = makeEmail(message, therapist.email, subject);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
};

// send email to admin when new therapist is registered

const sendTherapistRegisteredEmailToAdmin = async (therapistId) => {
  const therapist = await getTherapistObj(therapistId);
  const message = `New recovery specialist ${therapist.first_name} has registered on SportStretch. Please review their profile and approve or decline their application.`;
  const subject = "New Recovery Specialist Registered";
  const mailObj = makeEmail(message, customerServiceEmail, subject);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
}

const sendAthleteWelcomeEmail = async (athleteId) => {
  const athlete = await getAthleteObj(athleteId);
  const message = `Welcome to SportStretch, ${athlete.first_name}! We are excited to have you as an athlete on our platform. Please feel free to explore the app and book your first appointment with a recovery specialist.`;
  const subject = "Welcome to SportStretch!";
  const mailObj = makeEmail(message, athlete.email, subject);
  transporter.sendMail(mailObj, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.warn("Email sent successfully!");
      console.warn("Message ID:", info.messageId);
    }
  });
};

module.exports = {
  sendTokenEmail,
  sendReportIssueEmail,
  sendReportIssueConfirmationEmail,
  sendTherapistApprovedEmails,
  sendTherapistDeclinedEmail,
  sendBookingConfirmationEmail,
  sendAthleteCancelledBookingEmails,
  sendTherapistCancelledBookingEmails,
  sendBookingDeclinedEmails,
  sendBookingReminderEmail,
  sendTherapistEnabledEmail,
  sendTherapistDisabledEmail,
  sendBookingRequestedEmail,
  sendTherapistWelcomeEmail,
  sendAthleteWelcomeEmail,
  sendTherapistRegisteredEmailToAdmin,
  sendVerificationEmail,
};
