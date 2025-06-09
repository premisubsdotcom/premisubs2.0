// server.js

const fs        = require('fs');
const path      = require('path');
const https     = require('https');
const express   = require('express');
const bodyParser= require('body-parser');
const dotenv    = require('dotenv');
const TelegramBot = require('node-telegram-bot-api');

// Load environment variables
dotenv.config();

// Telegram Bot setup
const token        = process.env.BOT_TOKEN;
const ownerChatId  = process.env.OWNER_CHAT_ID;
const bot          = new TelegramBot(token, { polling: true });

// -----------------------------
// Bot Startup: Reset users.json
// -----------------------------
const usersFilePath = path.join(__dirname, 'users.json');

// Remove any old file, then create a fresh one
if (fs.existsSync(usersFilePath)) {
  fs.unlinkSync(usersFilePath);
  console.log('Previous users.json deleted.');
}
fs.writeFileSync(usersFilePath, JSON.stringify({ totalUsers: 0, users: {} }, null, 2));
console.log('Fresh empty users.json created.');

let botActive = false;
try {
  const data  = fs.readFileSync(usersFilePath, 'utf8');
  const users = JSON.parse(data);
  botActive = users.totalUsers > 0 && Object.keys(users.users).length > 0;
} catch (err) {
  console.error('Error reading users.json:', err);
}

// -----------------------------
// Session & OTP stores
// -----------------------------
const sessionStore = {};
const otpStore     = {};

// -----------------------------
// Telegram channel check logic
// -----------------------------
const channels = [
  -1002512938856, // Channel 1
  -1002661090015, // Channel 2
  -1002335860015, // Channel 3
  -1002403206209  // Channel 4
];

const createJoinButtons = () => ([
  { text: 'Join Channel 1', url: 'https://t.me/+XY-47U_k6Ks0MWY1' },
  { text: 'Join Channel 2', url: 'https://t.me/+fM4A8zBxpDgxNmQ1' },
  { text: 'Join Channel 3', url: 'https://t.me/+golZQ1qtMDQ1YmI1' },
  { text: 'Join Channel 4', url: 'https://t.me/+LzG6N6PaAkMwODVl' },
  { text: '→ Join in all channels at once', url: 'https://t.me/addlist/cowhVY-RlQUxNDQ1' }
]);

const getJoinButtonsMarkup = () => ({
  inline_keyboard: [
    [createJoinButtons()[0], createJoinButtons()[1]],
    [createJoinButtons()[2], createJoinButtons()[3]],
    [createJoinButtons()[4]]
  ]
});

function checkMembership(chatId) {
  return Promise.all(channels.map(ch => bot.getChatMember(ch, chatId)))
    .then(results => results.every(r => r.status !== 'left'));
}

// -----------------------------
// User data persistence
// -----------------------------
function storeUserData(user) {
  let all = { totalUsers: 0, users: {} };
  try {
    all = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
  } catch (e) { /* ignore */ }

  const id          = user.id.toString();
  const isNew       = !all.users[id];
  const registeredAt= isNew ? new Date().toUTCString() : all.users[id].registeredAt;

  if (isNew) all.totalUsers = (all.totalUsers || 0) + 1;
  all.users[id] = {
    chatId:      id,
    firstName:   user.first_name || 'N/A',
    lastName:    user.last_name  || 'N/A',
    username:    user.username ? `@${user.username}` : 'N/A',
    registeredAt
  };

  fs.writeFileSync(usersFilePath, JSON.stringify(all, null, 2));

  if (isNew && ownerChatId) {
    const caption = `UserID: [${id}](tg://user?id=${id})
First Name: ${user.first_name || 'N/A'}
Last Name: ${user.last_name  || 'N/A'}
Username: ${user.username ? `@${user.username}` : 'N/A'}`;
    bot.sendDocument(ownerChatId, usersFilePath, { caption, parse_mode: 'Markdown' })
       .catch(console.error);
  }
}

// -----------------------------
// Telegram handlers
// -----------------------------
bot.on('document', msg => {
  if (msg.chat.id.toString() === ownerChatId.toString() && msg.document.file_name === 'users.json') {
    bot.downloadFile(msg.document.file_id, __dirname)
      .then(fp => {
        const data = fs.readFileSync(fp, 'utf8');
        JSON.parse(data); // validate
        fs.writeFileSync(usersFilePath, data);
        botActive = true;
        bot.sendMessage(ownerChatId, 'users.json successfully updated and bot is now active.');
        fs.unlinkSync(fp);
      })
      .catch(err => {
        console.error(err);
        bot.sendMessage(ownerChatId, 'Failed to process users.json—please check the file.');
      });
  }
});

bot.onText(/\/start/, msg => {
  const chatId = msg.chat.id;
  if (!botActive) {
    return bot.sendMessage(chatId, 'Server down please try later');
  }
  checkMembership(chatId)
    .then(isMember => {
      if (!isMember) {
        return bot.sendMessage(chatId,
          'Please join our following 4 channels to get User ID of Premisubs website, after joining send /start message again to get your UserID:',
          { reply_markup: getJoinButtonsMarkup() }
        );
      }
      storeUserData(msg.from);
      bot.sendMessage(chatId,
        `Your UserID is \`${chatId}\` to login at Premisubs website.`,
        { parse_mode: 'Markdown' }
      );
    })
    .catch(err => {
      console.error(err);
      bot.sendMessage(chatId, 'Error checking membership—try again later.');
    });
});

// -----------------------------
// Express HTTP(S) server
// -----------------------------
const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// OTP endpoint
app.post('/get-otp', (req, res) => {
  const { chatId } = req.body;
  if (!chatId) return res.status(400).json({ error: 'chatId required' });
  if (!botActive) return res.status(503).json({ error: 'Server down please try later' });

  let all;
  try { all = JSON.parse(fs.readFileSync(usersFilePath, 'utf8')); }
  catch (e) { return res.status(500).json({ error: 'Failed to read users.json' }); }

  if (!all.users[chatId]) {
    return res.status(404).json({ error: 'User not registered please signup via Telegram' });
  }

  checkMembership(chatId)
    .then(isMem => {
      if (!isMem) {
        bot.sendMessage(chatId,
          'For OTP you should be in the following channels:',
          { reply_markup: getJoinButtonsMarkup() }
        ).then(() => {
          res.status(403).json({ error: 'Complete the join-task and request OTP again' });
        });
      } else {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[chatId] = otp;
        bot.sendMessage(chatId, `Your OTP is: \`${otp}\` to login in premisubs`, { parse_mode: 'Markdown' })
          .then(() => res.json({ message: 'OTP sent in Telegram' }))
          .catch(() => res.status(500).json({ error: 'Failed to send OTP' }));
      }
    })
    .catch(() => res.status(500).json({ error: 'Membership check failed' }));
});

// OTP verification
app.post('/verify-otp', (req, res) => {
  const { chatId, otp } = req.body;
  if (!chatId || !otp) return res.status(400).json({ error: 'chatId and otp required' });

  if (otpStore[chatId] !== otp) {
    return res.status(401).json({ error: 'Invalid OTP' });
  }
  delete otpStore[chatId];

  let all;
  try { all = JSON.parse(fs.readFileSync(usersFilePath, 'utf8')); }
  catch (e) { console.error(e); }

  const user = (all.users && all.users[chatId]) || {};
  const tokenStr = Math.random().toString(36).slice(2) + Date.now();
  const expiry   = Date.now() + 7 * 24 * 60 * 60 * 1000;

  sessionStore[chatId] = { token: tokenStr, expiry };
  res.json({ message: 'Login successful', user, token: tokenStr });
});

// Session check
app.post('/verify-session', (req, res) => {
  const { chatId, token } = req.body;
  if (!chatId || !token) return res.status(400).json({ error: 'chatId and token required' });

  const sess = sessionStore[chatId];
  if (!sess || sess.token !== token || sess.expiry < Date.now()) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
  res.json({ message: 'Session valid' });
});

// Logout
app.post('/logout', (req, res) => {
  const { chatId } = req.body;
  if (chatId && sessionStore[chatId]) delete sessionStore[chatId];
  res.json({ message: 'Logged out' });
});

// HTTPS setup
const SSL_KEY_PATH  = process.env.SSL_KEY_PATH  || path.join(__dirname, 'server.key');
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || path.join(__dirname, 'server.crt');

if (!fs.existsSync(SSL_KEY_PATH) || !fs.existsSync(SSL_CERT_PATH)) {
  console.error('SSL key or certificate not found; aborting HTTPS startup.');
  process.exit(1);
}

const httpsOptions = {
  key:  fs.readFileSync(SSL_KEY_PATH),
  cert: fs.readFileSync(SSL_CERT_PATH)
};

https.createServer(httpsOptions, app)
     .listen(3000, () => {
       console.log('🚀 HTTPS server running at https://157.230.2.136:3000');
     });
