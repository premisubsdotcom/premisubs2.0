// server.js

const TelegramBot = require('node-telegram-bot-api');
const dotenv      = require('dotenv');
const fs          = require('fs');
const path        = require('path');
const express     = require('express');
const bodyParser  = require('body-parser');
const https       = require('https');

// Load environment variables from .env file
dotenv.config();

// Telegram Bot token and owner's chat ID from .env file
const token        = process.env.BOT_TOKEN;
const ownerChatId  = process.env.OWNER_CHAT_ID;

// Create a new Telegram bot instance
const bot = new TelegramBot(token, { polling: true });

// -----------------------------
// Bot Startup: Reset users.json File
// -----------------------------
const usersFilePath = path.join(__dirname, 'users.json');
if (fs.existsSync(usersFilePath)) {
  fs.unlinkSync(usersFilePath);
  console.log('Previous users.json deleted.');
}
fs.writeFileSync(
  usersFilePath,
  JSON.stringify({ totalUsers: 0, users: {} }, null, 2)
);
console.log('Fresh empty users.json created.');

let botActive = false;
try {
  const data  = fs.readFileSync(usersFilePath, 'utf8');
  const users = JSON.parse(data);
  if (Object.keys(users.users).length === 0 || !users.totalUsers) {
    console.log('users.json is empty. Waiting for owner to upload a valid users.json file.');
  } else {
    botActive = true;
  }
} catch (err) {
  console.error('Error reading users.json:', err);
}

// -----------------------------
// Session Store for Login Sessions
// -----------------------------
const sessionStore = {};

// -----------------------------
// Reusable Functions
// -----------------------------
const createJoinButtons = () => [
  { text: 'Join Channel 1', url: 'https://t.me/+XY-47U_k6Ks0MWY1' },
  { text: 'Join Channel 2', url: 'https://t.me/+fM4A8zBxpDgxNmQ1' },
  { text: 'Join Channel 3', url: 'https://t.me/+golZQ1qtMDQ1YmI1' },
  { text: 'Join Channel 4', url: 'https://t.me/+LzG6N6PaAkMwODVl' },
  { text: '→ Join in all channels at once', url: 'https://t.me/addlist/cowhVY-RlQUxNDQ1' }
];

const getJoinButtonsMarkup = () => ({
  inline_keyboard: [
    [ createJoinButtons()[0], createJoinButtons()[1] ],
    [ createJoinButtons()[2], createJoinButtons()[3] ],
    [ createJoinButtons()[4] ]
  ]
});

const channels = [
  -1002512938856, // Channel 1
  -1002661090015, // Channel 2
  -1002335860015, // Channel 3
  -1002403206209  // Channel 4
];

const checkMembership = (chatId, cb) => {
  Promise.all(channels.map(ch => bot.getChatMember(ch, chatId)))
    .then(results => {
      const allJoined = results.every(r => r.status !== 'left');
      cb(null, allJoined);
    })
    .catch(err => cb(err));
};

// -----------------------------
// User Data Persistence
// -----------------------------
function storeUserData(user) {
  let users = { users: {} };
  try {
    const data = fs.readFileSync(usersFilePath, 'utf8');
    users = data ? JSON.parse(data) : users;
  } catch (err) {
    console.error('Error reading users.json:', err);
  }

  const chatId    = user.id;
  const isNew     = !users.users[chatId];
  users.totalUsers = users.totalUsers || 0;

  if (isNew) {
    users.totalUsers++;
    users.users[chatId] = {
      chatId,
      firstName: user.first_name || 'N/A',
      lastName:  user.last_name  || 'N/A',
      username:  user.username   ? `@${user.username}` : 'N/A',
      registeredAt: new Date().toUTCString()
    };
  } else {
    // preserve original registeredAt
    const { registeredAt } = users.users[chatId];
    users.users[chatId] = {
      chatId,
      firstName: user.first_name || 'N/A',
      lastName:  user.last_name  || 'N/A',
      username:  user.username   ? `@${user.username}` : 'N/A',
      registeredAt
    };
  }

  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Error writing to users.json:', err);
  }

  if (isNew && ownerChatId) {
    const caption = 
      `UserID: [${chatId}](tg://user?id=${chatId})\n` +
      `First Name: ${user.first_name || 'N/A'}\n` +
      `Last Name: ${user.last_name  || 'N/A'}\n` +
      `Username: ${user.username   ? `@${user.username}` : 'N/A'}`;
    bot.sendDocument(ownerChatId, usersFilePath, { caption, parse_mode: 'Markdown' })
       .catch(err => console.error('Error sending document:', err));
  }
}

// -----------------------------
// Owner Upload Handler
// -----------------------------
bot.on('document', msg => {
  if (msg.chat.id.toString() !== ownerChatId.toString()) return;
  if (msg.document.file_name !== 'users.json') {
    return bot.sendMessage(ownerChatId, 'Please send a file named "users.json".');
  }

  bot.downloadFile(msg.document.file_id, __dirname)
    .then(dlPath => {
      try {
        const data = fs.readFileSync(dlPath, 'utf8');
        JSON.parse(data);
        fs.writeFileSync(usersFilePath, data);
        botActive = true;
        bot.sendMessage(ownerChatId, 'users.json successfully updated and bot is now active.');
      } catch (err) {
        bot.sendMessage(ownerChatId, 'Invalid JSON—please send a proper users.json file.');
      } finally {
        fs.unlink(dlPath, () => {});
      }
    })
    .catch(err => {
      console.error('Download error:', err);
      bot.sendMessage(ownerChatId, 'Failed to download the file.');
    });
});

// -----------------------------
// /start Handler
// -----------------------------
bot.onText(/\/start/, msg => {
  const chatId = msg.chat.id;
  if (!botActive) {
    return bot.sendMessage(chatId, 'Server down please try later');
  }
  checkMembership(chatId, (err, allJoined) => {
    if (err) {
      console.error(err);
      return bot.sendMessage(chatId, 'Error checking channels.');
    }
    if (allJoined) {
      storeUserData(msg.from);
      bot.sendMessage(
        chatId,
        `Your UserID is \`${chatId}\` to login at Premisubs website.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      bot.sendMessage(
        chatId,
        'Please join our 4 channels to get your UserID, then send /start again:',
        { reply_markup: getJoinButtonsMarkup() }
      );
    }
  });
});

// -----------------------------
// Express + OTP & Session APIs
// -----------------------------
const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const otpStore = {};

app.post('/get-otp', (req, res) => {
  const { chatId } = req.body;
  if (!chatId)     return res.status(400).json({ error: 'chatId required' });
  if (!botActive)  return res.status(503).json({ error: 'Server down please try later' });

  let users;
  try {
    users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
  } catch {
    return res.status(500).json({ error: 'Failed to read users data' });
  }

  if (!users.users[chatId]) {
    return res.status(404).json({ error: 'User not registered please signup via Telegram' });
  }

  checkMembership(chatId, (err, isMember) => {
    if (err) return res.status(500).json({ error: 'Membership check failed' });
    if (!isMember) {
      bot.sendMessage(
        chatId,
        'For OTP you should be in the following channels:',
        { reply_markup: getJoinButtonsMarkup() }
      )
      .then(() => res.status(403).json({ error: 'Complete channel join then retry' }))
      .catch(() => res.status(500).json({ error: 'Failed to send Telegram message' }));
    } else {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore[chatId] = otp;
      bot.sendMessage(chatId, `Your OTP is: \`${otp}\` to login in premisubs`, { parse_mode: 'Markdown' })
         .then(() => res.json({ message: 'OTP sent in Telegram' }))
         .catch(() => res.status(500).json({ error: 'Failed to send OTP via Telegram' }));
    }
  });
});

app.post('/verify-otp', (req, res) => {
  const { chatId, otp } = req.body;
  if (!chatId || !otp) return res.status(400).json({ error: 'chatId and otp required' });

  if (otpStore[chatId] === otp) {
    delete otpStore[chatId];
    let userDetails = {};
    try {
      const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
      userDetails = users.users[chatId] || {};
    } catch (err) {
      console.error('Error reading users.json:', err);
    }
    const sessionToken = Math.random().toString(36).slice(2) + Date.now();
    const expiry       = Date.now() + 7 * 24 * 60 * 60 * 1000;
    sessionStore[chatId] = { token: sessionToken, expiry };
    return res.json({ message: 'Login successful', user: userDetails, token: sessionToken });
  } else {
    return res.status(401).json({ error: 'Invalid OTP' });
  }
});

app.post('/verify-session', (req, res) => {
  const { chatId, token } = req.body;
  if (!chatId || !token) return res.status(400).json({ error: 'chatId and token required' });

  const session = sessionStore[chatId] || {};
  if (session.token !== token || session.expiry < Date.now()) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
  res.json({ message: 'Session valid' });
});

app.post('/logout', (req, res) => {
  const { chatId } = req.body;
  if (chatId && sessionStore[chatId]) {
    delete sessionStore[chatId];
  }
  res.json({ message: 'Logged out' });
});

// -----------------------------
// HTTPS Server Setup
// -----------------------------
// Ensure you have server.key and server.crt in the same directory.
const SSL_KEY_PATH  = path.join(__dirname, 'server.key');
const SSL_CERT_PATH = path.join(__dirname, 'server.crt');

const sslOptions = {
  key:  fs.readFileSync(SSL_KEY_PATH),
  cert: fs.readFileSync(SSL_CERT_PATH)
};

const PORT = process.env.PORT || 3000;

https
  .createServer(sslOptions, app)
  .listen(PORT, () => {
    console.log(`⚡️ HTTPS server running on https://157.230.2.136:${PORT}`);
  });
