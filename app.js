console.log('👑 RINTU BOT - SIMPLE VERSION');
require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Simple token storage
let tokens = [];
let admin = false;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── MAIN PAGE ───
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>👑 RINTU</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#0a0a0a; color:#00ffc8; font-family:monospace; min-height:100vh; display:flex; justify-content:center; align-items:center; }
        .box { background:rgba(10,10,10,0.95); border:1px solid rgba(0,255,200,0.15); border-radius:16px; padding:30px; max-width:450px; width:100%; margin:20px; }
        h1 { color:#ff0040; text-align:center; font-size:2.5rem; }
        .sub { color:#666; text-align:center; margin-bottom:20px; }
        input { background:rgba(0,0,0,0.6); color:#00ffc8; border:1px solid rgba(0,255,200,0.1); padding:10px; width:100%; border-radius:8px; margin:5px 0; font-family:monospace; }
        .btn { background:rgba(0,255,200,0.08); color:#00ffc8; border:1px solid rgba(0,255,200,0.15); padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.7rem; }
        .btn:hover { background:rgba(0,255,200,0.15); }
        .btn.danger { border-color:rgba(255,0,64,0.3); color:#ff0040; }
        .btn.primary { background:#ff8800; color:#000; border:none; padding:10px; width:100%; font-weight:bold; cursor:pointer; border-radius:8px; }
        .flex { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
        .token-item { display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(0,255,200,0.05); font-size:0.7rem; align-items:center; }
        .status { padding:2px 8px; border-radius:8px; font-size:0.5rem; font-weight:bold; }
        .status.on { background:rgba(0,255,200,0.15); color:#00ffc8; }
        .status.off { background:rgba(255,0,64,0.15); color:#ff0040; }
        .token-list { max-height:200px; overflow-y:auto; margin-top:8px; }
        .hidden { display:none; }
        #login { display:block; }
        #dashboard { display:none; }
        .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:10px 0; }
        .stat { border:1px solid rgba(0,255,200,0.05); border-radius:8px; padding:10px; text-align:center; }
        .stat .label { color:#666; font-size:0.6rem; text-transform:uppercase; }
        .stat .value { font-size:1.8rem; font-weight:bold; }
        .gold { color:#ff8800; }
        ::-webkit-scrollbar { width:3px; background:transparent; }
        ::-webkit-scrollbar-thumb { background:#00ffc8; border-radius:3px; }
    </style>
</head>
<body>
<div class="box">
    <h1>👑 RINTU</h1>
    <div class="sub">SELFBOT</div>

    <div id="login">
        <input type="password" id="adminPass" placeholder="Admin Password" onkeydown="if(event.key==='Enter') login()">
        <button class="btn primary" onclick="login()">🔓 UNLOCK</button>
    </div>

    <div id="dashboard">
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span>📦 <span id="tokenCount">0</span> tokens</span>
            <button class="btn danger" onclick="logout()">LOGOUT</button>
        </div>

        <div class="grid">
            <div class="stat"><div class="label">Total</div><div class="value" id="statTokens">0</div></div>
            <div class="stat"><div class="label">Enabled</div><div class="value gold" id="statEnabled">0</div></div>
        </div>

        <div style="border:1px solid rgba(0,255,200,0.08); border-radius:12px; padding:12px;">
            <div class="flex">
                <input type="text" id="tokenInput" placeholder="Token" style="flex:2;">
                <input type="text" id="ownerInput" placeholder="Owner" style="flex:1;">
                <button class="btn" onclick="addToken()" style="background:#ff8800; color:#000; font-weight:bold;">ADD</button>
            </div>
            <div class="token-list" id="tokenList"></div>
        </div>

        <div style="margin-top:10px; border-top:1px solid rgba(0,255,200,0.05); padding-top:10px;">
            <div class="flex">
                <input type="text" id="vcChannel" placeholder="Channel ID" style="flex:2;">
                <button class="btn" onclick="joinVC()" style="border-color:#ff8800; color:#ff8800;">🔊 JOIN VC</button>
            </div>
            <div id="vcStatus" style="color:#666; font-size:0.7rem; margin-top:4px;"></div>
        </div>

        <div id="logs" style="background:rgba(0,0,0,0.3); border-radius:8px; padding:8px; max-height:80px; overflow-y:auto; font-size:0.6rem; color:#666; margin-top:10px;"></div>
    </div>
</div>

<script>
    let socket = io ? io() : null;

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
                document.getElementById('login').style.display = 'none';
                document.getElementById('dashboard').style.display = 'block';
                loadTokens();
                loadStats();
                setInterval(loadStats, 3000);
            } else { alert('❌ Wrong password!'); }
        });
    }

    function logout() {
        fetch('/api/logout', { method: 'POST' }).then(() => {
            document.getElementById('login').style.display = 'block';
            document.getElementById('dashboard').style.display = 'none';
        });
    }

    function loadTokens() {
        fetch('/api/tokens').then(r => r.json()).then(data => {
            const list = document.getElementById('tokenList');
            if (!data || data.length === 0) {
                list.innerHTML = '<div style="color:#444; text-align:center; padding:10px;">No tokens.</div>';
                return;
            }
            list.innerHTML = data.map(t => \`
                <div class="token-item">
                    <span>\${t.token ? t.token.substring(0, 12) + '...' : 'Invalid'}</span>
                    <span style="color:#888;">\${t.owner || 'default'}</span>
                    <span class="status \${t.enabled ? 'on' : 'off'}">\${t.enabled ? 'ON' : 'OFF'}</span>
                    <div>
                        <button class="btn" onclick="toggleToken(\${t.id})">↕</button>
                        <button class="btn danger" onclick="deleteToken(\${t.id})">✕</button>
                    </div>
                </div>
            \`).join('');
            document.getElementById('tokenCount').textContent = data.length;
            document.getElementById('statTokens').textContent = data.length;
            document.getElementById('statEnabled').textContent = data.filter(t => t.enabled).length;
        });
    }

    function addToken() {
        const token = document.getElementById('tokenInput').value.trim();
        const owner = document.getElementById('ownerInput').value.trim() || 'default';
        if (!token) return alert('❌ Enter token!');
        fetch('/api/tokens/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, owner })
        })
        .then(r => r.json()).then(data => {
            if (data.success) {
                document.getElementById('tokenInput').value = '';
                loadTokens();
            }
        });
    }

    function deleteToken(id) {
        if (!confirm('Delete?')) return;
        fetch('/api/tokens/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        }).then(() => loadTokens());
    }

    function toggleToken(id) {
        fetch('/api/tokens/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        }).then(() => loadTokens());
    }

    function joinVC() {
        const channel = document.getElementById('vcChannel').value.trim();
        if (!channel) return alert('❌ Channel ID required!');
        document.getElementById('vcStatus').textContent = '⏳ Joining...';
        fetch('/api/joinvc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channelId: channel })
        })
        .then(r => r.json()).then(data => {
            if (data.success) { document.getElementById('vcStatus').textContent = '✅ Joined!'; }
            else { document.getElementById('vcStatus').textContent = '❌ Failed: ' + (data.error || ''); }
        });
    }

    function loadStats() {
        fetch('/api/stats').then(r => r.json()).then(s => {
            document.getElementById('statTokens').textContent = s.tokens || 0;
            document.getElementById('statEnabled').textContent = s.enabled || 0;
        });
    }

    function addLog(msg) {
        const logs = document.getElementById('logs');
        const time = new Date().toLocaleTimeString();
        logs.innerHTML += \`<div>[\${time}] \${msg}</div>\`;
        logs.scrollTop = logs.scrollHeight;
        if (logs.children.length > 30) { logs.removeChild(logs.firstChild); }
    }

    console.log('👑 RINTU LOADED');
</script>
</body>
</html>
    `);
});

// ─── API ───
app.post('/api/login', (req, res) => {
    if (req.body.password === process.env.ADMIN_PASS) {
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

app.get('/api/tokens', (req, res) => {
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    res.json(tokens);
});

app.post('/api/tokens/add', (req, res) => {
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    const { token, owner } = req.body;
    if (!token || token.length < 10) return res.status(400).json({ error: 'Invalid token' });
    tokens.push({ id: Date.now(), token, owner: owner || 'default', enabled: true });
    res.json({ success: true });
});

app.post('/api/tokens/delete', (req, res) => {
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    tokens = tokens.filter(t => t.id !== req.body.id);
    res.json({ success: true });
});

app.post('/api/tokens/toggle', (req, res) => {
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    const t = tokens.find(t => t.id === req.body.id);
    if (t) t.enabled = !t.enabled;
    res.json({ success: true });
});

app.post('/api/joinvc', (req, res) => {
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    const { channelId } = req.body;
    if (!channelId) return res.status(400).json({ error: 'Channel ID required' });
    res.json({ success: true, message: 'VC join command received' });
});

app.get('/api/stats', (req, res) => {
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });
    res.json({
        tokens: tokens.length,
        enabled: tokens.filter(t => t.enabled).length
    });
});

// ─── START ───
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║              👑 RINTU - SIMPLE VERSION 👑                  ║
║              ✅ RUNNING ON PORT ${PORT}                      ║
║              🔑 Admin: ${process.env.ADMIN_PASS || 'RINTU_2026'} ║
╚══════════════════════════════════════════════════════════════╝
    `);
});
