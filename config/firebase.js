const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('../firebase-service-account.json');

const firebaseApp = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount)
    });

const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

module.exports = {
    auth,
    db
};