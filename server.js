#!/usr/bin/env node
/* ============================================================
   上瘾式学习 · 纠偏打卡 —— 同步服务（零依赖）
   作用：用单一 data.json 作为「多端共用数据源」。
   运行：node server.js
   然后浏览器打开：
     PC:   http://localhost:3000
     手机（同一 WiFi）: http://<本机局域网IP>:3000
   ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DIR = __dirname;
const DATA_FILE = path.join(DIR, 'data.json');
const HTML_FILE = path.join(DIR, 'index.html');

function readData() {
  try { return fs.readFileSync(DATA_FILE, 'utf8'); } catch (e) { return null; }
}
function writeData(str) {
  fs.writeFileSync(DATA_FILE, str);
}

const server = http.createServer((req, res) => {
  const headers = { 'Access-Control-Allow-Origin': '*' };
  const send = (code, body, type) => {
    res.writeHead(code, Object.assign({ 'Content-Type': type || 'application/json' }, headers));
    res.end(body);
  };

  if (req.method === 'OPTIONS') { res.writeHead(204, headers); res.end(); return; }

  // 读取共享数据（单一数据源）
  if (req.method === 'GET' && req.url === '/api/data') {
    const data = readData();
    send(200, data ? data : '{}');
    return;
  }

  // 写入共享数据（last-write-wins）
  if (req.method === 'POST' && req.url === '/api/data') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 5e6) req.destroy(); });
    req.on('end', () => {
      try {
        JSON.parse(body); // 校验合法 JSON
        writeData(body);
        send(200, '{"ok":true}');
      } catch (e) {
        send(400, '{"ok":false,"error":"invalid json"}');
      }
    });
    return;
  }

  // 托管前端页面
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    fs.readFile(HTML_FILE, (err, buf) => {
      if (err) { res.writeHead(500, headers); res.end('index.html not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(buf);
    });
    return;
  }

  res.writeHead(404, headers); res.end('not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('✅ 上瘾式学习打卡 同步服务已启动');
  console.log('   PC 访问:    http://localhost:' + PORT);
  console.log('   手机访问:    http://<本机局域网IP>:' + PORT + '（需同一 WiFi）');
  console.log('   共享数据文件: ' + DATA_FILE);
});
