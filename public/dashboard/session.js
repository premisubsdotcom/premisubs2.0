/**
 * Checks if a valid session exists.
 * Instead of immediately redirecting when session data is missing,
 * we set a global flag: window.sessionValid.
 */
function checkSession() {
  const user = JSON.parse(localStorage.getItem('user'));
  const sessionToken = localStorage.getItem('sessionToken');
  const chatId = user ? user.chatId : null;

  // If any required session data is missing, mark session as invalid.
  if (!user || !sessionToken || !chatId) {
    window.sessionValid = false;
    return;
  }

  // Verify session validity with the server
  fetch('/verify-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, token: sessionToken })
  })
    .then(response => response.json())
    .then(data => {
      window.sessionValid = !data.error;
      if (data.error) {
        localStorage.clear();
      }
    })
    .catch(err => {
      console.error('Error verifying session:', err);
      localStorage.clear();
      window.sessionValid = false;
    });
}

// Run session check once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', checkSession);
