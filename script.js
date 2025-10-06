// Firebase SDK modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, onAuthStateChanged, createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
    onSnapshot, query, orderBy, serverTimestamp, Timestamp, writeBatch,
    getDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- FIREBASE CONFIG ---
    const firebaseConfig = {
        apiKey: "AIzaSyCxPG9RfxihL-Rfhu7fPSP95QDld6QMuik",
        authDomain: "streaker-1658d.firebaseapp.com",
        projectId: "streaker-1658d",
        storageBucket: "streaker-1658d.appspot.com",
        messagingSenderId: "12701860115",
        appId: "1:12701860115:web:0d4dcba33fd234df97dae6",
        measurementId: "G-XKE790N7ZL"
    };
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // --- REFACTORED: DOM ELEMENT SELECTIONS ---
    const DOM = {
        loadingContainer: document.getElementById('loading-container'),
        publicViewContainer: document.getElementById('public-view-container'),
        authContainer: document.getElementById('auth-container'),
        authForm: document.getElementById('auth-form'),
        emailInput: document.getElementById('email-input'),
        passwordInput: document.getElementById('password-input'),
        authError: document.getElementById('auth-error'),
        appLayout: document.getElementById('app-layout'),
        mainNav: document.getElementById('main-nav'),
        newLogoutBtn: document.getElementById('new-logout-btn'),
        dashboardContainer: document.getElementById('dashboard-container'),
        statsContainer: document.getElementById('stats-container'),
        achievementsContainer: document.getElementById('achievements-container'),
        journalContainer: document.getElementById('journal-container'),
        aboutContainer: document.getElementById('about-container'),
        profileContainer: document.getElementById('profile-container'),
        hudDisplay: document.getElementById('hud-display'),
        entryForm: document.getElementById('entry-form'),
        startDateInput: document.getElementById('start-date-input'),
        endDateInput: document.getElementById('end-date-input'),
        streakHistoryContainer: document.getElementById('streak-history-container'),
        journalEntriesContainer: document.getElementById('journal-entries-container'),
        // Add other elements here as needed
    };

    // --- REFACTORED: CENTRALIZED APP STATE ---
    let state = {
        user: null,
        userLogs: [],
        allJournalEntries: [],
        userCheckins: [],
        userData: {},
        ongoingStreakInterval: null,
        displayedYear: new Date().getFullYear(),
        calendarMonthsToShow: 3,
        isHudInEditMode: false,
        mainAppListenersAdded: false,
    };
    
    // --- CONSTANTS ---
    const LEVEL_CONFIG = [
        { level: 1, xp: 0, title: 'NOVICE' },
        // ... rest of your level config
    ];

    // --- AUTHENTICATION ---
    onAuthStateChanged(auth, user => {
        DOM.loadingContainer.classList.add('hidden');
        if (user) {
            state.user = user;
            initializeAppForUser(user);
        } else {
            state.user = null;
            showLoginScreen();
        }
    });

    function showLoginScreen() {
        DOM.appLayout.classList.add('hidden');
        DOM.authContainer.classList.remove('hidden');
    }

    // --- MAIN APP INITIALIZATION ---
    function initializeAppForUser(user) {
        DOM.authContainer.classList.add('hidden');
        DOM.appLayout.classList.remove('hidden');
        
        if (!state.mainAppListenersAdded) {
            addMainAppEventListeners();
        }

        // Setup Firestore listeners
        const logsQuery = query(collection(db, 'users', user.uid, 'logs'), orderBy('startDate', 'desc'));
        onSnapshot(logsQuery, snapshot => {
            state.userLogs = snapshot.docs.filter(doc => doc.data().startDate);
            // Now call functions that depend on this data
            calculateStats();
            renderStreakHistory();
        });

        const journalQuery = query(collection(db, 'users', user.uid, 'journal'), orderBy('date', 'desc'));
        onSnapshot(journalQuery, snapshot => {
            state.allJournalEntries = snapshot.docs;
            // Sort pinned to top client-side
            state.allJournalEntries.sort((a,b) => (b.data().isPinned || false) - (a.data().isPinned || false));
            applyAndRenderJournalFilters();
        });
        
        // ... other onSnapshot listeners for checkins, userDoc, etc.
    }

    // --- REFACTORED: EVENT LISTENERS ---
    function addMainAppEventListeners() {
        // Navigation
        DOM.mainNav.addEventListener('click', (e) => {
            const navLink = e.target.closest('.nav-link');
            if(navLink) {
                setActiveTab(navLink.dataset.tab);
            }
        });

        DOM.newLogoutBtn.addEventListener('click', () => signOut(auth));

        // --- NEW: EVENT DELEGATION for Streak History ---
        DOM.streakHistoryContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('end-streak-btn')) {
                // Handle end & restart logic...
            }
            
            const clickableArea = e.target.closest('.streak-history-item-clickable');
            if (clickableArea) {
                // Handle accordion logic...
            }
        });

        // --- NEW: EVENT DELEGATION for Journal ---
        DOM.journalEntriesContainer.addEventListener('click', (e) => {
            const entryDiv = e.target.closest('.journal-entry');
            if (!entryDiv) return;
            const entryId = entryDiv.dataset.id;

            if (e.target.classList.contains('delete-btn')) {
                // Handle delete logic...
            } else if (e.target.classList.contains('edit-btn')) {
                // Handle edit logic...
            } else if (e.target.classList.contains('pin-btn')) {
                // Handle pin logic...
            }
        });

        // Add other event listeners here (forms, buttons, etc.)
        DOM.authForm.addEventListener('submit', handleAuthFormSubmit);
        
        state.mainAppListenersAdded = true;
    }

    async function handleAuthFormSubmit(e) {
        e.preventDefault();
        const email = DOM.emailInput.value;
        const password = DOM.passwordInput.value;
        DOM.authError.textContent = '';
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            DOM.authError.textContent = error.message;
        }
    }
    
    // --- RENDER & LOGIC FUNCTIONS ---
    
    function setActiveTab(tabId) {
        // Hide all containers
        [DOM.dashboardContainer, DOM.statsContainer, DOM.achievementsContainer, DOM.journalContainer, DOM.aboutContainer, DOM.profileContainer].forEach(container => {
            container.classList.add('hidden');
        });

        // Show the selected container
        const containerToShow = document.getElementById(`${tabId}-container`);
        if (containerToShow) {
            containerToShow.classList.remove('hidden');
        }

        // Update active class on nav links
        DOM.mainNav.querySelectorAll('.nav-link').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
    }

    function calculateStats() {
        // This function will now use state.userLogs
        if (state.userLogs.length === 0) return;
        
        // ... Your existing calculation logic, but referencing state variables
        // For example:
        const longestDurationMs = Math.max(...state.userLogs.map(doc => {
            const log = doc.data();
            return calculateDuration(log.startDate, log.endDate).totalMilliseconds;
        }));
        
        // Update DOM elements
        // longestStreakStat.textContent = ...
    }

    function renderStreakHistory() {
        DOM.streakHistoryContainer.innerHTML = '';
        // Use state.userLogs to build the HTML
        state.userLogs.forEach(doc => {
            //... create and append elements
        });
    }

    function applyAndRenderJournalFilters() {
        // Filter from state.allJournalEntries and render the result
        renderJournalEntries(state.allJournalEntries); // Or a filtered version
    }

    function renderJournalEntries(entriesToRender) {
        DOM.journalEntriesContainer.innerHTML = '';
        // Loop through entriesToRender and build the HTML
    }
    
    function calculateDuration(startDateInput, endDateInput) {
        // No changes needed here, it's a pure utility function
        const start = startDateInput?.toDate ? startDateInput.toDate() : new Date(startDateInput);
        const end = endDateInput ? (endDateInput.toDate ? endDateInput.toDate() : new Date(endDateInput)) : new Date();
        // ... rest of the function
        const diff = end - start;
        if (isNaN(diff) || diff < 0) return { totalMilliseconds: 0, formatted: "0d 0h 0m", days: 0, hours: 0, minutes: 0, seconds: 0 };

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return { totalMilliseconds: diff, days, hours, minutes, seconds, formatted: `${days}d ${hours}h ${minutes}m` };
    }

    // --- All your other utility and rendering functions go here ---
    // Make sure they reference `DOM` and `state` where appropriate.

});
