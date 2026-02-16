require('dotenv/config');
const appJson = require('./app.json');

const baseConfig = appJson.expo ?? appJson;

module.exports = ({ config }) => {
  const resolved = config && Object.keys(config).length ? config : baseConfig;
  const extra = resolved.extra ?? {};

  return {
    ...resolved,
    extra: {
      ...extra,
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
      },
    },
  };
};
