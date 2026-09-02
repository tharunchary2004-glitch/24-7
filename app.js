console.log('👑 RINTU SELFBOT - FIXED');

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

// ─── ANTI-DETECTION ───
try {
    const ClientUserSettingManager = require("./node_modules/discord.js-selfbot-v13/src/managers/ClientUserSettingManager.js");
    if (ClientUserSettingManager?.prototype) {
        ClientUserSettingManager.prototype._patch = function(data) { return this; };
        console.log('[✅] Anti-detection patched');
    }
} catch (e) {}

// ─── DISCORD CLIENT ───
const { Client } = require("discord.js-selfbot-v13");

console.log('[✅] Modules loaded');

// ─── STORAGE ───
const TOKEN_FILE = path.join(__dirname, 'tokens.json');
let tokens = [];
let logs = [];
let clients = [];
let isBotStarting = false;

function loadTokens() {
    try {
        if (fs.existsSync(TOKEN_FILE)) {
            tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
            console.log('[📦] Loaded', tokens.length, 'tokens');
        } else {
            tokens = [];
            fs.writeFileSync(TOKEN_FILE, JSON.stringify([]));
        }
    } catch (e) { tokens = []; }
    return tokens;
}

function saveTokens() {
    try { fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2)); } catch (e) {}
}

function addToken(token, owner = 'default') {
    if (!token || token.length < 10) return null;
    const existing = tokens.find(t => t.token === token);
    if (existing) {
        existing.enabled = true;
        existing.owner = owner;
        saveTokens();
        return existing;
    }
    const newToken = {
        id: Date.now() + Math.random() * 1000,
        token: token.trim(),
        owner: owner || 'default',
        enabled: true,
        created: new Date().toISOString()
    };
    tokens.push(newToken);
    saveTokens();
    return newToken;
}

function deleteToken(id) {
    tokens = tokens.filter(t => t.id !== id);
    saveTokens();
}

function toggleToken(id) {
    const t = tokens.find(t => t.id === id);
    if (t) { t.enabled = !t.enabled; saveTokens(); return t; }
    return null;
}

function getEnabledTokens() {
    return tokens.filter(t => t.enabled === true);
}

loadTokens();

// ─── REAL SELFBOT LOGIN ───
async function stealthLogin(token, index) {
    try {
        console.log(`[🤖] Logging in bot ${index + 1}...`);
        
        const client = new Client({
            checkUpdate: false,
            ws: {
                properties: {
                    $browser: 'Discord Chrome',
                    $device: 'Windows',
                    $os: 'Windows'
                }
            }
        });

        client.on('ready', () => {
            console.log(`[✅] ${client.user?.tag || 'Unknown'} ONLINE!`);
            addLog(`✅ ${client.user?.tag || 'Unknown'} online`);
            io.emit('stats', { online: clients.filter(c => c?.user).length });
        });

        client.on('error', (e) => {
            console.log(`[❌] Error: ${e.message}`);
            addLog(`❌ ${e.message}`);
        });

        await client.login(token);
        clients.push(client);
        console.log(`[✅] Bot ${index + 1} logged in`);
        return client;
    } catch (err) {
        console.log(`[❌] Login failed: ${err.message}`);
        addLog(`❌ Login failed: ${err.message}`);
        return null;
    }
}

async function startBots() {
    if (isBotStarting) return;
    isBotStarting = true;

    const enabled = getEnabledTokens();
    console.log('[🚀] Starting', enabled.length, 'bots');

    if (enabled.length === 0) {
        addLog('❌ No enabled tokens!');
        isBotStarting = false;
        return;
    }

    for (const c of clients) {
        try { await c.destroy(); } catch(e) {}
    }
    clients.length = 0;

    let success = 0;
    for (let i = 0; i < enabled.length; i++) {
        const t = enabled[i];
        const client = await stealthLogin(t.token, i);
        if (client) success++;
        await sleep(2000);
    }

    isBotStarting = false;
    console.log('[🚀] ✅', success, '/', enabled.length, 'online');
    addLog(`✅ ${success}/${enabled.length} bots online`);
    io.emit('stats', { online: clients.filter(c => c?.user).length });
}

async function stopBots() {
    console.log('[🛑] Stopping all bots...');
    for (const c of clients) {
        try { await c.destroy(); } catch(e) {}
    }
    clients.length = 0;
    addLog('🛑 All bots stopped');
    io.emit('stats', { online: 0 });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function addLog(msg) {
    const time = new Date().toLocaleTimeString();
    logs.unshift({ time, message: msg });
    if (logs.length > 50) logs.pop();
    io.emit('log', { time, message: msg });
}

// ─── EXPRESS ───
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const viewsPath = path.join(__dirname, 'views');
if (!fs.existsSync(viewsPath)) {
    fs.mkdirSync(viewsPath, { recursive: true });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let admin = false;

// ─── ROUTES ───
app.get('/', (req, res) => {
    try {
        res.render('dashboard', {
            tokenCount: tokens.length,
            enabledCount: getEnabledTokens().length,
            onlineCount: clients.filter(c => c?.user).length,
            admin: admin,
            logs: logs.slice(0, 20)
        });
    } catch (err) {
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>👑 RINTU</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#0a0a0a; color:#00ffc8; font-family:monospace; min-height:100vh; display:flex; justify-content:center; align-items:center; }
        .box { background:rgba(10,10,10,0.95); border:1px solid rgba(0,255,200,0.15); border-radius:16px; padding:30px; max-width:500px; width:100%; margin:20px; }
        h1 { color:#ff0040; text-align:center; font-size:2.5rem; }
        .sub { color:#666; text-align:center; margin-bottom:20px; }
        input { background:rgba(0,0,0,0.6); color:#00ffc8; border:1px solid rgba(0,255,200,0.1); padding:12px; width:100%; border-radius:8px; margin:5px 0; font-family:monospace; }
        .btn { background:#ff8800; color:#000; border:none; padding:12px; width:100%; font-weight:bold; cursor:pointer; border-radius:8px; font-size:1rem; }
    </style>
</head>
<body>
<div class="box">
    <h1>👑 RINTU</h1>
    <div class="sub">SELFBOT</div>
    <input type="password" id="adminPass" placeholder="Enter Password" onkeydown="if(event.key==='Enter') login()">
    <button class="btn" onclick="login()">🔓 UNLOCK</button>
    <div id="loginError" style="color:#ff0040; font-size:0.8rem; margin-top:5px; display:none;">❌ Wrong password!</div>
</div>
<script>
    function login() {
        const pass = document.getElementById('adminPass').value;
        fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pass })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                window.location.reload();
            } else {
                document.getElementById('loginError').style.display = 'block';
            }
        });
    }
</script>
</body>
</html>
        `);
    }
});

app.get('/ping', (req, res) => {
    res.json({ status: 'alive', time: new Date().toISOString() });
});

app.post('/api/login', (req, res) => {
    const pass = req.body.password;
    const adminPass = process.env.ADMIN_PASS || 'RINTU_2026';
    if (pass === adminPass) {
        admin = true;
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

app.post('/api/logout', (req, res) => {
    admin = false;
    res.json({ success: true });
});

// ─── TOKEN API ───
app.get('/api/tokens', (req, res) => {
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    res.json(tokens);
});

app.post('/api/tokens/add', (req, res) => {
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    const { token, owner } = req.body;
    if (!token || token.length < 10) {
        return res.status(400).json({ error: 'Invalid token' });
    }
    const result = addToken(token, owner);
    res.json({ success: true, token: result });
});

app.post('/api/tokens/delete', (req, res) => {
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    deleteToken(req.body.id);
    res.json({ success: true });
});

app.post('/api/tokens/toggle', (req, res) => {
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    const result = toggleToken(req.body.id);
    res.json({ success: true, token: result });
});

app.post('/api/tokens/clear', (req, res) => {
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    tokens = [];
    saveTokens();
    res.json({ success: true });
});

app.post('/api/tokens/start', async (req, res) => {
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    await startBots();
    res.json({ success: true });
});

app.post('/api/tokens/stop', async (req, res) => {
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    await stopBots();
    res.json({ success: true });
});

app.post('/api/tokens/bulk', (req, res) => {
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    const { tokens: tokenList, owner } = req.body;
    if (!tokenList || !Array.isArray(tokenList)) {
        return res.status(400).json({ error: 'Tokens array required' });
    }
    let added = 0;
    tokenList.forEach(t => {
        if (t && t.length > 10) { addToken(t, owner || 'bulk'); added++; }
    });
    res.json({ success: true, added, total: tokenList.length });
});

// ─── VC JOIN ───
app.post('/api/joinvc', async (req, res) => {
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    const { channelId } = req.body;
    if (!channelId) return res.status(400).json({ error: 'Channel ID required' });
    
    const online = clients.filter(c => c?.user);
    if (online.length === 0) {
        return res.json({ success: false, error: 'No bots online!' });
    }
    
    let connected = 0;
    for (let i = 0; i < online.length; i++) {
        const client = online[i];
        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel) continue;
            await client.voice.connect(channel.id);
            connected++;
        } catch (e) {
            console.log('[VC] Error:', e.message);
        }
        await sleep(1000);
    }
    
    addLog(`🔊 ${connected}/${online.length} joined VC`);
    res.json({ success: true, connected });
});

app.get('/api/stats', (req, res) => {
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    res.json({
        tokens: tokens.length,
        enabled: getEnabledTokens().length,
        online: clients.filter(c => c?.user).length
    });
});

// ─── SOCKET ───
io.on('connection', (socket) => {
    console.log('[SOCKET] Connected');
    socket.emit('stats', {
        tokens: tokens.length,
        enabled: getEnabledTokens().length,
        online: clients.filter(c => c?.user).length
    });
    socket.emit('logs', logs.slice(0, 20));
});

// ─── START ───
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           👑 RINTU SELFBOT - FIXED 👑                      ║
║           🔥 NODE v18 COMPATIBLE                           ║
╠══════════════════════════════════════════════════════════════╣
║  📦 Tokens: ${tokens.length}                                ║
║  ✅ Enabled: ${getEnabledTokens().length}                  ║
║  🌐 Dashboard: https://your-app.railway.app                ║
║  🔑 Admin: ${process.env.ADMIN_PASS || 'RINTU_2026'}       ║
╚══════════════════════════════════════════════════════════════╝
    `);

    if (getEnabledTokens().length > 0) {
        console.log('[🚀] Auto-starting bots...');
        startBots();
    }
});

process.on('SIGINT', async () => {
    console.log('[SHUTDOWN] Cleaning up...');
    await stopBots();
    process.exit();
});
