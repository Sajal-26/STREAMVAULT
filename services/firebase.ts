import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCXZf0xXjNLMkFSFaWE4_PPI2MDE14ukYE",
  authDomain: "watchparty-10551.firebaseapp.com",
  projectId: "watchparty-10551",
  storageBucket: "watchparty-10551.firebasestorage.app",
  messagingSenderId: "227054396216",
  appId: "1:227054396216:web:b8c5604b049648972597cd",
  measurementId: "G-0BBX7JK2GD"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getDatabase(app);