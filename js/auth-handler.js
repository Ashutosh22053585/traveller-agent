/**
 * Firebase Auth Handler for Travel Planner AI
 * Manages authentication lifecycle and token storage
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

class AuthHandler {
    constructor() {
        // Firebase configuration
        this.firebaseConfig = {
            apiKey: "AIzaSyDZOHbNCyI6Wf0q6gurKX0cVAJ8qkr85Ls",
            authDomain: "traveller-agent.firebaseapp.com",
            databaseURL: "https://traveller-agent-default-rtdb.firebaseio.com",
            projectId: "traveller-agent",
            storageBucket: "traveller-agent.firebasestorage.app",
            messagingSenderId: "748246933073",
            appId: "1:748246933073:web:1119dd37d5924dc1d36270",
            measurementId: "G-PWBKE1E0F9"
        };

        this.app = initializeApp(this.firebaseConfig);
        this.auth = getAuth(this.app);
        this.user = null;
        this.init();
    }

    init() {
        onAuthStateChanged(this.auth, (user) => {
            this.user = user;
            this.updateUI();

            // Dispatch custom event for other modules
            const event = new CustomEvent('authChange', {
                detail: { authenticated: !!user, user }
            });
            document.dispatchEvent(event);
        });
    }

    async login() {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(this.auth, provider);
        } catch (error) {
            console.error("Login failed:", error);
            alert("Login failed: " + error.message);
        }
    }

    async loginWithEmail(email, password) {
        try {
            await signInWithEmailAndPassword(this.auth, email, password);
        } catch (error) {
            console.error("Email login failed:", error);
            alert("Email login failed: " + error.message);
        }
    }

    async signUpWithEmail(email, password) {
        try {
            sessionStorage.setItem('signupSuccess', 'true');
            await createUserWithEmailAndPassword(this.auth, email, password);
        } catch (error) {
            console.error("Sign up failed:", error);
            alert("Sign up failed: " + error.message);
        }
    }

    checkSignupSuccess() {
        if (sessionStorage.getItem('signupSuccess') === 'true') {
            this.showSuccess();
            sessionStorage.removeItem('signupSuccess');
        }
    }

    showSuccess() {
        const toast = document.getElementById('success-toast');
        if (toast) {
            toast.classList.add('active');
            setTimeout(() => {
                toast.classList.remove('active');
            }, 4000);
        }
    }

    skipLogin() {
        localStorage.setItem('debugSkipAuth', 'true');
        window.location.href = 'index.html';
    }

    async phoneLogin() {
        alert("Phone login feature is ready to be configured. Please set up RecaptchaVerifier in your Firebase console.");
    }

    async logout() {
        try {
            localStorage.removeItem('debugSkipAuth');
            await signOut(this.auth);
            window.location.href = 'login.html';
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }

    async getToken() {
        if (localStorage.getItem('debugSkipAuth')) return "debug-token";
        if (!this.user) return null;
        try {
            return await this.user.getIdToken();
        } catch (error) {
            console.error("Failed to get token:", error);
            return null;
        }
    }

    isAuthenticated() {
        return !!this.user || localStorage.getItem('debugSkipAuth') === 'true';
    }

    updateUI() {
        const authenticated = this.isAuthenticated();

        const logoutBtn = document.getElementById('btn-logout');
        const loginRedirectBtn = document.getElementById('btn-login-redirect');

        if (logoutBtn) logoutBtn.style.display = authenticated ? 'block' : 'none';
        if (loginRedirectBtn) loginRedirectBtn.style.display = authenticated ? 'none' : 'block';

        const isLoginPage = window.location.pathname.endsWith('login.html');
        const isIndex = window.location.pathname.endsWith('index.html') ||
            window.location.pathname === '/' ||
            window.location.pathname.endsWith('/');

        // Redirect from login to index if authenticated
        if (isLoginPage && authenticated) {
            window.location.href = 'index.html';
        }

        // Check for success toast on dashboard
        if (isIndex && authenticated) {
            this.checkSignupSuccess();
        }

        // Redirect from index to login if not authenticated
        if (isIndex && !authenticated) {
            window.location.href = 'login.html';
        }
    }
}

window.authHandler = new AuthHandler();
