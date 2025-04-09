// Toggle the menu visibility
const menuToggle = document.getElementById('menu-toggle');
const menuWindow = document.getElementById('menu-window');
const body = document.body;

menuToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  
  if (menuWindow.style.left === '0px') {
    // Hide the menu
    menuWindow.style.left = '-300px';
    menuToggle.classList.remove('open');
    body.classList.remove('menu-open');
  } else {
    // Show the menu
    menuWindow.style.left = '0px';
    menuToggle.classList.add('open');
    body.classList.add('menu-open');
  }
});


// Close the menu when clicking outside the menu window or toggle
document.addEventListener('click', (e) => {
  if (body.classList.contains('menu-open')) {
    if (!menuWindow.contains(e.target) && !menuToggle.contains(e.target)) {
      menuWindow.style.left = '-300px';
      menuToggle.classList.remove('open');
      body.classList.remove('menu-open');
    }
  }
});

// Prevent default context menu from appearing on right-click
document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

// Function to show the login popup if session is invalid
function showLoginPopup() {
  // Create overlay element with responsive, centered styling
  const overlay = document.createElement('div');
  overlay.classList.add('login-popup-overlay');
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.display = "flex";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  overlay.style.zIndex = "1000";

  // Create popup container with background color #F8F5EB and responsive dimensions
  const popup = document.createElement('div');
  popup.classList.add('login-popup');
  popup.style.backgroundColor = '#F8F5EB';
  popup.style.maxWidth = "90%";
  popup.style.width = "400px";
  popup.style.padding = "20px";
  popup.style.borderRadius = "8px";
  popup.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
  popup.style.textAlign = "center";

  // Create message paragraph
  const message = document.createElement('p');
  message.textContent = 'Please login in PREMISUBS to access all our services.';

  // Create login button with access-btn styling
  const loginButton = document.createElement('button');
  loginButton.textContent = 'Login';
  loginButton.classList.add('access-btn');
  loginButton.addEventListener('click', () => {
    window.location.href = '../index.html';
  });

  popup.appendChild(message);
  popup.appendChild(loginButton);
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // Remove overlay when clicking outside the popup
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
}

/* ------------------ New Code: Update Menu User Section ------------------ */
/**
 * updateUserSection()
 * Configures the menu window as a flex container and creates/updates
 * a user section at the bottom.
 * If session data exists, it shows the user's full name and chatId with a logout button.
 * Otherwise, it shows a login button.
 * If the full name exceeds 20 characters, it will be truncated and appended with ellipsis.
 * Any first or last name equal to "N/A" is omitted.
 */
function updateUserSection() {
  // Ensure the menu window uses a flex layout so that the last element is pushed to the bottom
  menuWindow.style.display = 'flex';
  menuWindow.style.flexDirection = 'column';
  menuWindow.style.justifyContent = 'space-between';
  
  let userSection = document.getElementById('user-section');
  if (!userSection) {
    userSection = document.createElement('div');
    userSection.id = 'user-section';
    // Styling to separate the user section from the menu items
    userSection.style.padding = '20px';
    userSection.style.borderTop = '1px solid #ccc';
    // Append the user section as the last child so it appears at the bottom
    menuWindow.appendChild(userSection);
  }
  
  // Check if user session data exists in localStorage
  const userData = localStorage.getItem('user');
  if (userData) {
    const user = JSON.parse(userData);
    
    // Prepare full name, omitting "N/A"
    let firstName = (user.firstName && user.firstName !== "N/A") ? user.firstName : "";
    let lastName = (user.lastName && user.lastName !== "N/A") ? user.lastName : "";
    let fullName = (firstName + " " + lastName).trim();
    
    // Truncate if full name exceeds 20 characters
    const maxLength = 20;
    if (fullName.length > maxLength) {
      fullName = fullName.substring(0, maxLength) + '...';
    }
    
    // Display user full name and chatId with a logout button
    // Added white-space: nowrap; so that the text appears in a single line.
    userSection.innerHTML = `
      <p style="margin: 0 0 10px 0; white-space: nowrap;">User Name: ${fullName || "Anonymous"}</p>
      <p style="margin: 0 0 10px 0;">User ID: ${user.chatId}</p>
      <button id="logout-button" class="access-btn">Logout</button>
    `;
    const logoutButton = document.getElementById('logout-button');
    logoutButton.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = '../index.html';
    });
  } else {
    // If no session is available, show a login button
    userSection.innerHTML = `
      <button id="login-button" class="access-btn">Login</button>
    `;
    const loginButton = document.getElementById('login-button');
    loginButton.addEventListener('click', () => {
      window.location.href = '../index.html';
    });
  }
}
/* ------------------ End New Code ------------------ */

// Combine DOMContentLoaded listeners to update user section, attach menu item events, and add the rotating text bar
document.addEventListener('DOMContentLoaded', () => {
  updateUserSection();

  // Attach event listeners to menu items in the menu window
  const menuItems = document.querySelectorAll('.menu-window .menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const text = item.textContent.trim().toLowerCase();
      switch (text) {
        case 'download extension':
          window.open("https://premisubsdotcom.vercel.app/download/extdown.html", "_blank");
          break;
        case 'how to use':
          window.open("https://premisubsdotcom.vercel.app/folders/guide/guide.html", "_blank");
          break;
        case 'support us':
          window.open("https://premisubsdotcom.vercel.app/folders/support/support.html", "_blank");
          break;
        case 'contact us': {
          const targetURL = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
            ? "https://telegram.openinapp.co/x9dr4"
            : "https://web.telegram.org/k/#@premisubs_admin";
          window.open(targetURL, "_blank");
          break;
        }
        case 'join in telegram': {
          const targetURL = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
            ? "https://telegram.openinapp.co/tkke1"
            : "https://web.telegram.org/k/#@premisubs";
          window.open(targetURL, "_blank");
          break;
        }
      }
      // Close the menu after a menu item is clicked
      menuWindow.style.left = '-300px';
      menuToggle.classList.remove('open');
      body.classList.remove('menu-open');
    });
  });

  // New Feature: Rotating Text Bar Under the Header Container
  const textBar = document.createElement('div');
  textBar.id = 'text-bar';

  // Insert the text bar right after the header container
  const header = document.getElementById('header-container');
  header.parentNode.insertBefore(textBar, header.nextSibling);

  // Define the two messages with the required texts.
  // The first message now includes an anchor tag that opens the deals page in a new tab.
  const messages = [
    'If you want accounts id and password or any other subscriptions at low prices, contact us. <a href="https://premisubsdotcom.vercel.app/deals/deals.html" target="_blank" style="color: white; text-decoration: underline;">Click here to see all what we sell</a>.',
    "Don't logout the account after login. If you logout, account may ban. Please just close the tab without logging out or use our logout extension.",
    'Bookmark this website for easy access. and For latest domain update, direct search for <a href="https://www.premisubs.com" target="_blank" style="color: white; text-decoration: underline;">Premisubs.com</a> Domain. ',
    "please share this website with everyone and help them to get these for free"
  ];
  let currentMessageIndex = 0;

  // Initialize with the first message using innerHTML for clickable content
  textBar.innerHTML = messages[currentMessageIndex];

  // Update the text every 5 seconds using innerHTML so that HTML content (like links) is rendered
  setInterval(() => {
    currentMessageIndex = (currentMessageIndex + 1) % messages.length;
    textBar.innerHTML = messages[currentMessageIndex];
  }, 5000);
});
