/**
 * 线粒体家庭联盟 - 前端数据层
 * 支持 API 和 localStorage 两种数据源
 */

var DataLayer = {
    // API配置
    API_BASE: '/api',  // 使用 Nginx 代理，相对路径
    USE_API: true,
    
    // 异步获取数据
    async get(endpoint, fallback = null) {
        if (this.USE_API) {
            try {
                const res = await fetch(this.API_BASE + endpoint);
                if (res.ok) {
                    const data = await res.json();
                    return data;
                }
            } catch (e) {
                console.warn(`API获取失败 [${endpoint}]，使用本地数据:`, e.message);
            }
        }
        // 回退到 localStorage
        const key = this.getStorageKey(endpoint);
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : fallback;
    },
    
    // 保存数据
    async post(endpoint, data) {
        if (this.USE_API) {
            try {
                const res = await fetch(this.API_BASE + endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (res.ok) return await res.json();
            } catch (e) {
                console.warn(`API保存失败 [${endpoint}]，使用本地存储:`, e.message);
            }
        }
        // 回退到 localStorage
        const key = this.getStorageKey(endpoint);
        localStorage.setItem(key, JSON.stringify(data));
        return { success: true };
    },
    
    // 更新数据
    async put(endpoint, id, data) {
        if (this.USE_API) {
            try {
                const res = await fetch(this.API_BASE + endpoint + '/' + id, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (res.ok) return await res.json();
            } catch (e) {
                console.warn(`API更新失败 [${endpoint}]`, e.message);
            }
        }
        return { success: false };
    },
    
    // 删除数据
    async delete(endpoint, id) {
        if (this.USE_API) {
            try {
                const res = await fetch(this.API_BASE + endpoint + '/' + id, {
                    method: 'DELETE'
                });
                if (res.ok) return await res.json();
            } catch (e) {
                console.warn(`API删除失败 [${endpoint}]`, e.message);
            }
        }
        return { success: false };
    },
    
    // 获取存储键名
    getStorageKey(endpoint) {
        const map = {
            '/about': 'aboutSections',
            '/diseases/categories': 'diseaseCategories',
            '/diseases/items': 'diseaseItems',
            '/news/categories': 'newsCategories',
            '/news/items': 'newsItems',
            '/orgs': 'orgItems',
            '/contacts': 'contacts',
            '/stats': 'visitStats'
        };
        return map[endpoint] || endpoint.replace(/\//g, '');
    }
};

// 页面初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化数据层
    await initApp();
});

async function initApp() {
    var currentLang = 'zh';
    var currentAboutSection = '';
    var currentDiseaseCategory = '';
    var currentNewsCategory = '';
    var currentOrgRegion = 'all';
    
    // 加载所有数据
    var aboutSections = await DataLayer.get('/about') || [];
    var diseaseCategories = await DataLayer.get('/diseases/categories') || [];
    var diseaseItems = await DataLayer.get('/diseases/items') || [];
    var newsCategories = await DataLayer.get('/news/categories') || [];
    var newsItems = await DataLayer.get('/news/items') || [];
    var orgItems = await DataLayer.get('/orgs') || [];
    
    // 默认数据
    if (aboutSections.length === 0) aboutSections = getDefaultAbout();
    if (diseaseCategories.length === 0) diseaseCategories = getDefaultDiseaseCategories();
    if (newsCategories.length === 0) newsCategories = getDefaultNewsCategories();
    
    if (!currentAboutSection) currentAboutSection = aboutSections[0]?.id || 'who';
    if (!currentDiseaseCategory) currentDiseaseCategory = diseaseCategories[0]?.id || 'mito';
    if (!currentNewsCategory) currentNewsCategory = newsCategories[0]?.id || 'research';
    
    // 语言切换
    function setLanguage(lang) {
        currentLang = lang;
        document.querySelectorAll('[data-zh]').forEach(function(el) {
            el.textContent = el.getAttribute('data-' + lang);
        });
        document.querySelectorAll('.nav-lang-btn').forEach(function(btn) {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
        renderAbout();
        renderDiseases();
        renderNews();
        renderOrgs();
        renderContact();
        renderFooter();
    }
    
    document.querySelectorAll('.nav-lang-btn').forEach(function(btn) {
        btn.addEventListener('click', function() { setLanguage(btn.dataset.lang); });
    });
    
    // 渲染关于我们
    function renderAbout() {
        var tabsHtml = '';
        aboutSections.forEach(function(s) {
            tabsHtml += '<button class="about-tab' + (currentAboutSection === s.id ? ' active' : '') + '" data-id="' + s.id + '">' + (currentLang === 'zh' ? s.name_zh : s.name_en) + '</button>';
        });
        document.getElementById('aboutTabs').innerHTML = tabsHtml;
        
        document.querySelectorAll('.about-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                currentAboutSection = this.dataset.id;
                renderAbout();
            });
        });
        
        var section = aboutSections.find(function(s) { return s.id === currentAboutSection; });
        if (section && section.blocks) {
            var html = '';
            section.blocks.forEach(function(block) {
                if (block.type === 'image' && block.url) {
                    html += '<img src="' + block.url + '" alt="" class="about-section-image">';
                } else if (block.type === 'text') {
                    html += '<div class="about-section-text">' + (currentLang === 'zh' ? block.content_zh : block.content_en) + '</div>';
                }
            });
            document.getElementById('aboutContent').innerHTML = html;
        }
    }
    
    // 渲染疾病科普
    function renderDiseases() {
        var cats = diseaseCategories;
        var tabsHtml = '';
        cats.forEach(function(c) {
            tabsHtml += '<button class="category-tab' + (currentDiseaseCategory === c.id ? ' active' : '') + '" data-id="' + c.id + '">' + (currentLang === 'zh' ? c.name_zh : c.name_en) + '</button>';
        });
        document.getElementById('diseaseCategoryTabs').innerHTML = tabsHtml;
        
        document.querySelectorAll('#diseaseCategoryTabs .category-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                currentDiseaseCategory = this.dataset.id;
                renderDiseases();
            });
        });
        
        var filtered = diseaseItems.filter(function(i) { return i.category === currentDiseaseCategory; });
        var grid = document.getElementById('diseaseGrid');
        
        if (filtered.length === 0) {
            grid.innerHTML = '<p style="text-align:center;color:#718096;grid-column:1/-1;padding:3rem;">' + (currentLang === 'zh' ? '暂无内容' : 'No content yet') + '</p>';
            return;
        }
        
        var html = '';
        filtered.forEach(function(item) {
            var tags = currentLang === 'zh' ? (item.tags_zh || []) : (item.tags_en || []);
            html += '<div class="disease-card animate-on-scroll" onclick="showDiseaseModal(\'' + item.id + '\')"><div class="disease-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div><h3 class="disease-name">' + (currentLang === 'zh' ? item.title_zh : item.title_en) + '</h3><p class="disease-name-en">' + item.title_en + '</p><p class="disease-desc">' + (currentLang === 'zh' ? item.desc_zh : item.desc_en) + '</p><div class="disease-tags">' + tags.map(function(t) { return '<span class="disease-tag">' + t + '</span>'; }).join('') + '</div></div>';
        });
        grid.innerHTML = html;
        observeAnimations();
    }
    
    function showDiseaseModal(id) {
        var item = diseaseItems.find(function(i) { return i.id == id; });
        if (!item) return;
        document.getElementById('modalTitle').textContent = currentLang === 'zh' ? item.title_zh : item.title_en;
        var content = currentLang === 'zh' ? item.content_zh : item.content_en;
        if (!content || content.trim() === '') {
            content = '<p>' + (currentLang === 'zh' ? item.desc_zh : item.desc_en) + '</p>';
        }
        document.getElementById('modalBody').innerHTML = content;
        document.getElementById('diseaseModal').classList.add('active');
        trackVisit('diseases');
    }
    
    // 渲染新闻
    function renderNews() {
        var cats = newsCategories;
        var tabsHtml = '';
        cats.forEach(function(c) {
            tabsHtml += '<button class="category-tab' + (currentNewsCategory === c.id ? ' active' : '') + '" data-id="' + c.id + '">' + (currentLang === 'zh' ? c.name_zh : c.name_en) + '</button>';
        });
        document.getElementById('newsCategoryTabs').innerHTML = tabsHtml;
        
        document.querySelectorAll('#newsCategoryTabs .category-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                currentNewsCategory = this.dataset.id;
                renderNews();
            });
        });
        
        var filtered = newsItems.filter(function(i) { return i.category === currentNewsCategory; });
        var grid = document.getElementById('newsGrid');
        
        if (filtered.length === 0) {
            grid.innerHTML = '<p style="text-align:center;color:#718096;grid-column:1/-1;padding:3rem;">' + (currentLang === 'zh' ? '暂无资讯' : 'No news yet') + '</p>';
            return;
        }
        
        var html = '';
        filtered.forEach(function(item) {
            var catName = '';
            var cat = cats.find(function(c) { return c.id === item.category; });
            if (cat) catName = currentLang === 'zh' ? cat.name_zh : cat.name_en;
            html += '<div class="news-card animate-on-scroll" onclick="' + (item.link ? 'window.open(\'' + item.link + '\')' : 'showNewsModal(' + item.id + ')') + '"><div class="news-image">' + (item.image ? '<img src="' + item.image + '" alt="">' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>') + '</div><div class="news-content"><div class="news-meta"><span class="news-date">' + item.date + '</span><span class="news-category">' + catName + '</span></div><h3 class="news-title">' + (currentLang === 'zh' ? item.title_zh : item.title_en) + '</h3><p class="news-excerpt">' + (currentLang === 'zh' ? item.excerpt_zh : item.excerpt_en) + '</p>' + (item.link ? '<span class="news-link">' + (currentLang === 'zh' ? '阅读更多' : 'Read More') + ' →</span>' : '') + '</div></div>';
        });
        grid.innerHTML = html;
        observeAnimations();
    }
    
    function showNewsModal(id) {
        var item = newsItems.find(function(i) { return i.id == id; });
        if (!item) return;
        document.getElementById('modalTitle').textContent = currentLang === 'zh' ? item.title_zh : item.title_en;
        var bodyHtml = '<p style="color:#718096;margin-bottom:1rem;font-size:0.9rem;">' + item.date + '</p>';
        if (item.image) bodyHtml += '<img src="' + item.image + '" alt="">';
        bodyHtml += '<p>' + (currentLang === 'zh' ? item.excerpt_zh : item.excerpt_en) + '</p>';
        document.getElementById('modalBody').innerHTML = bodyHtml;
        document.getElementById('diseaseModal').classList.add('active');
        trackVisit('news');
    }
    
    // 渲染组织
    function renderOrgs() {
        var filtered = currentOrgRegion === 'all' ? orgItems : orgItems.filter(function(i) { return i.region === currentOrgRegion; });
        var grid = document.getElementById('orgGrid');
        
        if (filtered.length === 0) {
            grid.innerHTML = '<p style="text-align:center;color:#718096;grid-column:1/-1;padding:3rem;">' + (currentLang === 'zh' ? '暂无组织' : 'No organizations yet') + '</p>';
            return;
        }
        
        var html = '';
        filtered.forEach(function(item) {
            html += '<div class="org-card animate-on-scroll"><div class="org-header"><div class="org-logo">' + (item.logo ? '<img src="' + item.logo + '" alt="">' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>') + '</div><div class="org-info"><h4>' + item.name + '</h4><span class="org-country">' + item.country + '</span></div></div><p class="org-desc">' + (currentLang === 'zh' ? item.desc_zh : item.desc_en) + '</p><div class="org-contact">' + (item.email ? '<div class="org-contact-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><a href="mailto:' + item.email + '">' + item.email + '</a></div>' : '') + (item.website ? '<div class="org-contact-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/></svg><a href="https://' + item.website + '" target="_blank">' + item.website + '</a></div>' : '') + '</div></div>';
        });
        grid.innerHTML = html;
        observeAnimations();
    }
    
    document.querySelectorAll('.org-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.org-tab').forEach(function(t) { t.classList.remove('active'); });
            this.classList.add('active');
            currentOrgRegion = this.dataset.region;
            renderOrgs();
        });
    });
    
    // 渲染联系信息
    function renderContact() {
        var info = {items: []};
        document.getElementById('contactInfo').innerHTML = '<div class="contact-info-item"><div class="contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div><div><h4>地址</h4><p>上海市</p></div></div><div class="contact-info-item"><div class="contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div><div><h4>电话</h4><p>+86 21 5888 8888</p></div></div><div class="contact-info-item"><div class="contact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div><div><h4>邮箱</h4><p>contact@mitochondrial.cn</p></div></div>';
    }
    
    // 渲染页脚
    function renderFooter() {
        document.getElementById('footer').innerHTML = '<div class="footer-grid"><div class="footer-brand"><div class="footer-logo"><img src="imgs/logo.jpg" alt="" onerror="this.style.display=\'none\'"><span>线粒体家庭联盟</span></div><p class="footer-desc">线粒体家庭联盟致力于为线粒体罕见病患者、研究人员和家庭提供权威信息与全球资源连接平台。</p></div><div class="footer-column"><h4>快速链接</h4><ul class="footer-links"><li><a href="#about">关于我们</a></li><li><a href="#diseases">疾病科普</a></li><li><a href="#news">最新资讯</a></li><li><a href="#organizations">全球组织</a></li></ul></div><div class="footer-column"><h4>参与支持</h4><ul class="footer-links"><li><a href="#contact">成为志愿者</a></li><li><a href="#contact">捐款支持</a></li><li><a href="#contact">联系我们</a></li></ul></div><div class="footer-column"><h4>法律信息</h4><ul class="footer-links"><li><a href="#">隐私政策</a></li><li><a href="#">使用条款</a></li></ul></div></div><div class="footer-bottom"><p>© 2024 线粒体家庭联盟. 保留所有权利.</p></div>';
    }
    
    // 访问统计
    var visitStats = {sections: {}, total: 0};
    
    function trackVisit(sectionId) {
        var now = Date.now();
        var today = new Date().toISOString().split('T')[0];
        
        if (!visitStats.sections[sectionId]) {
            visitStats.sections[sectionId] = {count: 0, visitors: [], lastVisit: null};
        }
        
        var sessionKey = 'visited_' + sectionId;
        if (!sessionStorage.getItem(sessionKey)) {
            sessionStorage.setItem(sessionKey, 'true');
            visitStats.sections[sectionId].count++;
            visitStats.sections[sectionId].visitors.push({timestamp: now, date: today});
        }
        
        visitStats.sections[sectionId].lastVisit = now;
        
        if (!sessionStorage.getItem('visited_total')) {
            sessionStorage.setItem('visited_total', 'true');
            visitStats.total++;
        }
        
        // 发送到API
        DataLayer.post('/stats', {sectionId: sectionId, count: 1});
        localStorage.setItem('visitStats', JSON.stringify(visitStats));
    }
    
    // 滚动观察
    var visitObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                var sectionId = entry.target.id;
                if (sectionId) trackVisit(sectionId);
            }
        });
    }, {threshold: 0.3});
    
    document.querySelectorAll('section[id]').forEach(function(section) {
        visitObserver.observe(section);
    });
    
    // 动画观察
    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, {threshold: 0.1, rootMargin: '0px 0px -30px 0px'});
    
    function observeAnimations() {
        document.querySelectorAll('.animate-on-scroll').forEach(function(el) {
            observer.observe(el);
        });
    }
    
    // 模态框
    document.getElementById('modalClose').addEventListener('click', function() {
        document.getElementById('diseaseModal').classList.remove('active');
    });
    document.getElementById('diseaseModal').addEventListener('click', function(e) {
        if (e.target === this) this.classList.remove('active');
    });
    
    // 导航滚动效果
    window.addEventListener('scroll', function() {
        document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 50);
    });
    
    // 移动菜单
    document.getElementById('mobileMenuBtn').addEventListener('click', function() {
        document.getElementById('mobileMenu').classList.toggle('active');
    });
    document.querySelectorAll('#mobileMenu a').forEach(function(link) {
        link.addEventListener('click', function() {
            document.getElementById('mobileMenu').classList.remove('active');
        });
    });
    
    // 联系表单提交
    document.getElementById('contactForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        var formData = new FormData(e.target);
        var contact = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            type: formData.get('type'),
            message: formData.get('message')
        };
        
        await DataLayer.post('/contacts', contact);
        trackVisit('contact');
        
        alert(currentLang === 'zh' ? '感谢您的留言！我们会尽快与您联系。' : 'Thank you for your message! We will contact you soon.');
        e.target.reset();
    });
    
    // 平滑滚动
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            var target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({behavior: 'smooth', block: 'start'});
        });
    });
    
    // 初始渲染
    renderAbout();
    renderDiseases();
    renderNews();
    renderOrgs();
    renderContact();
    renderFooter();
    observeAnimations();
    
    // 首页访问统计
    if (window.scrollY < 100) {
        setTimeout(function() { trackVisit('home'); }, 1000);
    }
}

// 默认数据
function getDefaultAbout() {
    return [{
        id: 'who',
        name_zh: '我们是谁',
        name_en: 'Who We Are',
        blocks: [{
            type: 'text',
            content_zh: '<h3>线粒体家庭联盟</h3><p>线粒体家庭联盟是一个充满希望与温暖的公益组织，为中国的线粒体罕见病患者、家属和研究人员提供一个咨询和联系的平台。</p><p>我们致力于线粒体罕见病的科普，定期发布线上线下的活动情况，以及最新研究药物的进展情况。</p>',
            content_en: '<h3>Mitochondrial Disease Family Alliance</h3><p>We are a warm and hopeful public welfare organization providing a platform for consultation and connection for patients, families and researchers.</p>'
        }]
    }];
}

function getDefaultDiseaseCategories() {
    return [
        {id: 'mito', name_zh: '了解线粒体', name_en: 'About Mitochondria'},
        {id: 'intro', name_zh: '线粒体疾病介绍', name_en: 'Mitochondrial Diseases'},
        {id: 'resource', name_zh: '资源', name_en: 'Resources'},
        {id: 'explore', name_zh: '探索', name_en: 'Explore'}
    ];
}

function getDefaultNewsCategories() {
    return [
        {id: 'research', name_zh: '研究进展', name_en: 'Research Progress'},
        {id: 'story', name_zh: '患者故事', name_en: 'Patient Stories'},
        {id: 'event', name_zh: '会议活动', name_en: 'Events'}
    ];
}
