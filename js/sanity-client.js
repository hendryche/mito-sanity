/**
 * 线粒体家庭联盟 - Sanity API 配置
 * 
 * 使用 Sanity 作为数据源
 */

// Sanity 项目配置
var SANITY_CONFIG = {
    projectId: '2bbut6z3',
    dataset: 'mito',
    apiVersion: '2024-01-01',
    // 只读Token（用于读取数据）
    readToken: 'skggFHan06bWSdJEK1VcBxb4QXCC1g4Pdpu4QyrBAdJJ1lbAqgXKXPpXBIXs2SCrQvRzqJ11mABYNFlak11em95XZCsBYb2hCuhGNOoBMeU03VIhqcscbpPFly2zSPWHEQb8t9fgBmcLDsyEMFMG156ZS6uv4yOpHkeoRoihNHME5TikkhUv',
    // 写入Token（用于提交留言）
    writeToken: 'ska3BsBbWKB2OOdstJs1aTvhDAdY0Aq1ARBL9mDNfnAev1YyfeiGR8ccDNwiPik4ZwGRdjeLYVsBhnmCh9IYKsgdshxRWhlj7u34MiUW7uvmFxBbnDefX9DPNXB6V9ouCJNU3VUGfgQ8d9uhlGoSXzWBUevzdunf8sPUKS2wKZIfXX7xARZh',
    useCdn: true
};

// 构建 Sanity GROQ 查询 URL (使用CDN API)
function buildQueryUrl(query) {
    const baseUrl = `https://${SANITY_CONFIG.projectId}.api.sanity.io/v${SANITY_CONFIG.apiVersion}/data/query/${SANITY_CONFIG.dataset}`;
    return `${baseUrl}?query=${encodeURIComponent(query)}`;
}

// 获取数据
async function sanityGet(query, fallback = []) {
    try {
        const url = buildQueryUrl(query);
        const response = await fetch(url);
        
        if (!response.ok) {
            console.warn('Sanity API错误:', response.status);
            return fallback;
        }
        
        const data = await response.json();
        if (data.error) {
            console.warn('Sanity查询错误:', data.error);
            return fallback;
        }
        
        return data.result || fallback;
    } catch (e) {
        console.warn('Sanity获取失败:', e.message);
        return fallback;
    }
}

// 提交数据到 Sanity (使用 Mutations API)
async function sanityMutate(mutations) {
    try {
        const url = `https://${SANITY_CONFIG.projectId}.api.sanity.io/v${SANITY_CONFIG.apiVersion}/data/mutate/${SANITY_CONFIG.dataset}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SANITY_CONFIG.writeToken}`
            },
            body: JSON.stringify({ mutations })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.warn('Sanity提交错误:', response.status, errorText);
            return { success: false, error: errorText };
        }
        
        const data = await response.json();
        return { success: true, data };
    } catch (e) {
        console.warn('Sanity提交失败:', e.message);
        return { success: false, error: e.message };
    }
}

// 数据层 - 使用 Sanity
var SanityData = {
    // 获取关于我们板块
    async getAboutSections() {
        return await sanityGet(`
            *[_type == "aboutSection"] | order(sortOrder asc) {
                "id": id,
                "nameZh": nameZh,
                "nameEn": nameEn,
                "sortOrder": sortOrder,
                "image": image,
                "contentZh": contentZh,
                "contentEn": contentEn
            }
        `, []);
    },
    
    // 获取疾病分类
    async getDiseaseCategories() {
        return await sanityGet(`
            *[_type == "diseaseCategory"] | order(sortOrder asc) {
                "id": id,
                "nameZh": nameZh,
                "nameEn": nameEn,
                "sortOrder": sortOrder
            }
        `, []);
    },
    
    // 获取疾病详情
    async getDiseaseItems() {
        return await sanityGet(`
            *[_type == "diseaseItem"] | order(_createdAt desc) {
                "category": category,
                "titleZh": titleZh,
                "titleEn": titleEn,
                "descZh": descZh,
                "descEn": descEn,
                "contentZh": contentZh,
                "contentEn": contentEn,
                "tagsZh": tagsZh,
                "tagsEn": tagsEn
            }
        `, []);
    },
    
    // 获取新闻分类
    async getNewsCategories() {
        return await sanityGet(`
            *[_type == "newsCategory"] | order(sortOrder asc) {
                "id": id,
                "nameZh": nameZh,
                "nameEn": nameEn,
                "sortOrder": sortOrder
            }
        `, []);
    },
    
    // 获取新闻
    async getNewsItems() {
        return await sanityGet(`
            *[_type == "newsItem"] | order(date desc) {
                "category": category,
                "titleZh": titleZh,
                "titleEn": titleEn,
                "excerptZh": excerptZh,
                "excerptEn": excerptEn,
                "image": image,
                "link": link,
                "date": date
            }
        `, []);
    },
    
    // 获取组织
    async getOrganizations() {
        return await sanityGet(`
            *[_type == "organization"] | order(_createdAt desc) {
                "name": name,
                "country": country,
                "region": region,
                "descZh": descZh,
                "descEn": descEn,
                "email": email,
                "website": website,
                "logo": logo
            }
        `, []);
    },
    
    // 获取网站设置
    async getSiteSettings() {
        return await sanityGet(`
            *[_type == "siteSettings"][0] {
                "orgName": orgName,
                "orgNameEn": orgNameEn,
                "logo": logo,
                "descriptionZh": descriptionZh,
                "descriptionEn": descriptionEn,
                "email": email,
                "phone": phone,
                "addressZh": addressZh,
                "addressEn": addressEn,
                "website": website,
                "socialLinks": socialLinks,
                "contactItems": contactItems,
                "footerLinks": footerLinks
            }
        `, {
            orgName: '线粒体家庭联盟',
            orgNameEn: 'Mitochondrial Disease Family Alliance',
            socialLinks: [],
            contactItems: [],
            footerLinks: {}
        });
    },
    
    // 提交留言
    async submitContact(contactData) {
        const mutation = {
            create: {
                _type: 'contact',
                name: contactData.name,
                email: contactData.email,
                phone: contactData.phone || '',
                type: contactData.type || 'general',
                message: contactData.message,
                isRead: false,
                createdAt: new Date().toISOString()
            }
        };
        
        return await sanityMutate([mutation]);
    }
};