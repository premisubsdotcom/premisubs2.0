const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');

// Load environment variables from .env file
dotenv.config();

// Telegram Bot token and owner's chat ID from .env file
const token = process.env.BOT_TOKEN;
const ownerChatId = process.env.OWNER_CHAT_ID;

// Create a new Telegram bot instance
const bot = new TelegramBot(token, { polling: true });

// -----------------------------
// Bot Startup: Reset users.json File
// -----------------------------

// Path to the users.json file
const usersFilePath = path.join(__dirname, 'users.json');

// Delete previous users.json if exists, then create a fresh empty file
if (fs.existsSync(usersFilePath)) {
  fs.unlinkSync(usersFilePath);
  console.log('Previous users.json deleted.');
}
fs.writeFileSync(usersFilePath, '{}');
console.log('Fresh empty users.json created.');

// Global flag to indicate if the bot is active (i.e. users.json is ready)
let botActive = false;

// Check if users.json has data; if empty, bot stays inactive.
try {
  const data = fs.readFileSync(usersFilePath, 'utf8');
  const users = JSON.parse(data);
  if (Object.keys(users).length === 0) {
    console.log('users.json is empty. Waiting for owner to upload a valid users.json file.');
    botActive = false;
  } else {
    botActive = true;
  }
} catch (err) {
  console.error('Error reading users.json:', err);
}

// -----------------------------
// Session Store for Login Sessions
// -----------------------------
// This object holds sessions per chatId. Each session is an object { token, expiry }
const sessionStore = {};

// -----------------------------
// Existing Bot Functions & Handlers
// -----------------------------

// Channel chat IDs to check membership (replace these with actual channel IDs)
const channels = [
  -1002274549930, // Channel 1
  -1002661090015, // Channel 2
  -1002195732578, // Channel 3
  -1002403206209  // Channel 4
];

// Function to store/update user data into users.json without changing the original registration time
function storeUserData(user) {
  let users = {};
  try {
    const data = fs.readFileSync(usersFilePath, 'utf8');
    users = data ? JSON.parse(data) : {};
  } catch (err) {
    console.error("Error reading or parsing users.json", err);
  }
  const chatId = user.id;
  const isNewUser = !users.hasOwnProperty(chatId);

  if (isNewUser) {
    users[chatId] = {
      chatId: chatId,
      firstName: user.first_name || "N/A",
      lastName: user.last_name || "N/A",
      username: user.username || "N/A",
      registeredAt: new Date().toUTCString()
    };
    console.log(`User data stored for chatId ${chatId}`);
  } else {
    const registeredAt = users[chatId].registeredAt;
    users[chatId] = {
      chatId: chatId,
      firstName: user.first_name || "N/A",
      lastName: user.last_name || "N/A",
      username: user.username || "N/A",
      registeredAt: registeredAt
    };
    console.log(`User data updated for chatId ${chatId}`);
  }
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Error writing to users.json", err);
  }
  // If it's a new user and an owner chat ID is provided, send the users.json file to the owner.
  if (isNewUser && ownerChatId) {
    bot.sendDocument(ownerChatId, usersFilePath)
      .then(() => console.log(`Sent updated users.json to owner ${ownerChatId}`))
      .catch(err => console.error("Error sending document to owner", err));
  }
}

// Owner document handler: expects a document named 'users.json' from the owner to "activate" the bot.
bot.on('document', (msg) => {
  if (msg.chat.id.toString() === ownerChatId.toString()) {
    if (msg.document.file_name === 'users.json') {
      const fileId = msg.document.file_id;
      // Download the file to the current directory.
      bot.downloadFile(fileId, __dirname)
        .then((downloadedFilePath) => {
          console.log(`Downloaded file to ${downloadedFilePath}`);
          // Validate the file by trying to parse it.
          try {
            const data = fs.readFileSync(downloadedFilePath, 'utf8');
            JSON.parse(data);
            // Overwrite the local users.json with the downloaded file's contents.
            fs.writeFileSync(usersFilePath, data);
            botActive = true;
            bot.sendMessage(ownerChatId, 'users.json successfully updated and bot is now active.');
            // Delete the temporary file (e.g., file_1.json)
            fs.unlink(downloadedFilePath, (err) => {
              if (err) {
                console.error('Error deleting temporary file:', err);
              } else {
                console.log(`Temporary file ${downloadedFilePath} deleted.`);
              }
            });
          } catch (err) {
            console.error('Error reading downloaded users.json:', err);
            bot.sendMessage(ownerChatId, 'Failed to update users.json. Please ensure the file contains valid JSON.');
          }
        })
        .catch((err) => {
          console.error('Error downloading file:', err);
          bot.sendMessage(ownerChatId, 'Failed to download the users.json file.');
        });
    } else {
      bot.sendMessage(ownerChatId, 'Please send a file named "users.json".');
    }
  }
});

// Start command handler for users
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  if (!botActive) {
    bot.sendMessage(chatId, 'Server down please try later');
    return;
  }
  const checkMembership = async (chatId, channelId) => {
    try {
      const memberStatus = await bot.getChatMember(channelId, chatId);
      return memberStatus.status !== 'left';
    } catch (error) {
      return false;
    }
  };
  Promise.all(channels.map(channel => checkMembership(chatId, channel)))
    .then((results) => {
      const isMemberOfAllChannels = results.every(result => result);
      if (isMemberOfAllChannels) {
        storeUserData(msg.from);
        bot.sendMessage(chatId, `Your User ID is \`${chatId}\` to log in at Premisubs website.`, { parse_mode: 'Markdown' });
      } else {
        const buttons = [
          { text: 'Join Channel 1', url: 'https://t.me/+CeGOgYpOmBwyMWE1' },
          { text: 'Join Channel 2', url: 'https://t.me/+LzG6N6PaAkMwODVl' },
          { text: 'Join Channel 3', url: 'https://t.me/premisubs' },
          { text: 'Join Channel 4', url: 'https://t.me/subscriptions_sellers' },
          { text: '→ Join in all channels at once', url: 'https://t.me/addlist/n3pUTtZiqp1mZmM1' }
        ];
        const options = {
          reply_markup: {
            inline_keyboard: [
              [buttons[0], buttons[1]],
              [buttons[2], buttons[3]],
              [buttons[4]]
            ],
          },
        };
        bot.sendMessage(msg.chat.id, 'Please join our following 4 channels to get User ID of Premisubs website:', options);
      }
    })
    .catch((err) => {
      console.error(err);
      bot.sendMessage(msg.chat.id, 'An error occurred while checking your membership.');
    });
});

// -----------------------------
// New Express Web Server & OTP/Session Endpoints
// -----------------------------

const app = express();
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from the public folder

// In-memory OTP store: { chatId: otp }
const otpStore = {};

// Helper function: Check if user is a member of all required channels
function checkUserMembership(chatId) {
  const membershipPromises = channels.map(channel => {
    return bot.getChatMember(channel, chatId)
      .then(member => member.status !== 'left')
      .catch(err => false);
  });
  return Promise.all(membershipPromises)
    .then(results => results.every(Boolean));
}

// Helper function: Return join buttons inline keyboard markup
function getJoinButtons() {
  const buttons = [
    { text: 'Join Channel 1', url: 'https://t.me/+CeGOgYpOmBwyMWE1' },
    { text: 'Join Channel 2', url: 'https://t.me/+LzG6N6PaAkMwODVl' },
    { text: 'Join Channel 3', url: 'https://t.me/premisubs' },
    { text: 'Join Channel 4', url: 'https://t.me/subscriptions_sellers' },
    { text: '→ Join in all channels at once', url: 'https://t.me/addlist/n3pUTtZiqp1mZmM1' }
  ];
  return {
    inline_keyboard: [
      [buttons[0], buttons[1]],
      [buttons[2], buttons[3]],
      [buttons[4]]
    ]
  };
}

// Endpoint to request an OTP
app.post('/get-otp', (req, res) => {
  const { chatId } = req.body;
  if (!chatId) {
    return res.status(400).json({ error: 'chatId required' });
  }
  // If bot is not active, respond with server down error
  if (!botActive) {
    return res.status(503).json({ error: 'Server down please try later' });
  }
  // Read users.json and check for the chat ID
  let users = {};
  try {
    const data = fs.readFileSync(usersFilePath, 'utf8');
    users = JSON.parse(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to read users data' });
  }
  if (!users[chatId]) {
    return res.status(404).json({ error: 'User not registered please signup via Telegram' });
  }
  // Check if the user is a member of all required channels
  checkUserMembership(chatId).then(isMember => {
    if (!isMember) {
      bot.sendMessage(chatId, 'For OTP you should be in the following channels:', { reply_markup: getJoinButtons(), parse_mode: 'Markdown' })
        .then(() => {
          return res.status(403).json({ error: 'We sent a Rule Message in Teelegram' });
        })
        .catch(err => {
          console.error(err);
          return res.status(500).json({ error: 'Failed to send membership message via Telegram' });
        });
    } else {
      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore[chatId] = otp;
      // Send OTP message in monospaced format (using Markdown backticks)
      bot.sendMessage(chatId, `Your OTP is: \`${otp}\` to login in premisubs`, { parse_mode: 'Markdown' })

        .then(() => res.json({ message: 'OTP sent in Telegram' }))
        .catch(err => {
          console.error(err);
          res.status(500).json({ error: 'Failed to send OTP via Telegram' });
        });
    }
  });
});

// Endpoint to verify the OTP and create a login session
app.post('/verify-otp', (req, res) => {
  const { chatId, otp } = req.body;
  if (!chatId || !otp) {
    return res.status(400).json({ error: 'chatId and otp required' });
  }
  if (otpStore[chatId] && otpStore[chatId] === otp) {
    // OTP matches—remove it from store
    delete otpStore[chatId];
    // Retrieve user details from users.json
    let userDetails = {};
    try {
      const data = fs.readFileSync(usersFilePath, 'utf8');
      const users = JSON.parse(data);
      userDetails = users[chatId] || {};
    } catch (err) {
      console.error('Error reading user details:', err);
    }
    // Generate a session token and expiry (1 week)
    const sessionToken = Math.random().toString(36).substring(2) + Date.now();
    const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 1 week in ms
    // Store the session (overwrites any previous session for this chatId)
    sessionStore[chatId] = { token: sessionToken, expiry };
    return res.json({ message: 'Login successful', user: userDetails, token: sessionToken });
  } else {
    return res.status(401).json({ error: 'Invalid OTP' });
  }
});

// Endpoint to verify an existing session
app.post('/verify-session', (req, res) => {
  const { chatId, token } = req.body;
  if (!chatId || !token) {
    return res.status(400).json({ error: 'chatId and token required' });
  }
  const session = sessionStore[chatId];
  if (!session || session.token !== token || session.expiry < Date.now()) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
  return res.json({ message: 'Session valid' });
});

// Optional endpoint to log out (clears session)
app.post('/logout', (req, res) => {
  const { chatId } = req.body;
  if (chatId && sessionStore[chatId]) {
    delete sessionStore[chatId];
  }
  return res.json({ message: 'Logged out' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});
