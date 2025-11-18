document.addEventListener('DOMContentLoaded', () => {
    
    // ===== GLOBAL STATE =====
    let currentUserId = null;
    let userProfile = null;
    let activeListeners = []; // To store Firestore listeners
    let taskToDelete = null;

    // ===== ELEMENT SELECTORS =====
    const pages = {
        home: document.getElementById('home-page'),
        mytasks: document.getElementById('mytasks-page'),
        profile: document.getElementById('profile-page'),
        leaderboard: document.getElementById('leaderboard-page'),
        help: document.getElementById('help-page')
    };

    const navLinks = {
        home: document.getElementById('nav-home-btn'),
        mytasks: document.getElementById('nav-mytasks-btn'),
        profile: document.getElementById('nav-profile-btn'),
        leaderboard: document.getElementById('nav-leaderboard-btn'),
        help: document.getElementById('nav-help-btn'),
        brand: document.getElementById('nav-brand-logo'), // Logo clicks home
        post: document.getElementById('nav-post-task-btn') // Post task button
    };

    const taskFeeds = {
        open: document.getElementById('task-feed'),
        posted: document.getElementById('my-posted-tasks'),
        accepted: document.getElementById('my-accepted-tasks')
    };

    const createTaskForm = document.getElementById('create-task-form');
    
    // Modals
    const deleteModal = document.getElementById('delete-modal');
    const profileEditModal = document.getElementById('profile-edit-modal');

    // Stats
    const stats = {
        posted: document.getElementById('stat-posted'),
        accepted: document.getElementById('stat-accepted'),
        completed: document.getElementById('stat-completed'),
        rating: document.getElementById('stat-rating'),
        postedSmall: document.getElementById('stat-posted-small'),
        acceptedSmall: document.getElementById('stat-accepted-small')
    };
    
    // ===== GLOBAL FUNCTIONS (for auth.js) =====
    window.setGlobalUserId = (uid) => {
        currentUserId = uid;
    };

    window.clearAllListeners = () => {
        console.log(`Clearing ${activeListeners.length} listeners...`);
        activeListeners.forEach(unsubscribe => unsubscribe());
        activeListeners = [];
    };

    window.handleAppNavigation = (pageKey, profileData) => {
        if (profileData) {
            userProfile = profileData;
        }
        navigateTo(pageKey);
    };

    // ===== NAVIGATION =====
    function navigateTo(pageKey) {
        window.clearAllListeners();
        
        // Hide all pages
        Object.values(pages).forEach(page => page && page.classList.add('hidden'));
        // Deactivate all nav links
        Object.values(navLinks).forEach(link => link && link.classList.remove('active'));

        // Show the target page
        const targetPage = pages[pageKey];
        if (targetPage) {
            targetPage.classList.remove('hidden');
        } else {
            pages.home.classList.remove('hidden'); // Default to home
            pageKey = 'home';
        }

        // Activate the correct nav link(s)
        if (navLinks[pageKey]) {
            navLinks[pageKey].classList.add('active');
        }
        if (pageKey === 'home') {
            navLinks.brand.classList.add('active'); // Also activate logo
        }

        // Load data for the page
        switch (pageKey) {
            case 'home':
                loadOpenTasks();
                break;
            case 'mytasks':
                loadMyTasksPage();
                break;
            case 'profile':
                loadProfilePage();
                break;
            case 'leaderboard':
                loadLeaderboardPage();
                break;
            case 'help':
                loadHelpPage();
                break;
        }
    }

    // Add navigation listeners
    navLinks.home.addEventListener('click', (e) => { e.preventDefault(); navigateTo('home'); });
    navLinks.brand.addEventListener('click', (e) => { e.preventDefault(); navigateTo('home'); });
    navLinks.mytasks.addEventListener('click', (e) => { e.preventDefault(); navigateTo('mytasks'); });
    navLinks.profile.addEventListener('click', (e) => { e.preventDefault(); navigateTo('profile'); });
    navLinks.leaderboard.addEventListener('click', (e) => { e.preventDefault(); navigateTo('leaderboard'); });
    navLinks.help.addEventListener('click', (e) => { e.preventDefault(); navigateTo('help'); });
    
    // "Post Task" button just scrolls to form on home page
    navLinks.post.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('home');
        // Scroll to form
        if (createTaskForm) {
            createTaskForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
            document.getElementById('task-pickup').focus();
        }
    });

    // ===== DATA LOADING FUNCTIONS =====

    function loadOpenTasks() {
        if (!currentUserId) return;
        const unsubscribe = db.collection("tasks")
            .where("status", "==", "open")
            .orderBy("createdAt", "desc")
            .onSnapshot((querySnapshot) => {
                const feed = taskFeeds.open;
                if (!feed) return;
                feed.innerHTML = "";
                if (querySnapshot.empty) {
                    feed.innerHTML = "<p class='empty-list-msg'>No open tasks right now. Post one!</p>";
                    return;
                }
                querySnapshot.forEach((doc, index) => {
                    feed.innerHTML += createTaskCard(doc.data(), doc.id, currentUserId, 'open', index);
                });
            }, (error) => {
                console.error("Error fetching open tasks:", error);
                if (taskFeeds.open) taskFeeds.open.innerHTML = `<p class='empty-list-msg'>Error loading tasks. ${error.message || ''}</p>`;
            });
        activeListeners.push(unsubscribe);
    }

    function loadMyTasksPage() {
        if (!currentUserId) return;
        
        // Load Posted Tasks
        let unsubPosted = db.collection("tasks")
            .where("requesterId", "==", currentUserId)
            .orderBy("createdAt", "desc")
            .onSnapshot((querySnapshot) => {
                const container = taskFeeds.posted;
                if (!container) return;
                container.innerHTML = "";
                if (querySnapshot.empty) {
                    container.innerHTML = "<p class='empty-list-msg'>You haven't posted any tasks yet.</p>";
                    return;
                }
                querySnapshot.forEach((doc, index) => {
                    container.innerHTML += createTaskCard(doc.data(), doc.id, currentUserId, 'posted', index);
                });
            }, (error) => console.error("Error fetching posted tasks:", error));
        
        // Load Accepted Tasks
        let unsubAccepted = db.collection("tasks")
            .where("helperId", "==", currentUserId)
            .orderBy("createdAt", "desc")
            .onSnapshot((querySnapshot) => {
                const container = taskFeeds.accepted;
                if (!container) return;
                container.innerHTML = "";
                if (querySnapshot.empty) {
                    container.innerHTML = "<p class='empty-list-msg'>You haven't accepted any tasks yet.</p>";
                    return;
                }
                querySnapshot.forEach((doc, index) => {
                    container.innerHTML += createTaskCard(doc.data(), doc.id, currentUserId, 'accepted', index);
                });
            }, (error) => console.error("Error fetching accepted tasks:", error));
            
        activeListeners.push(unsubPosted, unsubAccepted);
    }

    function loadProfilePage() {
        if (!currentUserId) return;
        
        // Refresh profile data
        const unsubProfile = db.collection('users').doc(currentUserId)
            .onSnapshot((doc) => {
                const data = doc.exists ? doc.data() : null;
                if (data) {
                    userProfile = data; // Update global profile
                    renderProfileUI(data, auth.currentUser);
                }
            }, (err) => console.error("Error refreshing profile:", err));
        
        activeListeners.push(unsubProfile);
        
        // Load stats
        loadStats();
    }

    function loadStats() {
        if (!currentUserId) return;
        const setStat = (el, val) => { if (el) el.textContent = val; };

        db.collection("tasks").where("requesterId", "==", currentUserId).get()
          .then(snap => {
              setStat(stats.posted, snap.size);
              setStat(stats.postedSmall, `Posted: ${snap.size}`);
          });
        db.collection("tasks").where("helperId", "==", currentUserId).get()
          .then(snap => {
              setStat(stats.accepted, snap.size);
              setStat(stats.acceptedSmall, `Accepted: ${snap.size}`);
          });
        db.collection("tasks").where("helperId", "==", currentUserId).where("status", "==", "completed").get()
          .then(snap => setStat(stats.completed, snap.size));
        
        if (stats.rating) stats.rating.innerHTML = `${(userProfile && userProfile.rating) ? userProfile.rating.toFixed(1) : '5.0'} <span class="star">⭐</span>`;
    }

    function loadLeaderboardPage() {
        console.log("Loading Leaderboard Page (TODO)");
        // TODO: Add logic to query top users based on 'tasksCompleted' or 'rating'
    }

    function loadHelpPage() {
        console.log("Loading Help Page");
        // Static page, no data loading needed
    }


    // ===== CORE EVENT LISTENERS =====

    // Create Task
    if (createTaskForm) {
        createTaskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!currentUserId) return;

            const taskData = {
                requesterId: currentUserId,
                requesterEmail: auth.currentUser.email,
                requesterName: (userProfile && userProfile.name) || (auth.currentUser && auth.currentUser.email) || '',
                requesterMobile: (document.getElementById('task-contact') && document.getElementById('task-contact').value) || (userProfile && userProfile.mobile) || '',
                pickup: document.getElementById('task-pickup').value,
                drop: document.getElementById('task-drop').value,
                description: document.getElementById('task-description').value,
                reward: Number(document.getElementById('task-reward').value),
                timeframe: document.getElementById('task-time').value,
                status: "open",
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                helperId: null,
                helperEmail: null
            };

            db.collection("tasks").add(taskData)
                .then(() => {
                    createTaskForm.reset();
                    showToast("Task posted successfully!", "success");
                })
                .catch((error) => {
                    console.error("Error adding task:", error);
                    showPopup({ title: 'Error', message: formatError(error) });
                });
        });
    }

    // Task Card Actions (Accept, Complete, Delete)
    document.getElementById('main-content').addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-base');
        if (!btn || !currentUserId) return;

        const taskId = btn.dataset.id;
        
        // ACCEPT
        if (btn.classList.contains('accept-btn')) {
            btn.disabled = true;
            btn.textContent = "Accepting...";
            try {
                const helperDoc = await db.collection('users').doc(currentUserId).get();
                const helper = helperDoc.exists ? helperDoc.data() : {};

                await db.collection('tasks').doc(taskId).update({
                    status: "in_progress",
                    helperId: currentUserId,
                    helperEmail: auth.currentUser.email,
                    helperName: helper.name || auth.currentUser.email,
                    helperMobile: helper.mobile || null
                });
                showToast("Task accepted! Check 'My Tasks'.", "success");
            } catch (error) {
                console.error("Error accepting task:", error);
                await showPopup({ title: 'Accept failed', message: formatError(error), okText: 'OK' });
                btn.disabled = false;
                btn.textContent = "Accept Task";
            }
        }

        // COMPLETE
        if (btn.classList.contains('complete-btn')) {
            btn.disabled = true;
            btn.textContent = "Completing...";
            try {
                await db.collection('tasks').doc(taskId).update({ status: "completed" });
                showToast("Task marked as completed!", "success");
                // Note: Listener will update UI
            } catch (error) {
                console.error("Error completing task:", error);
                await showPopup({ title: 'Complete failed', message: formatError(error), okText: 'OK' });
                btn.disabled = false;
                btn.textContent = "Mark as Completed";
            }
        }

        // DELETE (Show modal)
        if (btn.classList.contains('delete-btn')) {
            taskToDelete = taskId;
            deleteModal.classList.remove('hidden');
        }
    });

    // Delete Modal Logic
    document.getElementById('modal-cancel-btn').addEventListener('click', () => {
        deleteModal.classList.add('hidden');
        taskToDelete = null;
    });

    document.getElementById('modal-confirm-delete-btn').addEventListener('click', () => {
        if (!taskToDelete || !currentUserId) return;
        
        const btn = document.getElementById('modal-confirm-delete-btn');
        btn.disabled = true;
        btn.textContent = "Deleting...";

        db.collection('tasks').doc(taskToDelete).delete()
            .then(() => {
                showToast("Task deleted.", "success");
            })
            .catch((error) => {
                console.error("Error deleting task:", error);
                showPopup({ title: 'Error', message: formatError(error) });
            })
            .finally(() => {
                deleteModal.classList.add('hidden');
                taskToDelete = null;
                btn.disabled = false;
                btn.textContent = "Delete";
            });
    });

    // Profile Edit Modal Logic
    const profileEditBtn = document.getElementById('profile-edit-btn');
    const profileEditClose = document.getElementById('profile-edit-close');
    const profileEditCancel = document.getElementById('profile-edit-cancel');
    const profileEditSave = document.getElementById('profile-edit-save');
    
    const profileEditInputs = {
        name: document.getElementById('profile-edit-name'),
        reg: document.getElementById('profile-edit-regnumber'),
        section: document.getElementById('profile-edit-section'),
        mobile: document.getElementById('profile-edit-mobile')
    };

    const openProfileEdit = () => {
        if (!userProfile) return;
        profileEditInputs.name.value = userProfile.name || '';
        profileEditInputs.reg.value = userProfile.regNumber || '';
        profileEditInputs.section.value = (userProfile.section || '').toUpperCase();
        profileEditInputs.mobile.value = userProfile.mobile || '';
        profileEditModal.classList.remove('hidden');
        profileEditModal.classList.add('show');
        profileEditModal.setAttribute('aria-hidden', 'false');
        profileEditInputs.name.focus();
    };

    const closeProfileEdit = () => {
        profileEditModal.classList.remove('show');
        profileEditModal.classList.add('hidden');
        profileEditModal.setAttribute('aria-hidden', 'true');
    };

    if (profileEditBtn) profileEditBtn.addEventListener('click', openProfileEdit);
    if (profileEditClose) profileEditClose.addEventListener('click', closeProfileEdit);
    if (profileEditCancel) profileEditCancel.addEventListener('click', closeProfileEdit);
    
    if (profileEditModal) {
        profileEditModal.addEventListener('click', (e) => {
            if (e.target === profileEditModal) closeProfileEdit();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && profileEditModal.classList.contains('show')) closeProfileEdit();
        });
    }

    if (profileEditSave) {
        profileEditSave.addEventListener('click', async (e) => {
            e.preventDefault();
            
            let name = (profileEditInputs.name.value || '').trim();
            let regNumber = (profileEditInputs.reg.value || '').trim().replace(/\D/g, '');
            let section = (profileEditInputs.section.value || '').trim().toUpperCase();
            let mobile = (profileEditInputs.mobile.value || '').trim().replace(/\D/g, '');

            try {
                if (!name.match(/^[A-Za-z\s]{2,}$/)) throw new Error('Name must contain only letters and spaces.');
                if (!regNumber.match(/^\d{8}$/)) throw new Error('Registration number must be 8 digits.');
                if (!section.match(/^[A-Z]\d{2}[A-Z]{2}$/i)) throw new Error('Section format must be like K21AB.');
                if (!mobile.match(/^\d{10}$/)) throw new Error('Mobile number must be 10 digits.');
            } catch (err) {
                await showPopup({ title: 'Invalid Input', message: err.message, okText: 'OK' });
                return;
            }
            
            try {
                await db.collection('users').doc(currentUserId).update({
                    name: name,
                    regNumber: regNumber,
                    section: section,
                    mobile: mobile,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                showToast('Profile updated successfully.', 'success');
                closeProfileEdit();
                // Listener will update the UI
            } catch (err) {
                console.error('Error updating profile:', err);
                await showPopup({ title: 'Update Failed', message: formatError(err), okText: 'OK' });
            }
        });
    }

    // Dark Mode
    const darkModeBtn = document.getElementById('dark-mode-btn');
    if (darkModeBtn) {
        darkModeBtn.addEventListener('click', () => {
            const isCurrentlyDark = document.body.classList.contains('dark-mode');
            setDarkMode(!isCurrentlyDark);
        });
    }
    const savedTheme = localStorage.getItem('theme');
    setDarkMode(savedTheme === 'dark');

});