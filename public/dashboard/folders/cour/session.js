/**
 * Checks if a valid session exists.
 * If no valid session is found, the user is redirected to 'index.html' (3 levels up).
 */
function checkSession() {
  // Retrieve stored user and session token from localStorage
  const userString = localStorage.getItem('user');
  const sessionToken = localStorage.getItem('sessionToken');

  // Define the redirect path (relative)
  const redirectPath = '../../../index.html';

  // Ensure user data and session token exist
  if (!userString || !sessionToken) {
    window.location.href = redirectPath;
    return false;
  }

  let user;
  try {
    user = JSON.parse(userString);
  } catch (error) {
    console.error("Invalid user data in localStorage:", error);
    localStorage.clear();
    window.location.href = redirectPath;
    return false;
  }

  const chatId = user?.chatId;
  // If any required session data is missing, redirect to login
  if (!chatId) {
    localStorage.clear();
    window.location.href = redirectPath;
    return false;
  }

  // Verify session by sending a POST request to /verify-session
  return fetch('/verify-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, token: sessionToken })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Session verification failed');
    }
    return response.json();
  })
  .then(data => {
    if (data.error) {
      localStorage.clear();
      window.location.href = redirectPath;
      return false;
    }
    return true; // Session is valid
  })
  .catch(err => {
    console.error('Error verifying session:', err);
    localStorage.clear();
    window.location.href = redirectPath;
    return false;
  });
}
  
// Run session check and return a Promise
function ensureSession() {
  return new Promise((resolve) => {
    document.addEventListener('DOMContentLoaded', async () => {
      const validSession = await checkSession();
      resolve(validSession);
    });
  });
}
