// ===== UI HELPER FUNCTIONS =====

/**
 * Shows a toast message.
 * @param {string} message - The message to display.
 * @param {string} [type='success'] - 'success' or 'error'.
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconClass = type === 'success' ? 'fa-solid fa-check-circle' : 'fa-solid fa-times-circle';
    toast.innerHTML = `<i class="${iconClass}"></i> <div class="toast-body">${message}</div>
                     <button class="toast-close" aria-label="Close">&times;</button>`;
    
    container.appendChild(toast);
    
    const remove = () => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    };
    toast.querySelector('.toast-close').addEventListener('click', remove);
    setTimeout(remove, 4200);
}

/**
 * Shows a custom popup modal.
 * @param {object} options - Configuration for the popup.
 * @param {string} [options.title='Notice'] - The popup title.
 * @param {string} [options.message=''] - The popup message.
 * @param {string} [options.okText='OK'] - Text for the OK button.
 * @param {string|null} [options.cancelText=null] - Text for Cancel button. If null, hides button.
 * @returns {Promise<boolean>} - Resolves true if OK, false if Cancel.
 */
function showPopup({ title = 'Notice', message = '', okText = 'OK', cancelText = null } = {}) {
    const popup = document.getElementById('custom-popup');
    const popupTitle = document.getElementById('custom-popup-title');
    const popupMessage = document.getElementById('custom-popup-message');
    const popupOk = document.getElementById('custom-popup-ok');
    const popupCancel = document.getElementById('custom-popup-cancel');

    return new Promise(resolve => {
        if (!popup) { resolve(false); return; }
        popupTitle.textContent = title;
        popupMessage.textContent = message;
        popupOk.textContent = okText;
        popupCancel.textContent = cancelText || 'Cancel';
        popupCancel.style.display = cancelText === null ? 'none' : 'inline-block';

        popup.classList.remove('hidden');
        popup.classList.add('show');
        popup.setAttribute('aria-hidden', 'false');

        const content = popup.querySelector('.custom-popup-content');
        if(content) content.focus();

        function cleanup(result) {
            popup.classList.remove('show');
            popup.classList.add('hidden');
            popup.setAttribute('aria-hidden', 'true');
            popupOk.removeEventListener('click', onOk);
            popupCancel.removeEventListener('click', onCancel);
            document.removeEventListener('keydown', onKeydown);
            popup.removeEventListener('click', onOverlayClick);
            resolve(result);
        }
        function onOk(e) { e && e.preventDefault(); cleanup(true); }
        function onCancel(e) { e && e.preventDefault(); cleanup(false); }
        function onKeydown(e) {
            if (e.key === 'Escape') cleanup(false);
            if (e.key === 'Enter') cleanup(true);
        }
        function onOverlayClick(e) { if (e.target === popup) cleanup(false); }

        popupOk.addEventListener('click', onOk);
        popupCancel.addEventListener('click', onCancel);
        document.addEventListener('keydown', onKeydown);
        popup.addEventListener('click', onOverlayClick);
    });
}

/**
 * Formats a Firebase auth error.
 * @param {Error|string} err - The error object or string.
 * @returns {string} - A user-friendly error message.
 */
function formatError(err) {
    if (!err) return 'An unknown error occurred.';
    let msg = null;
    let code = null;

    if (typeof err === 'string') {
        msg = err;
    } else if (err && typeof err === 'object') {
        if (err.message) msg = err.message;
        if (err.code) code = err.code;
    }

    const mapKnownCodes = (token) => {
        if (!token) return null;
        const t = String(token).toLowerCase();
        if (t.includes('invalid') || t.includes('wrong-password') || t.includes('invalid_login_credentials')) {
            return 'Wrong credentials, please try again.';
        }
        if (t.includes('user-not-found') || t.includes('not_found')) return 'No account found for this email.';
        if (t.includes('too-many-requests')) return 'Too many attempts. Try again later.';
        if (t.includes('network-request-failed')) return 'Network error. Check your connection.';
        if (t.includes('email-already-in-use')) return 'This email is already registered.';
        return null;
    };

    const friendlyFromCode = mapKnownCodes(code);
    if (friendlyFromCode) return friendlyFromCode;
    const friendlyFromMsg = mapKnownCodes(msg);
    if (friendlyFromMsg) return friendlyFromMsg;

    if (msg) {
        const cleaned = msg.replace(/[_\-]/g, ' ').replace(/\s+/g, ' ').trim();
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1) + (/[.!?]$/.test(cleaned) ? '' : '.');
    }
    return 'An error occurred.';
}


/**
 * Toggles dark mode.
 * @param {boolean} isDark - True to set dark mode, false for light.
 */
function setDarkMode(isDark) {
    const darkModeBtn = document.getElementById('dark-mode-btn');
    const icon = darkModeBtn ? darkModeBtn.querySelector('i') : null;

    if (isDark) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        if (darkModeBtn) darkModeBtn.setAttribute('aria-pressed', 'true');
        if (icon) icon.className = 'fas fa-moon'; // Show moon when dark
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        if (darkModeBtn) darkModeBtn.setAttribute('aria-pressed', 'false');
        if (icon) icon.className = 'fas fa-sun'; // Show sun when light
    }
}

/**
 * Renders the profile UI with user data.
 * @param {object|null} data - User profile data from Firestore.
 * @param {object|null} firebaseUser - User object from Firebase Auth.
 */
function renderProfileUI(data, firebaseUser) {
    const name = (data && data.name) || (firebaseUser && firebaseUser.displayName) || (firebaseUser && firebaseUser.email) || 'User';
    const email = (data && data.email) || (firebaseUser && firebaseUser.email) || '';
    const reg = (data && data.regNumber) || '-';
    const section = (data && data.section) || '-';
    const mobile = (data && data.mobile) || '-';
    const rating = (data && typeof data.rating !== 'undefined') ? `${Number(data.rating).toFixed(1)} ⭐` : '-';
    const createdAt = (data && data.createdAt && data.createdAt.toDate) ? data.createdAt.toDate() : (data && data.createdAt) ? new Date(data.createdAt) : null;

    // Helper to set text content
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    setText('profile-name', name);
    setText('profile-email', email);
    setText('profile-regnumber', reg);
    setText('profile-section', section);
    setText('profile-mobile', mobile);
    setText('profile-rating', rating);
    
    if (createdAt && createdAt instanceof Date && !isNaN(createdAt)) {
        setText('profile-member-since', createdAt.toLocaleDateString());
    } else {
        setText('profile-member-since', '-');
    }

    const initials = name.split(' ').filter(Boolean).slice(0,2).map(n => n[0].toUpperCase()).join('');
    setText('profile-initial', initials || name.charAt(0).toUpperCase());
}

// ===== CARD RENDERING & HELPERS =====

function getInitials(name) {
	 if (!name) return '?';
	 return String(name).split(' ').filter(Boolean).slice(0,2).map(n => n[0].toUpperCase()).join('');
}

function escapeHtml(str) {
	if (str === null || str === undefined) return '';
	return String(str).replace(/[&<>"']/g, (s) => ({
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;'
	})[s]);
}

function prettifyNameFromEmail(email) {
	if (!email || typeof email !== 'string') return '';
	const local = email.split('@')[0] || '';
	const cleaned = local.replace(/[._\-+]/g, ' ').replace(/\d+/g, ' ').replace(/\s+/g, ' ').trim();
	if (!cleaned) return email;
	return cleaned.split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

/**
 * Creates HTML string for a task card.
 * @param {object} task - Task data from Firestore.
 * @param {string} taskId - The document ID of the task.
 * @param {string} currentUserId - The UID of the currently logged-in user.
 * @param {string} cardType - 'open', 'posted', or 'accepted'.
 * @param {number} [index=0] - Index for animation delay.
 * @returns {string} - HTML string for the task card.
 */
function createTaskCard(task, taskId, currentUserId, cardType, index = 0) {
    const statusBadge = `<span class="status status-${task.status}">${task.status.replace('_', ' ')}</span>`;
    let actionButtons = '';

    const rawRequester = task.requesterName || task.requesterEmail || 'Unknown';
    const rawHelper = task.helperName || task.helperEmail || '';
    const requesterName = rawRequester.includes('@') ? prettifyNameFromEmail(rawRequester) : rawRequester;
    const helperName = rawHelper && rawHelper.includes('@') ? prettifyNameFromEmail(rawHelper) : rawHelper;
    const requesterMobile = task.requesterMobile || '';
    const helperMobile = task.helperMobile || '';

    if (cardType === 'open') {
        if (task.requesterId === currentUserId) {
            actionButtons = `<button class="task-card-btn btn-base" disabled>Your Task</button>`;
        } else {
            actionButtons = `<button class="task-card-btn btn-base accept-btn" data-id="${taskId}">Accept Task</button>`;
        }
    } else if (cardType === 'posted') {
        if (task.status === 'open') {
            actionButtons = `<button class="task-card-btn btn-base delete-btn" data-id="${taskId}">Delete</button>`;
        } else if (task.status === 'in_progress') {
            actionButtons = `<button class="task-card-btn btn-base complete-btn" data-id="${taskId}">Mark as Completed</button>`;
        } else if (task.status === 'completed') {
            actionButtons = `<span class="status-text">Completed!</span>`;
        }
    } else if (cardType === 'accepted') {
        if (task.status === 'in_progress') {
            actionButtons = `<span class="status-text">In Progress...</span>`;
        } else if (task.status === 'completed') {
            actionButtons = `<span class="status-text">Completed!</span>`;
        }
    }

    const requesterNameHtml = `<span class="user-name">${escapeHtml(requesterName)}</span>`;
    const helperNameHtml = helperName ? `<span class="user-name">${escapeHtml(helperName)}</span>` : '';
    const animationDelay = `style="animation-delay: ${index * 50}ms"`;

    return `
        <div class="task-card" id="task-${taskId}" ${animationDelay}>
            <h4>${escapeHtml(task.description)}</h4>
            <div class="reward">₹${escapeHtml(String(task.reward || '0'))}</div>
            <div class="info">
                <p><strong>From:</strong> ${escapeHtml(task.pickup)}</p>
                <p><strong>To:</strong> ${escapeHtml(task.drop)}</p>
                <p><strong>Time:</strong> ${escapeHtml(task.timeframe)}</p>
            </div>
            <div class="task-meta">
                <em>Posted by: ${requesterNameHtml}${requesterMobile ? ` • <a href="tel:${requesterMobile}" class="call-link">📞</a>` : ''}</em>
                ${(task.status !== 'open' && (task.helperId || helperName)) ? `<em>Helper: ${helperNameHtml}${helperMobile ? ` • <a href="tel:${helperMobile}" class="call-link">📞</a>` : ''}</em>` : ''}
            </div>
            <div class="actions">
                ${statusBadge}
                ${actionButtons}
            </div>
        </div>
    `;
}