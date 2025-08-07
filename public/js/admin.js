//admin.js
// ===== Constants =====
const API_BASE_URL = window.location.origin + '/api/admin';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 5 * 60 * 1000; // 5 minutes warning

// ===== State Management =====
const state = {
    currentSection: 'bookings',
    bookings: {
        data: [],
        filter: 'all',
        loading: false,
        error: null
    },
    messages: {
        data: [],
        filter: 'all',
        loading: false,
        error: null,
        unread: 0
    },
    sessionTimer: null,
    sessionWarningTimer: null,
    sessionTimerExpiresAt: null,
    timerIntervalId: null
};

// ===== DOM Elements =====
let elements = {};

// ===== Safe Element Getter =====
function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id '${id}' not found in DOM`);
    }
    return element;
}

function safeGetElements(selector) {
    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) {
        console.warn(`No elements found for selector '${selector}'`);
    }
    return elements;
}

// ===== Data Rendering Functions (moved before updateSectionUI) =====
function renderBookingsData() {
    if (!elements.bookingsList || !state.bookings.data.length) return;

    elements.bookingsList.innerHTML = state.bookings.data.map(booking => `
        <tr class="booking-row ${booking.status}">
            <td>${booking.id}</td>
            <td>${booking.clientName}</td>
            <td>${booking.clientEmail}</td>
            <td>${new Date(booking.eventDate).toLocaleDateString()}</td>
            <td>${booking.packageName}</td>
            <td class="status-cell"><span class="status-badge ${booking.status}">${booking.status}</span></td>
            <td class="actions-cell">
                <button class="btn btn-view view" data-id="${booking.id}">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-export export" data-id="${booking.id}">
                    <i class="fas fa-file-export"></i> Export
                </button>
            </td>
        </tr>
    `).join('');

    // Add event listeners to the action buttons
    const viewButtons = elements.bookingsList.querySelectorAll('.btn-view');
    const exportButtons = elements.bookingsList.querySelectorAll('.btn-export');
    
    viewButtons.forEach(button => {
        button.addEventListener('click', handleBookingAction);
    });
    
    exportButtons.forEach(button => {
        button.addEventListener('click', handleBookingAction);
    });
}

function renderMessagesData() {
    if (!elements.messagesList || !state.messages.data.length) return;

    elements.messagesList.innerHTML = state.messages.data.map(message => `
        <tr class="message-row ${message.read ? 'read' : 'unread'}">
            <td>${message.id}</td>
            <td>${message.name}</td>
            <td>${message.email}</td>
            <td>${message.subject}</td>
            <td>${new Date(message.date).toLocaleDateString()}</td>
            <td class="actions-cell">
                <button class="btn btn-view view" data-id="${message.id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');

    // Add event listeners to the view buttons
    const viewButtons = elements.messagesList.querySelectorAll('.btn-view');
    
    viewButtons.forEach(button => {
        button.addEventListener('click', handleMessageAction);
    });

    // Update unread count in state and UI
    state.messages.unread = state.messages.data.filter(m => !m.read).length;
    if (elements.unreadCount) {
        elements.unreadCount.textContent = state.messages.unread;
        elements.unreadCount.style.display = state.messages.unread > 0 ? 'inline-block' : 'none';
    }
}

async function initializeAdmin() {
    try {
        setLoading(true);
        console.log('[Init] Starting initialization');

        // Assign all your elements here first with safe getters
        elements = {
            loginSection: safeGetElement('login-section'),
            loginForm: safeGetElement('login-form'),
            usernameInput: safeGetElement('username'),
            passwordInput: safeGetElement('password'),
            togglePassword: safeGetElement('toggle-password'),
            loginMessage: safeGetElement('login-message'),
            adminHeader: document.querySelector('.admin-header'),
            navLinks: safeGetElements('.nav-link'),
            logoutBtn: safeGetElement('logout'),
            sectionContainers: {
                bookings: safeGetElement('bookings-section'),
                messages: safeGetElement('messages-section'),
            },
            bookingsList: safeGetElement('bookings-list'),
            bookingsEmpty: safeGetElement('bookings-empty'),
            bookingsError: safeGetElement('bookings-error'),
            bookingsCount: safeGetElement('bookings-count'),
            bookingFilter: safeGetElement('booking-filter'),
            refreshBookings: safeGetElement('refresh-bookings'),
            retryBookings: safeGetElement('retry-bookings'),
            exportBookings: safeGetElement('export-bookings'),
            messagesList: safeGetElement('messages-list'),
            messagesEmpty: safeGetElement('messages-empty'),
            messagesError: safeGetElement('messages-error'),
            messagesCount: safeGetElement('messages-count'),
            messageFilter: safeGetElement('message-filter'),
            refreshMessages: safeGetElement('refresh-messages'),
            retryMessages: safeGetElement('retry-messages'),
            unreadCount: safeGetElement('unread-count'),
            sessionTime: safeGetElement('session-time'),
            loadingOverlay: safeGetElement('loading-overlay'),
            notification: safeGetElement('system-notification'),
            notificationMessage: safeGetElement('notification-message'),
        };

        // Hide admin header initially (with null check)
        if (elements.adminHeader) {
            elements.adminHeader.classList.add('hidden');
        }

        // Disable login button until CSRF token is fetched
        if (elements.loginForm) {
            const loginButton = elements.loginForm.querySelector('button[type="submit"]');
            if (loginButton) loginButton.disabled = true;
        }

        console.log('[Init] Fetching CSRF token...');
        await getCSRFToken();

        if (elements.loginForm) {
            const loginButton = elements.loginForm.querySelector('button[type="submit"]');
            if (loginButton) loginButton.disabled = false;
        }

        console.log('[Init] Setting up event listeners...');
        setupEventListeners();

        console.log('[Init] Checking authentication state...');
        await checkAuthState();

        console.log('[Init] Initialization completed.');
    } catch (err) {
        console.error('Initialization error:', err);
        showNotification('Failed to initialize admin panel', 'error');
    } finally {
        setLoading(false);
    }
}

// ===== UI Functions =====
function showNotification(message, type = 'info', duration = 3000) {
    if (!elements.notificationMessage || !elements.notification) {
        console.warn('Notification elements not found');
        return;
    }
    
    elements.notificationMessage.textContent = message;
    elements.notification.className = `system-notification ${type}`;
    elements.notification.classList.remove('hidden');

    setTimeout(() => {
        elements.notification.classList.add('hidden');
    }, duration);
}

function setLoading(loading) {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.classList.toggle('hidden', !loading);
    }
}

function showAdminPanel() {
    if (elements.loginSection) {
        elements.loginSection.classList.add('hidden');
    }
    if (elements.adminHeader) {
        elements.adminHeader.classList.remove('hidden');
    }
    showSection(state.currentSection);
}

function showLogin() {
    if (elements.loginSection) {
        elements.loginSection.classList.remove('hidden');
    }
    if (elements.adminHeader) {
        elements.adminHeader.classList.add('hidden');
    }
    
    Object.values(elements.sectionContainers).forEach(section => {
        if (section) {
            section.classList.add('hidden');
        }
    });

    if (elements.usernameInput) elements.usernameInput.value = '';
    if (elements.passwordInput) {
        elements.passwordInput.value = '';
        elements.passwordInput.type = 'password';
    }
    if (elements.togglePassword) {
        const icon = elements.togglePassword.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-eye';
        }
    }
}

async function showSection(sectionId) {
    if (!elements.sectionContainers[sectionId]) return;
    state.currentSection = sectionId;

    Object.values(elements.sectionContainers).forEach(section => {
        if (section) {
            section.classList.add('hidden');
        }
    });
    
    if (elements.sectionContainers[sectionId]) {
        elements.sectionContainers[sectionId].classList.remove('hidden');
    }

    if (elements.navLinks && elements.navLinks.length > 0) {
        elements.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.section === sectionId);
        });
    }

    await loadSectionData(sectionId);
}

// ===== Session Timer =====
window.resetSessionTimer = function () {
    if (state.sessionTimer) clearTimeout(state.sessionTimer);
    if (state.sessionWarningTimer) clearTimeout(state.sessionWarningTimer);
    if (state.timerIntervalId) clearInterval(state.timerIntervalId);

    const now = Date.now();
    state.sessionTimerExpiresAt = now + SESSION_TIMEOUT;

    state.sessionTimer = setTimeout(() => {
        logout(true);
    }, SESSION_TIMEOUT);

    state.sessionWarningTimer = setTimeout(() => {
        if (confirm('Your session will expire in 5 minutes. Continue working?')) {
            resetSessionTimer();
        }
    }, SESSION_TIMEOUT - WARNING_TIME);

    updateTimerDisplay();
    state.timerIntervalId = setInterval(updateTimerDisplay, 1000);
};

function updateTimerDisplay() {
    if (!elements.sessionTime || !state.sessionTimerExpiresAt) return;

    const now = Date.now();
    let diff = state.sessionTimerExpiresAt - now;
    if (diff < 0) diff = 0;

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    elements.sessionTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    if (elements.sessionTime.parentElement) {
        elements.sessionTime.parentElement.classList.toggle('warning', diff < WARNING_TIME);
    }

    if (diff === 0 && state.timerIntervalId) {
        clearInterval(state.timerIntervalId);
        state.timerIntervalId = null;
    }
}

// ===== Auth =====
async function checkAuthState() {
    try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/check-auth`, {
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Auth check failed');

        const data = await response.json();

        if (data.authenticated) {
            showAdminPanel();
            resetSessionTimer();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showLogin();
    } finally {
        setLoading(false);
    }
}

async function handleLogin(event) {
    event.preventDefault();

    if (!csrfReady || !csrfToken) {
        showNotification('Security token not ready. Please wait and try again.', 'error');
        return;
    }

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerHTML : '';

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
        }
        
        if (elements.loginMessage) {
            elements.loginMessage.classList.add('hidden');
        }

        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify({
                username: elements.usernameInput ? elements.usernameInput.value : '',
                password: elements.passwordInput ? elements.passwordInput.value : ''
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }

        showAdminPanel();
        resetSessionTimer();
        showNotification('Login successful', 'success');
    } catch (error) {
        if (elements.loginMessage) {
            elements.loginMessage.textContent = error.message;
            elements.loginMessage.classList.remove('hidden');
        }
        showNotification('Login failed: ' + error.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}

async function logout(expired = false) {
    if (state.sessionTimer) clearTimeout(state.sessionTimer);
    if (state.sessionWarningTimer) clearTimeout(state.sessionWarningTimer);
    if (state.timerIntervalId) clearInterval(state.timerIntervalId);

    try {
        await fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            headers: { 'x-csrf-token': csrfToken },
            credentials: 'include'
        });

        showLogin();
        showNotification(expired ? 'Session expired. Please log in again.' : 'Logged out successfully', expired ? 'warning' : 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout failed', 'error');
        showLogin();
    }
}

// ===== Data Functions =====
let csrfToken = '';
let csrfReady = false;

async function getCSRFToken() {
    try {
        const response = await fetch(`${API_BASE_URL}/csrf-token`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error('CSRF token fetch failed');
        const data = await response.json();
        csrfToken = data.token;
        csrfReady = true;
        const hiddenField = document.getElementById('csrf-token');
        if (hiddenField) hiddenField.value = csrfToken;
    } catch (error) {
        console.error('CSRF Token Error:', error);
        showNotification('Security error. Please refresh.', 'error');
    }
}

async function loadSectionData(sectionId) {
    try {
        state[sectionId].loading = true;
        state[sectionId].error = null;
        updateSectionUI(sectionId);

        if (sectionId === 'bookings') {
            const response = await fetch(`${API_BASE_URL}/bookings`, {
                credentials: 'include',
                headers: {
                    'x-csrf-token': csrfToken
                }
            });

            if (!response.ok) throw new Error('Failed to load bookings');

            const data = await response.json();
            state.bookings.data = data;
        }

        if (sectionId === 'messages') {
            const response = await fetch(`${API_BASE_URL}/messages`, {
                credentials: 'include',
                headers: {
                    'x-csrf-token': csrfToken
                }
            });

            if (!response.ok) throw new Error('Failed to load messages');

            const data = await response.json();
            state.messages.data = data;
        }

    } catch (error) {
        console.error(`Error loading ${sectionId}:`, error);
        state[sectionId].error = error.message;
        showNotification(`Failed to load ${sectionId}`, 'error');
    } finally {
        state[sectionId].loading = false;
        updateSectionUI(sectionId);
    }
}

function updateSectionUI(sectionId) {
    const section = state[sectionId];
    const container = elements[`${sectionId}List`];
    const emptyEl = elements[`${sectionId}Empty`];
    const errorEl = elements[`${sectionId}Error`];

    if (!container) return;

    container.innerHTML = '';
    container.classList.add('hidden');
    
    if (emptyEl) emptyEl.classList.add('hidden');
    if (errorEl) errorEl.classList.add('hidden');

    if (section.loading) {
        // Different column count for different sections
        const colCount = sectionId === 'bookings' ? 7 : 6;
        container.innerHTML = `
            <tr class="loading-row">
                <td colspan="${colCount}">
                    <div class="loading-content">
                        <i class="fas fa-spinner fa-spin"></i> Loading ${sectionId}...
                    </div>
                </td>
            </tr>
        `;
        container.classList.remove('hidden');
    } else if (section.error) {
        if (errorEl) errorEl.classList.remove('hidden');
    } else if (section.data.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
    } else {
        container.classList.remove('hidden');
        if (sectionId === 'bookings') {
            renderBookingsData();
        } else if (sectionId === 'messages') {
            renderMessagesData();
        }
    }
}

// ===== Modal System =====
function createModal(config) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-container">
            <div class="modal-header">
                <h3>${config.title}</h3>
                <button type="button" class="close-modal" aria-label="Close modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                ${config.content}
            </div>
            <div class="modal-footer">
                ${config.footer || '<button type="button" class="btn btn-secondary close-modal-btn"><i class="fas fa-times"></i> Close</button>'}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup close handlers
    const closeButtons = modal.querySelectorAll('.close-modal, .close-modal-btn');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modal.remove();
        });
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Close on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    return modal;
}

// ===== Booking and Message Actions =====
function handleBookingAction(event) {
    const action = event.currentTarget.classList.contains('view') ? 'view' : 
                  event.currentTarget.classList.contains('export') ? 'export' : null;
    const bookingId = event.currentTarget.dataset.id;
    
    switch(action) {
        case 'view':
            viewBookingDetails(bookingId);
            break;
        case 'export':
            exportBooking(bookingId);
            break;
    }
}

async function viewBookingDetails(bookingId) {
    try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
            credentials: 'include',
            headers: {
                'x-csrf-token': csrfToken
            }
        });
        
        if (!response.ok) throw new Error('Failed to load booking details');
        
        const booking = await response.json();
        showBookingModal(booking);
    } catch (error) {
        showNotification(`Error viewing booking: ${error.message}`, 'error');
    } finally {
        setLoading(false);
    }
}

// ===== Booking Row Rendering =====
function renderBookingRow(booking) {
    const statusClass = booking.status.toLowerCase();
    let actionButtons = '';
    
    // Add action buttons based on status
    if (booking.status === 'pending') {
        actionButtons = `
            <div class="action-buttons">
                <button onclick="confirmBooking('${booking.id}')" class="btn btn-primary" title="Confirm Booking">
                    <i class="fas fa-check"></i> Confirm
                </button>
                <button onclick="handleCancelBooking('${booking.id}')" class="btn btn-cancel" title="Cancel Booking">
                    <i class="fas fa-ban"></i> Cancel
                </button>
                <button onclick="viewBookingDetails('${booking.id}')" class="btn btn-secondary view" data-id="${booking.id}" title="View Details">
                    <i class="fas fa-eye"></i> View
                </button>
                <button onclick="exportBooking('${booking.id}')" class="btn btn-info export" data-id="${booking.id}" title="Export Booking">
                    <i class="fas fa-download"></i> Export
                </button>
            </div>
        `;
    } else if (booking.status === 'confirmed') {
        actionButtons = `
            <div class="action-buttons">
                <button onclick="handleCancelBooking('${booking.id}')" class="btn btn-cancel" title="Cancel Booking">
                    <i class="fas fa-ban"></i> Cancel
                </button>
                <button onclick="viewBookingDetails('${booking.id}')" class="btn btn-secondary view" data-id="${booking.id}" title="View Details">
                    <i class="fas fa-eye"></i> View
                </button>
                <button onclick="exportBooking('${booking.id}')" class="btn btn-info export" data-id="${booking.id}" title="Export Booking">
                    <i class="fas fa-download"></i> Export
                </button>
            </div>
        `;
    } else if (booking.status === 'cancelled') {
        actionButtons = `
            <div class="action-buttons">
                <button onclick="handleRestoreBooking('${booking.id}')" class="btn btn-success" title="Restore Booking">
                    <i class="fas fa-undo"></i> Restore
                </button>
                <button onclick="viewBookingDetails('${booking.id}')" class="btn btn-secondary view" data-id="${booking.id}" title="View Details">
                    <i class="fas fa-eye"></i> View
                </button>
                <button onclick="exportBooking('${booking.id}')" class="btn btn-info export" data-id="${booking.id}" title="Export Booking">
                    <i class="fas fa-download"></i> Export
                </button>
            </div>
        `;
    } else {
        // For other statuses, only show view and export
        actionButtons = `
            <div class="action-buttons">
                <button onclick="viewBookingDetails('${booking.id}')" class="btn btn-secondary view" data-id="${booking.id}" title="View Details">
                    <i class="fas fa-eye"></i> View
                </button>
                <button onclick="exportBooking('${booking.id}')" class="btn btn-info export" data-id="${booking.id}" title="Export Booking">
                    <i class="fas fa-download"></i> Export
                </button>
            </div>
        `;
    }
    
    return `
        <tr class="booking-row" data-booking-id="${booking.id}">
            <td class="client-name">${escapeHtml(booking.clientName)}</td>
            <td class="client-email">${escapeHtml(booking.clientEmail)}</td>
            <td class="event-type">${escapeHtml(booking.eventType)}</td>
            <td class="event-date">${new Date(booking.eventDate).toLocaleDateString()}</td>
            <td class="package">${escapeHtml(booking.package)}</td>
            <td class="status">
                <span class="status-badge ${statusClass}">
                    ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </span>
            </td>
            <td class="actions">${actionButtons}</td>
        </tr>
    `;
}

// Helper function to escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Booking List Rendering =====
function renderBookingsList(bookings) {
    const tbody = document.querySelector('#bookings-table tbody');
    if (!tbody) {
        console.error('Bookings table tbody not found');
        return;
    }
    
    if (bookings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">
                    <i class="fas fa-calendar-times"></i>
                    <p>No bookings found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = bookings.map(booking => renderBookingRow(booking)).join('');
}

// ===== Load Bookings Function =====
async function loadBookings(filter = 'all') {
    try {
        setLoading(true);
        
        let url = `${API_BASE_URL}/bookings`;
        if (filter !== 'all') {
            url += `?status=${filter}`;
        }
        
        const response = await fetch(url, {
            credentials: 'include',
            headers: {
                'x-csrf-token': csrfToken
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load bookings');
        }
        
        const bookings = await response.json();
        
        // Update state
        if (typeof state !== 'undefined') {
            state.bookings = {
                ...state.bookings,
                data: bookings,
                filter: filter
            };
        }
        
        // Render the bookings
        renderBookingsList(bookings);
        
        // Update counts if you have counters
        updateBookingCounts(bookings);
        
    } catch (error) {
        console.error('Error loading bookings:', error);
        showNotification(`Error loading bookings: ${error.message}`, 'error');
    } finally {
        setLoading(false);
    }
}

// ===== Update Booking Counts =====
function updateBookingCounts(bookings) {
    const counts = {
        all: bookings.length,
        pending: bookings.filter(b => b.status === 'pending').length,
        confirmed: bookings.filter(b => b.status === 'confirmed').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length
    };
    
    // Update count badges if they exist
    Object.keys(counts).forEach(status => {
        const badge = document.querySelector(`.filter-btn[data-filter="${status}"] .count`);
        if (badge) {
            badge.textContent = counts[status];
        }
    });
}

async function confirmBooking(bookingId) {
    try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/confirm`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'x-csrf-token': csrfToken
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to confirm booking');
        }

        const booking = await response.json();
        
        // Close any open modals
        document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());
        
        // Refresh the bookings list
        await loadSectionData('bookings');
        
        showNotification('Booking confirmed successfully', 'success');
    } catch (error) {
        console.error('Confirm booking error:', error);
        showNotification(`Error confirming booking: ${error.message}`, 'error');
    } finally {
        setLoading(false);
    }
}

// Cancel booking function
async function cancelBooking(bookingId, reason = '') {
    try {
        // Show loading state
        const cancelBtn = document.getElementById('cancel-booking-btn');
        const originalText = cancelBtn.innerHTML;
        cancelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelling...';
        cancelBtn.disabled = true;

        // Get CSRF token
        const csrfResponse = await fetch('/api/admin/csrf-token', {
            credentials: 'include'
        });
        const { token } = await csrfResponse.json();
        
        // Make the cancel request
        const response = await fetch(`/api/admin/bookings/${bookingId}/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': token
            },
            credentials: 'include',
            body: JSON.stringify({ reason })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to cancel booking');
        }
        
        // Show success message
        showNotification('Booking cancelled successfully', 'success');
        
        // Close modal and refresh bookings
        closeModal();
        await loadBookings();
        
    } catch (error) {
        console.error('Cancel booking error:', error);
        showNotification('Failed to cancel booking: ' + error.message, 'error');
    } finally {
        // Reset button state
        const cancelBtn = document.getElementById('cancel-booking-btn');
        cancelBtn.innerHTML = '<i class="fas fa-ban"></i> Cancel Booking';
        cancelBtn.disabled = false;
    }
}

// Restore booking function (for cancelled bookings)
async function restoreBooking(bookingId) {
    try {
        // Show loading state
        const restoreBtn = document.getElementById('restore-booking-btn');
        const originalText = restoreBtn.innerHTML;
        restoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Restoring...';
        restoreBtn.disabled = true;

        // Get CSRF token
        const csrfResponse = await fetch('/api/admin/csrf-token', {
            credentials: 'include'
        });
        const { token } = await csrfResponse.json();
        
        // Make the restore request
        const response = await fetch(`/api/admin/bookings/${bookingId}/restore`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': token
            },
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to restore booking');
        }
        
        // Show success message
        showNotification('Booking restored successfully', 'success');
        
        // Close modal and refresh bookings
        closeModal();
        await loadBookings();
        
    } catch (error) {
        console.error('Restore booking error:', error);
        showNotification('Failed to restore booking: ' + error.message, 'error');
    } finally {
        // Reset button state
        const restoreBtn = document.getElementById('restore-booking-btn');
        restoreBtn.innerHTML = '<i class="fas fa-undo"></i> Restore Booking';
        restoreBtn.disabled = false;
    }
}

// Handle cancel booking with confirmation
function handleCancelBooking(bookingId) {
    // Show confirmation dialog
    const confirmCancel = confirm('Are you sure you want to cancel this booking?');
    if (!confirmCancel) return;
    
    // Ask for cancellation reason
    const reason = prompt('Please provide a reason for cancellation (optional):');
    
    // Call the cancel function
    cancelBooking(bookingId, reason);
}

// Handle restore booking with confirmation
function handleRestoreBooking(bookingId) {
    // Show confirmation dialog
    const confirmRestore = confirm('Are you sure you want to restore this cancelled booking?');
    if (!confirmRestore) return;
    
    // Call the restore function
    restoreBooking(bookingId);
}

// Add event listeners for modal buttons (add this to your existing DOMContentLoaded event)
document.addEventListener('DOMContentLoaded', function() {
    // Cancel booking button in modal
    const cancelBookingBtn = document.getElementById('cancel-booking-btn');
    if (cancelBookingBtn) {
        cancelBookingBtn.addEventListener('click', function() {
            const bookingId = this.dataset.bookingId;
            if (bookingId) {
                handleCancelBooking(bookingId);
            }
        });
    }
    
    // Restore booking button in modal
    const restoreBookingBtn = document.getElementById('restore-booking-btn');
    if (restoreBookingBtn) {
        restoreBookingBtn.addEventListener('click', function() {
            const bookingId = this.dataset.bookingId;
            if (bookingId) {
                handleRestoreBooking(bookingId);
            }
        });
    }

    // Confirm booking button in modal
    const confirmBookingBtn = document.getElementById('confirm-booking-btn');
    if (confirmBookingBtn) {
        confirmBookingBtn.addEventListener('click', function() {
            const bookingId = this.dataset.bookingId;
            if (bookingId) {
                if (confirm('Are you sure you want to confirm this booking?')) {
                    confirmBooking(bookingId);
                }
            }
        });
    }

    // Message action buttons in modal
    const markReadBtn = document.getElementById('mark-read-btn');
    if (markReadBtn) {
        markReadBtn.addEventListener('click', function() {
            const messageId = this.dataset.messageId;
            if (messageId) {
                markMessageAsRead(messageId);
            }
        });
    }

    const markUnreadBtn = document.getElementById('mark-unread-btn');
    if (markUnreadBtn) {
        markUnreadBtn.addEventListener('click', function() {
            const messageId = this.dataset.messageId;
            if (messageId) {
                markMessageAsUnread(messageId);
            }
        });
    }

    const archiveBtn = document.getElementById('archive-btn');
    if (archiveBtn) {
        archiveBtn.addEventListener('click', function() {
            const messageId = this.dataset.messageId;
            if (messageId) {
                if (confirm('Are you sure you want to archive this message?')) {
                    archiveMessage(messageId);
                }
            }
        });
    }

    // Filter buttons for bookings
    const bookingFilterBtns = document.querySelectorAll('.booking-filter-btn');
    bookingFilterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            if (filter) {
                // Update active state
                bookingFilterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Load filtered bookings
                loadBookings(filter);
            }
        });
    });

    // Filter buttons for messages
    const messageFilterBtns = document.querySelectorAll('.message-filter-btn');
    messageFilterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            if (filter) {
                // Update active state
                messageFilterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Load filtered messages
                loadSectionData('messages'); // You might want to create a loadMessages function similar to loadBookings
            }
        });
    });

    // Search functionality
    const bookingSearch = document.getElementById('booking-search');
    if (bookingSearch) {
        bookingSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const bookingRows = document.querySelectorAll('.booking-row');
            
            bookingRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }

    const messageSearch = document.getElementById('message-search');
    if (messageSearch) {
        messageSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const messageRows = document.querySelectorAll('.message-row');
            
            messageRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }

    // Bulk actions
    const selectAllBookings = document.getElementById('select-all-bookings');
    if (selectAllBookings) {
        selectAllBookings.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.booking-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
    }

    const bulkExportBtn = document.getElementById('bulk-export-bookings');
    if (bulkExportBtn) {
        bulkExportBtn.addEventListener('click', function() {
            const selectedBookings = document.querySelectorAll('.booking-checkbox:checked');
            if (selectedBookings.length === 0) {
                showNotification('Please select at least one booking to export', 'warning');
                return;
            }
            
            const bookingIds = Array.from(selectedBookings).map(cb => cb.dataset.bookingId);
            exportBookings(bookingIds);
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + R to refresh current section
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            if (state.currentSection) {
                loadSectionData(state.currentSection);
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal-overlay');
            modals.forEach(modal => modal.remove());
        }
        
        // Alt + 1, 2, etc. to switch sections
        if (e.altKey && e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            const sections = ['bookings', 'messages'];
            const index = parseInt(e.key) - 1;
            if (sections[index]) {
                showSection(sections[index]);
            }
        }
    });
});


function showBookingModal(booking) {
    console.log('Booking object:', booking);
    console.log('Booking status:', booking.status);
    const content = `
        <div class="modal-row">
            <span class="modal-label">Client:</span>
            <span>${booking.clientName}</span>
        </div>
        <div class="modal-row">
            <span class="modal-label">Email:</span>
            <span>${booking.clientEmail}</span>
        </div>
        <div class="modal-row">
            <span class="modal-label">Phone:</span>
            <span>${booking.clientPhone}</span>
        </div>
        <div class="modal-row">
            <span class="modal-label">Event Type:</span>
            <span>${booking.eventType}</span>
        </div>
        <div class="modal-row">
            <span class="modal-label">Event Date:</span>
            <span>${new Date(booking.eventDate).toLocaleDateString()}</span>
        </div>
        <div class="modal-row">
            <span class="modal-label">Package:</span>
            <span>${booking.package}</span>
        </div>
        <div class="modal-row">
            <span class="modal-label">Status:</span>
            <span class="status-badge ${booking.status}">
                ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
        </div>
        <div class="modal-row full-width">
            <span class="modal-label">Additional Notes:</span>
            <div class="message-content">
                <p>${booking.additionalNotes || 'No additional notes'}</p>
            </div>
        </div>
    `;
    
    // Create footer based on booking status
    let footer;
    if (booking.status === 'pending') {
        footer = `
            <button type="button" class="btn btn-secondary close-modal-btn">
                <i class="fas fa-times"></i> Close
            </button>
            <button type="button" class="btn btn-danger cancel-booking-btn">
                <i class="fas fa-times-circle"></i> Cancel Booking
            </button>
            <button type="button" class="btn btn-primary confirm-booking-btn">
                <i class="fas fa-check"></i> Confirm Booking
            </button>
        `;
    } else if (booking.status === 'confirmed') {
        footer = `
            <button type="button" class="btn btn-secondary close-modal-btn">
                <i class="fas fa-times"></i> Close
            </button>
            <button type="button" class="btn btn-danger cancel-booking-btn">
                <i class="fas fa-times-circle"></i> Cancel Booking
            </button>
        `;
    } else {
        // For cancelled or other statuses, only show close button
        footer = `
            <button type="button" class="btn btn-secondary close-modal-btn">
                <i class="fas fa-times"></i> Close
            </button>
        `;
    }
    
    const modal = createModal({
        title: 'Booking Details',
        content: content,
        footer: footer
    });
    
    // Add confirm booking handler if button exists
    const confirmBtn = modal.querySelector('.confirm-booking-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to confirm this booking?')) {
                confirmBooking(booking.id);
            }
        });
    }
    
    // Add cancel booking handler if button exists
    const cancelBtn = modal.querySelector('.cancel-booking-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
                cancelBooking(booking.id);
            }
        });
    }
}

async function exportBooking(bookingId = null) {
    try {
        setLoading(true);
        let url = `${API_BASE_URL}/bookings/export`;
        
        if (bookingId) {
            url += `?id=${bookingId}`;
        } else {
            // For bulk export, include current filters
            url += `?filter=${state.bookings.filter}`;
        }
        
        const response = await fetch(url, {
            credentials: 'include',
            headers: {
                'x-csrf-token': csrfToken
            }
        });
        
        if (!response.ok) throw new Error('Export failed');
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = bookingId ? `booking-${bookingId}.pdf` : `bookings-${new Date().toISOString()}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        showNotification('Export successful', 'success');
    } catch (error) {
        showNotification(`Export failed: ${error.message}`, 'error');
    } finally {
        setLoading(false);
    }
}

// ===== Message Actions =====
function handleMessageAction(event) {
    const action = event.currentTarget.classList.contains('view') ? 'view' : null;
    const messageId = event.currentTarget.dataset.id;
    
    switch(action) {
        case 'view':
            viewMessageDetails(messageId);
            break;
    }
}

async function viewMessageDetails(messageId) {
    try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
            credentials: 'include',
            headers: {
                'x-csrf-token': csrfToken
            }
        });
        
        if (!response.ok) throw new Error('Failed to load message');
        
        const message = await response.json();
        showMessageModal(message);
        
        // Mark message as read if it wasn't already
        if (!message.read) {
            await markMessageAsRead(messageId);
        }
    } catch (error) {
        showNotification(`Error viewing message: ${error.message}`, 'error');
    } finally {
        setLoading(false);
    }
}

async function markMessageAsRead(messageId) {
    try {
        const response = await fetch(`${API_BASE_URL}/messages/${messageId}/mark-read`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'x-csrf-token': csrfToken
            }
        });
        
        if (response.ok) {
            // Update the message in state
            const messageIndex = state.messages.data.findIndex(m => m.id === messageId);
            if (messageIndex !== -1) {
                state.messages.data[messageIndex].read = true;
                // Update UI
                renderMessagesData();
            }
        }
    } catch (error) {
        console.error('Error marking message as read:', error);
    }
}

async function markMessageAsUnread(messageId) {
    try {
        const response = await fetch(`${API_BASE_URL}/messages/${messageId}/mark-unread`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'x-csrf-token': csrfToken
            }
        });
        
        if (response.ok) {
            // Update the message in state
            const messageIndex = state.messages.data.findIndex(m => m.id === messageId);
            if (messageIndex !== -1) {
                state.messages.data[messageIndex].read = false;
                // Update UI
                renderMessagesData();
            }
            showNotification('Message marked as unread', 'success');
        }
    } catch (error) {
        console.error('Error marking message as unread:', error);
        showNotification('Failed to mark message as unread', 'error');
    }
}

async function archiveMessage(messageId) {
    try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/messages/${messageId}/archive`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'x-csrf-token': csrfToken
            }
        });
        
        if (response.ok) {
            // Close any open modals
            document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());
            
            // Refresh the messages list
            await loadSectionData('messages');
            
            showNotification('Message archived successfully', 'success');
        } else {
            throw new Error('Failed to archive message');
        }
    } catch (error) {
        console.error('Error archiving message:', error);
        showNotification(`Error archiving message: ${error.message}`, 'error');
    } finally {
        setLoading(false);
    }
}

function showMessageModal(message) {
    const content = `
        <div class="modal-row">
            <span class="modal-label">From:</span>
            <span>${message.name} &lt;${message.email}&gt;</span>
        </div>
        <div class="modal-row">
            <span class="modal-label">Date:</span>
            <span>${new Date(message.date).toLocaleString()}</span>
        </div>
        <div class="modal-row">
            <span class="modal-label">Subject:</span>
            <span>${message.subject}</span>
        </div>
        <div class="modal-row">
            <span class="modal-label">Status:</span>
            <span class="status-badge ${message.read ? 'read' : 'unread'}">
                ${message.read ? 'Read' : 'Unread'}
            </span>
        </div>
        <div class="modal-row full-width">
            <span class="modal-label">Message:</span>
            <div class="message-content">
                <p>${message.message}</p>
            </div>
        </div>
    `;
    
    // Create appropriate footer buttons for messages
    const footer = `
        <button type="button" class="btn btn-secondary close-modal-btn">
            <i class="fas fa-times"></i> Close
        </button>
        ${message.read ? 
            `<button type="button" class="btn btn-outline mark-unread-btn">
                <i class="fas fa-envelope"></i> Mark as Unread
            </button>` : 
            `<button type="button" class="btn btn-outline mark-read-btn">
                <i class="fas fa-envelope-open"></i> Mark as Read
            </button>`
        }
        <button type="button" class="btn btn-warning archive-btn">
            <i class="fas fa-archive"></i> Archive
        </button>
        <button type="button" class="btn btn-primary reply-btn">
            <i class="fas fa-reply"></i> Reply
        </button>
    `;
    
    const modal = createModal({
        title: 'Message Details',
        content: content,
        footer: footer
    });
    
    // Add event handlers for message actions
    const replyBtn = modal.querySelector('.reply-btn');
    if (replyBtn) {
        replyBtn.addEventListener('click', () => {
            // Create mailto link for reply
            const subject = `Re: ${message.subject}`;
            const body = `\n\n--- Original Message ---\nFrom: ${message.name} <${message.email}>\nDate: ${new Date(message.date).toLocaleString()}\nSubject: ${message.subject}\n\n${message.message}`;
            
            const mailtoLink = `mailto:${message.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.location.href = mailtoLink;
        });
    }
    
    const markUnreadBtn = modal.querySelector('.mark-unread-btn');
    if (markUnreadBtn) {
        markUnreadBtn.addEventListener('click', () => {
            markMessageAsUnread(message.id);
            modal.remove();
        });
    }
    
    const markReadBtn = modal.querySelector('.mark-read-btn');
    if (markReadBtn) {
        markReadBtn.addEventListener('click', () => {
            markMessageAsRead(message.id);
            modal.remove();
        });
    }
    
    const archiveBtn = modal.querySelector('.archive-btn');
    if (archiveBtn) {
        archiveBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to archive this message?')) {
                archiveMessage(message.id);
            }
        });
    }
}

// ===== Event Listeners =====
// ===== Event Listeners =====
function setupEventListeners() {
    // Login form
    if (elements.loginForm) {
        elements.loginForm.addEventListener('submit', handleLogin);
    }

    // Password toggle
    if (elements.togglePassword && elements.passwordInput) {
        elements.togglePassword.addEventListener('click', () => {
            const type = elements.passwordInput.type === 'password' ? 'text' : 'password';
            elements.passwordInput.type = type;
        
            const icon = elements.togglePassword.querySelector('i');
            if (icon) {
                if (type === 'password') {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                } else {
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                }
            }
        });        
    }

    // Navigation links
    if (elements.navLinks && elements.navLinks.length > 0) {
        elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                if (section) {
                    showSection(section);
                    resetSessionTimer();
                }
            });
        });
    }

    // Logout button
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to log out?')) {
                await logout();
            }
        });
    }

    // Refresh buttons
    if (elements.refreshBookings) {
        elements.refreshBookings.addEventListener('click', () => {
            loadSectionData('bookings');
            resetSessionTimer();
        });
    }

    if (elements.refreshMessages) {
        elements.refreshMessages.addEventListener('click', () => {
            loadSectionData('messages');
            resetSessionTimer();
        });
    }

    // Retry buttons
    if (elements.retryBookings) {
        elements.retryBookings.addEventListener('click', () => {
            loadSectionData('bookings');
        });
    }

    if (elements.retryMessages) {
        elements.retryMessages.addEventListener('click', () => {
            loadSectionData('messages');
        });
    }

    // Filter dropdowns
    if (elements.bookingFilter) {
        elements.bookingFilter.addEventListener('change', () => {
            state.bookings.filter = elements.bookingFilter.value;
            loadSectionData('bookings');
        });
    }

    if (elements.messageFilter) {
        elements.messageFilter.addEventListener('change', () => {
            state.messages.filter = elements.messageFilter.value;
            loadSectionData('messages');
        });
    }

    // Export button
    if (elements.exportBookings) {
        elements.exportBookings.addEventListener('click', (e) => {
            e.preventDefault();
            exportBooking();
            resetSessionTimer();
        });
    }

    // Modal button handlers (using event delegation since modals are created dynamically)
    document.addEventListener('click', function(e) {
        // Cancel booking button in modal
        if (e.target.classList.contains('cancel-booking-btn')) {
            const bookingId = e.target.dataset.bookingId;
            if (bookingId) {
                handleCancelBooking(bookingId);
            }
        }
        
        // Restore booking button in modal
        if (e.target.classList.contains('restore-booking-btn')) {
            const bookingId = e.target.dataset.bookingId;
            if (bookingId) {
                handleRestoreBooking(bookingId);
            }
        }

        // Confirm booking button in modal
        if (e.target.classList.contains('confirm-booking-btn')) {
            const bookingId = e.target.dataset.bookingId;
            if (bookingId) {
                if (confirm('Are you sure you want to confirm this booking?')) {
                    confirmBooking(bookingId);
                }
            }
        }

        // Message action buttons in modal
        if (e.target.classList.contains('mark-read-btn')) {
            const messageId = e.target.dataset.messageId;
            if (messageId) {
                markMessageAsRead(messageId);
            }
        }

        if (e.target.classList.contains('mark-unread-btn')) {
            const messageId = e.target.dataset.messageId;
            if (messageId) {
                markMessageAsUnread(messageId);
            }
        }

        if (e.target.classList.contains('archive-btn')) {
            const messageId = e.target.dataset.messageId;
            if (messageId) {
                if (confirm('Are you sure you want to archive this message?')) {
                    archiveMessage(messageId);
                }
            }
        }

        // Filter buttons for bookings
        if (e.target.classList.contains('booking-filter-btn')) {
            const filter = e.target.dataset.filter;
            if (filter) {
                // Update active state
                document.querySelectorAll('.booking-filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Load filtered bookings
                loadBookings(filter);
            }
        }

        // Filter buttons for messages
        if (e.target.classList.contains('message-filter-btn')) {
            const filter = e.target.dataset.filter;
            if (filter) {
                // Update active state
                document.querySelectorAll('.message-filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Load filtered messages
                loadSectionData('messages');
            }
        }

        // Bulk export button
        if (e.target.id === 'bulk-export-bookings') {
            const selectedBookings = document.querySelectorAll('.booking-checkbox:checked');
            if (selectedBookings.length === 0) {
                showNotification('Please select at least one booking to export', 'warning');
                return;
            }
            
            const bookingIds = Array.from(selectedBookings).map(cb => cb.dataset.bookingId);
            exportBookings(bookingIds);
        }
    });

    // Select all bookings checkbox
    document.addEventListener('change', function(e) {
        if (e.target.id === 'select-all-bookings') {
            const checkboxes = document.querySelectorAll('.booking-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
        }
    });

    // Search functionality
    document.addEventListener('input', function(e) {
        if (e.target.id === 'booking-search') {
            const searchTerm = e.target.value.toLowerCase();
            const bookingRows = document.querySelectorAll('.booking-row');
            
            bookingRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        }

        if (e.target.id === 'message-search') {
            const searchTerm = e.target.value.toLowerCase();
            const messageRows = document.querySelectorAll('.message-row');
            
            messageRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + R to refresh current section
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            if (state.currentSection) {
                loadSectionData(state.currentSection);
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal-overlay');
            modals.forEach(modal => modal.remove());
        }
        
        // Alt + 1, 2, etc. to switch sections
        if (e.altKey && e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            const sections = ['bookings', 'messages'];
            const index = parseInt(e.key) - 1;
            if (sections[index]) {
                showSection(sections[index]);
            }
        }
    });

    // Global session timer listeners
    document.addEventListener('mousemove', resetSessionTimer);
    document.addEventListener('keypress', resetSessionTimer);
    document.addEventListener('click', resetSessionTimer);
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', initializeAdmin);