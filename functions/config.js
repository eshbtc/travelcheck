// Firebase Functions Configuration
const functions = require("firebase-functions");

const config = {
  // Google Cloud Project
  projectId: (functions.config().project && functions.config().project.id) || "travelcheck-app",

  // Document AI Processors
  passportProcessor: (functions.config().documentai && functions.config().documentai.passport_processor) ||
    "projects/travelcheck-app/locations/us/processors/PASSPORT_PROCESSOR",
  flightProcessor: (functions.config().documentai && functions.config().documentai.flight_processor) ||
    "projects/travelcheck-app/locations/us/processors/FLIGHT_PROCESSOR",

  // Gmail API
  gmail: {
    clientId: functions.config().gmail && functions.config().gmail.client_id,
    clientSecret: functions.config().gmail && functions.config().gmail.client_secret,
    redirectUri: functions.config().gmail && functions.config().gmail.redirect_uri,
  },

  // Office 365 API
  office365: {
    clientId: functions.config().office365 && functions.config().office365.client_id,
    clientSecret: functions.config().office365 && functions.config().office365.client_secret,
    redirectUri: functions.config().office365 && functions.config().office365.redirect_uri,
  },

  // Flight Tracking APIs
  flighty: {
    apiKey: functions.config().flighty && functions.config().flighty.api_key,
  },
  flightradar24: {
    apiKey: functions.config().flightradar24 && functions.config().flightradar24.api_key,
  },

  // Email Configuration
  sendgrid: {
    apiKey: functions.config().sendgrid && functions.config().sendgrid.api_key,
  },
  email: {
    from: (functions.config().email && functions.config().email.from) || "noreply@travelcheck.app",
  },

  // Security
  jwt: {
    secret: functions.config().jwt && functions.config().jwt.secret,
  },
  encryption: {
    key: functions.config().encryption && functions.config().encryption.key,
  },

  // External APIs
  perplexity: {
    apiKey: functions.config().perplexity && functions.config().perplexity.api_key,
  },
};

module.exports = config;
