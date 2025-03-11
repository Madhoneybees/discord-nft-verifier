const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } = require('firebase/firestore');
require('dotenv').config();

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firestore instance
const db = getFirestore(app);

// Collection references
const usersCollection = collection(db, 'users');
const pendingVerificationsCollection = collection(db, 'pending_verifications');

const users = {
  // Get a user by Discord ID
  async get(discordId) {
    const docRef = doc(usersCollection, discordId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return docSnap.data();
  },
  
  // Get all users
  async getAll() {
    const snapshot = await getDocs(usersCollection);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      data: docSnap.data()
    }));
  },
  
  // Set user data (create or overwrite)
  async set(discordId, data) {
    const docRef = doc(usersCollection, discordId);
    await setDoc(docRef, data, { merge: true });
    return true;
  },
  
  // Update specific fields
  async update(discordId, data) {
    const docRef = doc(usersCollection, discordId);
    await updateDoc(docRef, data);
    return true;
  },

  // Update user role
  async updateRole(discordId, roleData) {
    const docRef = doc(usersCollection, discordId);
    await updateDoc(docRef, roleData);
    return true;
  }
};


// Add pendingVerifications collection methods
const pendingVerifications = {
  // Get a pending verification
  async get(userId) {
    const docRef = doc(pendingVerificationsCollection, userId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return docSnap.data();
  },
  
  // Set a pending verification
  async set(userId, data) {
    const docRef = doc(pendingVerificationsCollection, userId);
    await setDoc(docRef, data);
    return true;
  },
  
  // Delete a pending verification
  async delete(userId) {
    const docRef = doc(pendingVerificationsCollection, userId);
    await deleteDoc(docRef);
    return true;
  }
};

module.exports = { 
  users,
  pendingVerifications
};