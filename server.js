/**
 * 线粒体家庭联盟 API 服务
 * 使用 SQLite 数据库存储数据 (sql.js - 纯JavaScript实现)
 *
 * 安装依赖：
 * npm init -y
 * npm install express cors helmet sql.js
 *
 * 运行：
 * node server.js
 */

const express = require('express');
const initSqlJs = require('sql.js');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data.db');

// 数据库实例
let db = null;

// 安全中间件
app.use(helmet({
    contentSecurityPolicy: false  // 静态站点关闭CSP
}));

// CORS配置 - 允许所有来源用于本地调试
app.use(cors({
    origin: '*',
    credentials: false
}));

app.use(express.json({ limit: '10mb' }));

// 静态文件服务 - 允许直接访问 HTML 文件
app.use(express.static(__dirname, {
    index: ['index.html', 'admin-login.html'],
    setHeaders: function (res, path) {
        // 确保 HTML 文件不被缓存
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
    }
}));

// 专门处理 admin 页面路由
app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin-login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 初始化数据库
async function initDatabase() {
    const SQL = await initSqlJs();
    
    // 尝试加载现有数据库
    try {
        if (fs.existsSync(DB_PATH)) {
            const buffer = fs.readFileSync(DB_PATH);
            db = new SQL.Database(buffer);
            console.log('✅ 已加载现有数据库');
        } else {
            db = new SQL.Database();
            console.log('✅ 创建新数据库');
        }
    } catch (err) {
        db = new SQL.Database();
        console.log('✅ 创建新数据库 (加载失败)');
    }
    
    // 创建表结构
    db.run(`
        CREATE TABLE IF NOT EXISTS about_sections (
            id TEXT PRIMARY KEY,
            name_zh TEXT,
            name_en TEXT,
            blocks TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
        
        CREATE TABLE IF NOT EXISTS disease_categories (
            id TEXT PRIMARY KEY,
            name_zh TEXT,
            name_en TEXT,
            sort_order INTEGER DEFAULT 0
        );
        
        CREATE TABLE IF NOT EXISTS disease_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT,
            title_zh TEXT,
            title_en TEXT,
            desc_zh TEXT,
            desc_en TEXT,
            content_zh TEXT,
            content_en TEXT,
            tags_zh TEXT,
            tags_en TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
        
        CREATE TABLE IF NOT EXISTS news_categories (
            id TEXT PRIMARY KEY,
            name_zh TEXT,
            name_en TEXT,
            sort_order INTEGER DEFAULT 0
        );
        
        CREATE TABLE IF NOT EXISTS news_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT,
            title_zh TEXT,
            title_en TEXT,
            excerpt_zh TEXT,
            excerpt_en TEXT,
            content_zh TEXT,
            content_en TEXT,
            image TEXT,
            link TEXT,
            date TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
        
        CREATE TABLE IF NOT EXISTS org_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            country TEXT,
            region TEXT,
            desc_zh TEXT,
            desc_en TEXT,
            email TEXT,
            website TEXT,
            logo TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
        
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT,
            phone TEXT,
            type TEXT,
            message TEXT,
            date TEXT,
            timestamp INTEGER,
            is_read INTEGER DEFAULT 0,
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
        
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
        
        CREATE TABLE IF NOT EXISTS visit_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip TEXT,
            visit_time INTEGER,
            user_agent TEXT
        );
        
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT DEFAULT 'admin',
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
    `);
    
    // 创建默认管理员账号 (密码: admin123)
    const adminResult = db.exec("SELECT id FROM admin_users WHERE username='admin'");
    if (adminResult.length === 0) {
        const passwordHash = Buffer.from('admin123').toString('base64');
        db.run("INSERT INTO admin_users (username, password) VALUES ('admin', ?)", [passwordHash]);
        console.log('默认管理员账号已创建: admin / admin123');
    }
    
    saveDatabase();
    console.log('✅ 数据库初始化完成');
}

// 保存数据库到文件
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

// 辅助函数：将sql.js结果转为对象数组
function queryAll(sql, params = []) {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
        stmt.bind(params);
    }
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

function queryOne(sql, params = []) {
    const results = queryAll(sql, params);
    return results.length > 0 ? results[0] : null;
}

function runSql(sql, params = []) {
    db.run(sql, params);
    saveDatabase();
    return { lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] || 0 };
}

// ============ 中间件 ============
// 简化的认证中间件 - 允许所有 API 请求通过用于开发/内网使用
const authMiddleware = (req, res, next) => {
    next();
};

app.use(authMiddleware);

// ============ 健康检查 ============
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// ============ 关于我们 API ============
app.get('/api/about', (req, res) => {
    try {
        const sections = queryAll('SELECT * FROM about_sections ORDER BY sort_order');
        res.json(sections.map(s => ({...s, blocks: JSON.parse(s.blocks || '[]')})));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/about', (req, res) => {
    try {
        const { id, name_zh, name_en, blocks, sort_order } = req.body;
        runSql(`
            INSERT OR REPLACE INTO about_sections (id, name_zh, name_en, blocks, sort_order, updated_at)
            VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
        `, [id, name_zh, name_en, JSON.stringify(blocks || []), sort_order || 0]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/about/:id', (req, res) => {
    try {
        runSql('DELETE FROM about_sections WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ 疾病科普 API ============
app.get('/api/diseases/categories', (req, res) => {
    try {
        const cats = queryAll('SELECT * FROM disease_categories ORDER BY sort_order');
        res.json(cats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/diseases/categories', (req, res) => {
    try {
        const { id, name_zh, name_en, sort_order } = req.body;
        runSql(`
            INSERT OR REPLACE INTO disease_categories (id, name_zh, name_en, sort_order)
            VALUES (?, ?, ?, ?)
        `, [id, name_zh, name_en, sort_order || 0]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/diseases/categories/:id', (req, res) => {
    try {
        runSql('DELETE FROM disease_categories WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/diseases/items', (req, res) => {
    try {
        const items = queryAll('SELECT * FROM disease_items ORDER BY created_at DESC');
        res.json(items.map(i => ({
            ...i,
            tags_zh: JSON.parse(i.tags_zh || '[]'),
            tags_en: JSON.parse(i.tags_en || '[]')
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/diseases/items', (req, res) => {
    try {
        const { category, title_zh, title_en, desc_zh, desc_en, content_zh, content_en, tags_zh, tags_en } = req.body;
        const result = runSql(`
            INSERT INTO disease_items 
            (category, title_zh, title_en, desc_zh, desc_en, content_zh, content_en, tags_zh, tags_en)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            category, title_zh, title_en, desc_zh, desc_en,
            content_zh, content_en,
            JSON.stringify(tags_zh || []),
            JSON.stringify(tags_en || [])
        ]);
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/diseases/items/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { category, title_zh, title_en, desc_zh, desc_en, content_zh, content_en, tags_zh, tags_en } = req.body;
        runSql(`
            UPDATE disease_items SET 
                category=?, title_zh=?, title_en=?, desc_zh=?, desc_en=?,
                content_zh=?, content_en=?, tags_zh=?, tags_en=?,
                updated_at=strftime('%s', 'now')
            WHERE id=?
        `, [
            category, title_zh, title_en, desc_zh, desc_en,
            content_zh, content_en,
            JSON.stringify(tags_zh || []),
            JSON.stringify(tags_en || []),
            id
        ]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/diseases/items/:id', (req, res) => {
    try {
        runSql('DELETE FROM disease_items WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ 新闻 API ============
app.get('/api/news/categories', (req, res) => {
    try {
        const cats = queryAll('SELECT * FROM news_categories ORDER BY sort_order');
        res.json(cats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/news/categories', (req, res) => {
    try {
        const { id, name_zh, name_en, sort_order } = req.body;
        runSql(`
            INSERT OR REPLACE INTO news_categories (id, name_zh, name_en, sort_order)
            VALUES (?, ?, ?, ?)
        `, [id, name_zh, name_en, sort_order || 0]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/news/categories/:id', (req, res) => {
    try {
        runSql('DELETE FROM news_categories WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/news/items', (req, res) => {
    try {
        const items = queryAll('SELECT * FROM news_items ORDER BY date DESC, created_at DESC');
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/news/items', (req, res) => {
    try {
        const { category, title_zh, title_en, excerpt_zh, excerpt_en, content_zh, content_en, image, link, date } = req.body;
        const result = runSql(`
            INSERT INTO news_items 
            (category, title_zh, title_en, excerpt_zh, excerpt_en, content_zh, content_en, image, link, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [category, title_zh, title_en, excerpt_zh, excerpt_en, content_zh, content_en, image, link, date]);
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/news/items/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { category, title_zh, title_en, excerpt_zh, excerpt_en, content_zh, content_en, image, link, date } = req.body;
        runSql(`
            UPDATE news_items SET 
                category=?, title_zh=?, title_en=?, excerpt_zh=?, excerpt_en=?,
                content_zh=?, content_en=?, image=?, link=?, date=?,
                updated_at=strftime('%s', 'now')
            WHERE id=?
        `, [category, title_zh, title_en, excerpt_zh, excerpt_en, content_zh, content_en, image, link, date, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/news/items/:id', (req, res) => {
    try {
        runSql('DELETE FROM news_items WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ 组织 API ============
app.get('/api/orgs', (req, res) => {
    try {
        const items = queryAll('SELECT * FROM org_items ORDER BY created_at DESC');
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/orgs', (req, res) => {
    try {
        const { name, country, region, desc_zh, desc_en, email, website, logo } = req.body;
        const result = runSql(`
            INSERT INTO org_items (name, country, region, desc_zh, desc_en, email, website, logo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, country, region, desc_zh, desc_en, email, website, logo]);
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/orgs/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, country, region, desc_zh, desc_en, email, website, logo } = req.body;
        runSql(`
            UPDATE org_items SET 
                name=?, country=?, region=?, desc_zh=?, desc_en=?,
                email=?, website=?, logo=?,
                updated_at=strftime('%s', 'now')
            WHERE id=?
        `, [name, country, region, desc_zh, desc_en, email, website, logo, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/orgs/:id', (req, res) => {
    try {
        runSql('DELETE FROM org_items WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ 留言 API ============
app.get('/api/contacts', (req, res) => {
    try {
        const items = queryAll('SELECT * FROM contacts ORDER BY timestamp DESC');
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/contacts', (req, res) => {
    try {
        const { name, email, phone, type, message } = req.body;
        const timestamp = Date.now();
        const date = new Date().toISOString().split('T')[0];
        runSql(`
            INSERT INTO contacts (name, email, phone, type, message, date, timestamp, is_read)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        `, [name, email, phone, type, message, date, timestamp]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/contacts/unread-count', (req, res) => {
    try {
        const result = queryOne('SELECT COUNT(*) as count FROM contacts WHERE is_read=0');
        res.json({ count: result ? result.count : 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/contacts/:timestamp/read', (req, res) => {
    try {
        runSql('UPDATE contacts SET is_read=1 WHERE timestamp=?', [req.params.timestamp]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/contacts/read-all', (req, res) => {
    try {
        runSql('UPDATE contacts SET is_read=1');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/contacts/read-all', (req, res) => {
    try {
        runSql('UPDATE contacts SET is_read=1');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/contacts/:timestamp', (req, res) => {
    try {
        runSql('DELETE FROM contacts WHERE timestamp=?', [req.params.timestamp]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ 访问统计 API ============
// 获取客户端真实IP
function getClientIP(req) {
    const forwarded = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    if (realIp) {
        return realIp;
    }
    return req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
}

// 获取访问统计
app.get('/api/stats', (req, res) => {
    try {
        const visits = queryAll('SELECT * FROM visit_stats ORDER BY visit_time DESC');
        res.json({ visits: visits, total: visits.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 记录访问
app.post('/api/stats', (req, res) => {
    try {
        const now = Date.now();
        const clientIP = getClientIP(req);
        const userAgent = req.headers['user-agent'] || 'unknown';
        
        runSql('INSERT INTO visit_stats (ip, visit_time, user_agent) VALUES (?, ?, ?)', [clientIP, now, userAgent]);
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 清空访问统计
app.delete('/api/stats', (req, res) => {
    try {
        runSql('DELETE FROM visit_stats');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 删除单条访问记录
app.delete('/api/stats/:id', (req, res) => {
    try {
        runSql('DELETE FROM visit_stats WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ 设置 API ============
app.get('/api/settings/:key', (req, res) => {
    try {
        const setting = queryOne('SELECT value FROM settings WHERE key=?', [req.params.key]);
        res.json(setting ? JSON.parse(setting.value) : null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings', (req, res) => {
    try {
        const { key, value } = req.body;
        const existing = queryOne('SELECT * FROM settings WHERE key=?', [key]);
        if (existing) {
            runSql('UPDATE settings SET value=?, updated_at=strftime(\'%s\', \'now\') WHERE key=?', [JSON.stringify(value), key]);
        } else {
            runSql('INSERT INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ 管理员认证 API ============
app.post('/api/admin/login', (req, res) => {
    try {
        const { username, password } = req.body;
        const passwordHash = Buffer.from(password).toString('base64');
        const user = queryOne('SELECT * FROM admin_users WHERE username=? AND password=?', [username, passwordHash]);
        
        if (user) {
            const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
            res.json({ success: true, token, username: user.username });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/change-password', (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
        const validKey = process.env.API_KEY || 'your-secret-api-key';
        
        if (apiKey !== validKey) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        
        const oldHash = Buffer.from(oldPassword).toString('base64');
        const admin = queryOne('SELECT * FROM admin_users WHERE username=? AND password=?', ['admin', oldHash]);
        
        if (!admin) {
            res.status(401).json({ error: 'Current password incorrect' });
            return;
        }
        
        const newHash = Buffer.from(newPassword).toString('base64');
        runSql('UPDATE admin_users SET password=? WHERE username=?', [newHash, 'admin']);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============ 错误处理 ============
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// ============ 启动服务 ============
const HOST = process.env.HOST || '0.0.0.0';

// 初始化数据库后启动服务器
initDatabase().then(() => {
    app.listen(PORT, HOST, () => {
        console.log(`
╔═══════════════════════════════════════════════════════╗
║     线粒体家庭联盟 API 服务                           ║
╠═══════════════════════════════════════════════════════╣
║  状态:     运行中                                     ║
║  端口:     ${PORT}                                       ║
║  地址:     http://${HOST}:${PORT}                        ║
║  数据库:   ${DB_PATH}   ║
║  引擎:     sql.js (纯JavaScript)                       ║
╠═══════════════════════════════════════════════════════╣
║  默认管理员: admin / admin123                          ║
║  请修改 API_KEY 环境变量以确保安全                     ║
╚═══════════════════════════════════════════════════════╝
        `);
    });
}).catch(err => {
    console.error('数据库初始化失败:', err);
    process.exit(1);
});