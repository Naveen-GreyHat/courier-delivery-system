document.addEventListener('DOMContentLoaded', () => {
    
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const authToggle = document.getElementById('auth-toggle');
    const logoutBtn = document.getElementById('logout-btn');
    const userEmailSpan = document.getElementById('user-email'); // This was in original, but new layout doesn't have it

    // Make sure app.js knows the user ID
    if (typeof window.setGlobalUserId !== 'function') {
        window.setGlobalUserId = (uid) => {
            console.warn('window.setGlobalUserId not defined by app.js yet.');
        };
    }

    // ===== AUTH STATE OBSERVER =====
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("User logged in:", user.email);
            window.setGlobalUserId(user.uid); // Share UID with app.js
            
            authContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');

            db.collection('users').doc(user.uid).get()
              .then(doc => {
                const data = doc.exists ? doc.data() : null;
                // We let app.js handle the UI rendering
                if (window.handleAppNavigation) {
                    window.handleAppNavigation('home', data); // Trigger home page load
                }
              })
              .catch(err => {
                console.error('Error fetching user profile:', err);
                if (window.handleAppNavigation) {
                    window.handleAppNavigation('home', null); // Still show home page
                }
              });
            
        } else {
            console.log("User logged out");
            window.setGlobalUserId(null); // Clear UID
            
            authContainer.classList.remove('hidden');
            appContainer.classList.add('hidden');
            
            if (window.clearAllListeners) {
                window.clearAllListeners(); // Tell app.js to clear data listeners
            }
        }
    });

    // ===== AUTH FORM LISTENERS =====

    if (authToggle) {
        authToggle.addEventListener('click', () => {
            const isLoginFormVisible = !loginForm.classList.contains('hidden');
            if (isLoginFormVisible) {
                loginForm.classList.add('hidden');
                registerForm.classList.remove('hidden');
                authToggle.innerHTML = "Already have an account? <strong>Login here</strong>";
            } else {
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
                authToggle.innerHTML = "Don't have an account? <strong>Register here</strong>";
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            let email = (document.getElementById('register-email').value || '').trim();
            let password = (document.getElementById('register-password').value || '');
            let name = (document.getElementById('register-name').value || '').trim();
            let regNumber = (document.getElementById('register-regnumber').value || '').trim();
            let section = (document.getElementById('register-section').value || '').trim();
            let mobile = (document.getElementById('register-mobile').value || '').trim();

            // Validation
            try {
                if (password.length < 6) throw new Error('Password must be at least 6 characters.');
                if (!name.match(/^[A-Za-z\s]{2,}$/)) throw new Error('Name must contain only letters and spaces.');
                if (!regNumber.match(/^\d{8}$/)) throw new Error('Registration number must be 8 digits.');
                if (!section.match(/^[A-Z]\d{2}[A-Z]{2}$/i)) throw new Error('Section format must be like K21AB.');
                if (!mobile.match(/^\d{10}$/)) throw new Error('Mobile number must be 10 digits.');
            } catch (err) {
                showPopup({ title: 'Invalid Input', message: err.message, okText: 'OK' });
                return;
            }

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log("User registered:", userCredential.user.uid);
                    
                    return db.collection('users').doc(userCredential.user.uid).set({
                        email: email,
                        uid: userCredential.user.uid,
                        name: name,
                        regNumber: regNumber,
                        section: section.toUpperCase(),
                        mobile: mobile,
                        rating: 5,
                        tasksCompleted: 0,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                })
                .then(() => {
                    console.log("User profile created");
                    registerForm.reset();
                    authToggle.click(); // Switch to login form
                    showToast("Registration successful! Please login.", "success");
                })
                .catch((error) => {
                    console.error("Error registering:", error);
                    showPopup({ title: 'Registration Failed', message: formatError(error), okText: 'OK' });
                });
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = (document.getElementById('login-email') || {}).value || '';
            const password = (document.getElementById('login-password') || {}).value || '';

            if (!email || !password) {
                await showPopup({ title: 'Missing Credentials', message: 'Please enter both email and password.', okText: 'OK' });
                return;
            }

            try {
                await auth.signInWithEmailAndPassword(email, password);
                // Auth observer will handle the rest
            } catch (err) {
                console.error("Error logging in:", err);
                const friendly = formatError(err);
                await showPopup({ title: 'Login Failed', message: friendly, okText: 'Retry' });
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut();
        });
    }

});