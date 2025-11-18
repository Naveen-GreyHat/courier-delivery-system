// 1. Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCJZrEbDZMo0REx1u_SMtAcd9sPrHGI7Ec",
    authDomain: "blackdeal-db277.firebaseapp.com",
    projectId: "blackdeal-db277",
    storageBucket: "blackdeal-db277.firebasestorage.app",
    messagingSenderId: "790859924614",
    appId: "1:790859924614:web:9118667051efef32777d07",
    measurementId: "G-5SGJV7HR1W"
};

// 2. Initialize Firebase
firebase.initializeApp(firebaseConfig);

// 3. Create global references for other scripts
const auth = firebase.auth();
const db = firebase.firestore();

console.log("Firebase initialized.");