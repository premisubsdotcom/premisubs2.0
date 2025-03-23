// On page load: check if session token exists; if yes, redirect immediately to the dashboard.
if (localStorage.getItem('sessionToken')) {
  window.location.href = 'dashboard/services.html';
}

document.getElementById('getOtp').addEventListener('click', function() {
  const chatId = document.getElementById('chatId').value.trim();
  if (!chatId) {
    document.getElementById('message').textContent = 'Please enter your Telegram Chat ID';
    return;
  }
  fetch('/get-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId })
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      document.getElementById('message').textContent = data.error;
    } else {
      document.getElementById('message').textContent = data.message;
      // Show OTP input field
      document.getElementById('step1').style.display = 'none';
      document.getElementById('step2').style.display = 'block';
    }
  })
  .catch(err => {
    document.getElementById('message').textContent = 'Error sending OTP';
    console.error(err);
  });
});
  
document.getElementById('verifyOtp').addEventListener('click', function() {
  const chatId = document.getElementById('chatId').value.trim();
  const otp = document.getElementById('otp').value.trim();
  if (!otp) {
    document.getElementById('message').textContent = 'Please enter the OTP';
    return;
  }
  fetch('/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, otp })
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      document.getElementById('message').textContent = data.error;
    } else {
      // Successful login: store user details and session token in localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('sessionToken', data.token);
      // Redirect to the dashboard page
      window.location.href = 'dashboard/services.html';
    }
  })
  .catch(err => {
    document.getElementById('message').textContent = 'Error verifying OTP';
    console.error(err);
  });
});

// Event listener for "Signup Via Telegram" link
document.getElementById('signup-telegram').addEventListener('click', function(e) {
  e.preventDefault();
  const targetURL = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    ? "https://telegram.openinapp.co/10e0n"
    : "https://web.telegram.org/k/#@premisubsBot";
  window.open(targetURL, "_blank");
});
