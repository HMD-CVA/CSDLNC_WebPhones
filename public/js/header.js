document.addEventListener('DOMContentLoaded', function() {
    const loginBtn = document.getElementById('login');
    const loginModal = document.getElementById('loginModal');
    const closeLogin = document.getElementById('closeLogin');
    const submitLogin = document.getElementById('submitLogin');

    if (loginBtn && loginModal && closeLogin && submitLogin) {
        loginBtn.addEventListener('click', function() {
            loginModal.style.display = 'flex';
        });
        closeLogin.addEventListener('click', function() {
            loginModal.style.display = 'none';
        });

        submitLogin.addEventListener('click', async function() {
            console.log('Submitting login');
            const username = document.getElementById('loginUser').value;
            const password = document.getElementById('loginPass').value;
            const res = await fetch('/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
            });
            if (res.redirected) {
                window.location.href = res.url;
            } else {
                const text = await res.text();
                alert(text);
            }
        });
    }
});