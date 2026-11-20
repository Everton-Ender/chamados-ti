
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';

import {
    getAuth,
    GoogleAuthProvider
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';

const firebaseConfig = {
    apiKey: 'AIzaSyDfrDMdEtK27pqxPUlZNIizmzMnXrBeSMc',
    authDomain: 'chamados-ti-rbac-59531.firebaseapp.com',
    projectId: 'chamados-ti-rbac-59531',
    storageBucket: 'chamados-ti-rbac-59531.firebasestorage.app',
    messagingSenderId: '344077984720',
    appId: '1:344077984720:web:947c3a7fd328084b718fd5'
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };