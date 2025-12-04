/**
 * Authentication Helper - Centralized auth utilities
 * Manages user session, tokens, and authentication state
 */

const AuthHelper = {
    /**
     * Get current user session from storage
     * @returns {Object|null} User session object {id, email} or null
     */
    getCurrentUser: function() {
        const userSession = localStorage.getItem('user_session') || 
                           sessionStorage.getItem('user_session');
        return userSession ? JSON.parse(userSession) : null;
    },

    /**
     * Get authentication token
     * @returns {string|null} JWT token or null
     */
    getAuthToken: function() {
        return localStorage.getItem('auth_token') || 
               sessionStorage.getItem('auth_token');
    },

    /**
     * Check if user is logged in
     * @returns {boolean} True if logged in
     */
    isLoggedIn: function() {
        return this.getCurrentUser() !== null && this.getAuthToken() !== null;
    },

    /**
     * Get display name from user session
     * @returns {string} Display name (email username) or default
     */
    getDisplayName: function() {
        const userSession = this.getCurrentUser();
        if (!userSession || !userSession.email) {
            return 'Người dùng';
        }
        // Extract username from email (part before @)
        return userSession.email.split('@')[0];
    },

    /**
     * Get greeting message based on time of day
     * @returns {string} Greeting message
     */
    getGreeting: function() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Chào buổi sáng';
        if (hour < 18) return 'Chào buổi chiều';
        return 'Chào buổi tối';
    },

    /**
     * Require login - Redirect to login if not authenticated
     * @param {string} returnUrl - URL to return after login
     * @returns {boolean} True if logged in, false if redirected
     */
    requireLogin: function(returnUrl) {
        if (!this.isLoggedIn()) {
            const currentUrl = returnUrl || window.location.pathname + window.location.search;
            window.location.href = '/login?returnUrl=' + encodeURIComponent(currentUrl);
            return false;
        }
        return true;
    },

    /**
     * Logout user - Clear all auth data and redirect to home
     */
    logout: function() {
        // Clear localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_session');
        
        // Clear sessionStorage
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('user_session');
        
        // Redirect to home
        window.location.href = '/';
    },

    /**
     * Save user session after login
     * @param {Object} userSession - User session data {id, email}
     * @param {string} token - JWT token
     * @param {boolean} rememberMe - Whether to persist in localStorage
     */
    saveSession: function(userSession, token, rememberMe) {
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('user_session', JSON.stringify(userSession));
        storage.setItem('auth_token', token);
    },

    /**
     * Get user ID from session
     * @returns {string|null} User ID or null
     */
    getUserId: function() {
        const userSession = this.getCurrentUser();
        return userSession ? userSession.id : null;
    },

    /**
     * Get user email from session
     * @returns {string|null} User email or null
     */
    getUserEmail: function() {
        const userSession = this.getCurrentUser();
        return userSession ? userSession.email : null;
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthHelper;
}
