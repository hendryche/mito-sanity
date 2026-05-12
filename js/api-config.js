/**
 * 线粒体家庭联盟 API 配置
 * 
 * 修改 API_BASE 为您的服务器地址
 */
var API_CONFIG = {
    // API 服务器地址（根据您的配置修改）
    API_BASE: 'http://192.168.2.163/api',
    
    // 是否使用 API（false 则使用 localStorage）
    USE_API: true,
    
    // 请求超时时间（毫秒）
    TIMEOUT: 10000
};

/**
 * API 请求封装
 */
async function apiRequest(endpoint, options = {}) {
    if (!API_CONFIG.USE_API) return null;
    
    const url = API_CONFIG.API_BASE + endpoint;
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
        
        const response = await fetch(url, {
            ...defaultOptions,
            ...options,
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.warn(`API请求失败 [${endpoint}]:`, error.message);
        return null;
    }
}

/**
 * 备用 localStorage 存储
 */
var LocalStorage = {
    get(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || 'null');
        } catch {
            return null;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('localStorage写入失败:', e);
        }
    },
    remove(key) {
        localStorage.removeItem(key);
    }
};
