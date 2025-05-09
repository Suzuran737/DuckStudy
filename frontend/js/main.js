import { userAPI, contentAPI } from './api.js';

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 首先更新用户状态
        await updateUserStatus();
        
        // 然后加载其他内容
        await Promise.all([
            loadHotCourses(),
            loadMarketItems(),
            loadHotPosts(),
            loadRecentViews()
        ]);

        // 添加首页搜索按钮事件
        addHomeSearchEvent();
    } catch (error) {
        console.error('加载数据失败:', error);
        alert('加载数据失败，请刷新页面重试');
    }
});

// 更新用户状态
async function updateUserStatus() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    const userSection = document.getElementById('userSection');
    
    if (!userSection) {
        console.error('未找到用户区域元素');
        return;
    }
    
    if (userData) {
        userSection.innerHTML = `
            <div class="user-profile">
                <div class="avatar-container">
                    <div class="avatar">
                        <i class="bi bi-person-circle"></i>
                    </div>
                    <div class="dropdown-menu">
                        <a href="pages/profile.html" class="dropdown-item">
                            <i class="bi bi-person"></i> 个人中心
                        </a>
                        <a href="pages/favorites.html" class="dropdown-item">
                            <i class="bi bi-heart"></i> 我的收藏
                        </a>
                        <a href="pages/history.html" class="dropdown-item">
                            <i class="bi bi-clock-history"></i> 历史观看
                        </a>
                        <div class="dropdown-divider"></div>
                        <a href="#" class="dropdown-item" id="logoutBtn">
                            <i class="bi bi-box-arrow-right"></i> 退出登录
                        </a>
                    </div>
                </div>
                <span class="username">${userData.username}</span>
            </div>
        `;
        
        // 添加退出登录事件
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('userData');
                window.location.reload();
            });
        }
        
        // 添加头像下拉菜单事件
        const avatarContainer = document.querySelector('.avatar-container');
        if (avatarContainer) {
            avatarContainer.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdownMenu = avatarContainer.querySelector('.dropdown-menu');
                if (dropdownMenu) {
                    dropdownMenu.classList.toggle('show');
                }
            });
            
            // 点击其他地方关闭下拉菜单
            document.addEventListener('click', () => {
                const dropdownMenu = avatarContainer.querySelector('.dropdown-menu');
                if (dropdownMenu && dropdownMenu.classList.contains('show')) {
                    dropdownMenu.classList.remove('show');
                }
            });
        }
    } else {
        userSection.innerHTML = `
            <a href="pages/login.html" class="btn btn-outline-primary me-2">登录</a>
            <a href="pages/register.html" class="btn btn-primary">注册</a>
        `;
    }
}

// 加载课程评价 - 已不再使用，由loadHotCourses替代
// 保留此函数是为了避免修改太多代码，但不再调用它
async function loadReviews() {
    try {
        // 检查reviewsGrid是否存在
        const reviewsGrid = document.getElementById('reviewsGrid');
        if (!reviewsGrid) {
            console.log('reviewsGrid元素不存在，跳过加载评价');
            return;
        }
        
        const reviews = await contentAPI.getReviews();
        
        if (!reviews || reviews.length === 0) {
            reviewsGrid.innerHTML = '<div class="text-center">暂无课程评价</div>';
            return;
        }
        
        reviewsGrid.innerHTML = reviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <h3>${review.title}</h3>
                    <div class="rating">
                        ${'★'.repeat(Math.floor(review.rating))}${'☆'.repeat(5-Math.floor(review.rating))}
                    </div>
                </div>
                <div class="review-text">${review.content}</div>
                <div class="review-footer">
                    <span>${review.author}</span>
                    <span>${review.date}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载课程评价失败:', error);
        // 不抛出错误，防止中断其他功能
        console.log('跳过加载评价，继续执行其他功能');
    }
}

// 加载二手市场商品
async function loadMarketItems() {
    try {
        const marketGrid = document.getElementById('marketGrid');
        const response = await contentAPI.getMarketItems();
        
        // 确保response.items存在且是数组
        const items = response && response.items && Array.isArray(response.items) ? response.items : [];
        
        if (items.length === 0) {
            marketGrid.innerHTML = '<div class="text-center">暂无商品</div>';
            return;
        }
        
        marketGrid.innerHTML = items.map(item => `
            <div class="market-card" data-id="${item.id}">
                <img src="${item.images && item.images[0] ? item.images[0] : '../images/default-product.jpg'}" alt="${item.title}">
                <div class="market-info">
                    <h3>${item.title}</h3>
                    <div class="price">¥${item.price}</div>
                    <div class="description">${item.description}</div>
                </div>
            </div>
        `).join('');
        
        // 添加点击事件，跳转到商品详情页
        const marketCards = document.querySelectorAll('.market-card');
        marketCards.forEach(card => {
            card.addEventListener('click', () => {
                const itemId = card.dataset.id;
                window.location.href = `pages/market-detail.html?id=${itemId}`;
            });
        });
    } catch (error) {
        console.error('加载二手市场商品失败:', error);
        throw error;
    }
}

// 加载热门帖子
async function loadHotPosts() {
    try {
        const postsList = document.getElementById('postsList');
        const posts = await contentAPI.getHotPosts();
        
        if (!posts || posts.length === 0) {
            postsList.innerHTML = '<div class="text-center">暂无热门帖子</div>';
            return;
        }
        
        // 获取所有分类信息，用于展示帖子分类
        const getCategoryInfo = (category) => {
            const categoryMap = {
                'study': { name: '学习交流', icon: 'bi-book' },
                'tech': { name: '技术讨论', icon: 'bi-code-square' },
                'experience': { name: '经验分享', icon: 'bi-share' },
                'help': { name: '问题求助', icon: 'bi-question-circle' },
                'resource': { name: '资源分享', icon: 'bi-link' }
            };
            return categoryMap[category] || { name: category, icon: 'bi-tag' };
        };
        
        postsList.innerHTML = posts.map(post => {
            const categoryInfo = getCategoryInfo(post.category);
            
            // 格式化帖子内容预览（最多显示50个字符）
            const contentPreview = post.content.length > 50 
                ? post.content.substring(0, 50) + '...' 
                : post.content;
                
            return `
                <a href="pages/post-detail.html?id=${post.id}" class="post-item">
                    <div class="post-item-content">
                        <h3 class="post-title">${post.title}</h3>
                        <p class="post-preview">${contentPreview}</p>
                        <div class="post-meta">
                            <div class="post-category">
                                <i class="bi ${categoryInfo.icon}"></i>
                                <span>${categoryInfo.name}</span>
                            </div>
                            <div class="post-stats">
                                <span><i class="bi bi-person"></i> ${post.author}</span>
                                <span><i class="bi bi-eye"></i> ${post.views}</span>
                                <span><i class="bi bi-hand-thumbs-up"></i> ${post.likes}</span>
                                <span><i class="bi bi-calendar"></i> ${post.date}</span>
                            </div>
                        </div>
                    </div>
                </a>
            `;
        }).join('');
    } catch (error) {
        console.error('加载热门帖子失败:', error);
        const postsList = document.getElementById('postsList');
        if (postsList) {
            postsList.innerHTML = '<div class="text-center text-danger">加载热门帖子失败</div>';
        }
    }
}

// 加载最近观看
async function loadRecentViews() {
    try {
        const viewsGrid = document.getElementById('viewsGrid');
        const views = await contentAPI.getRecentViews();
        
        if (!views || views.length === 0) {
            viewsGrid.innerHTML = '<div class="text-center">暂无最近观看记录</div>';
            return;
        }
        
        viewsGrid.innerHTML = views.map(view => `
            <div class="view-card">
                <img src="${view.image}" alt="${view.title}">
                <h3>${view.title}</h3>
                <div class="view-date">${view.date}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载最近观看失败:', error);
        throw error;
    }
}

// 添加首页课程搜索事件
function addHomeSearchEvent() {
    const searchBtn = document.getElementById('homeSearchBtn');
    const searchInput = document.getElementById('homeCourseSearch');
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                window.location.href = `pages/courses.html?search=${encodeURIComponent(query)}`;
            }
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    window.location.href = `pages/courses.html?search=${encodeURIComponent(query)}`;
                }
            }
        });
    }
}

// 加载热门课程
async function loadHotCourses() {
    try {
        const coursesGrid = document.getElementById('coursesGrid');
        if (!coursesGrid) return;
        
        // 模拟课程数据
        const mockCourses = [
            {
                id: 1,
                title: '高等数学(上)',
                teacher: '张明教授',
                rating: 4.8,
                department: '数学学院',
                category: '必修',
                campus: '中心校区'
            },
            {
                id: 2,
                title: '数据结构与算法',
                teacher: '李华教授',
                rating: 4.9,
                department: '计算机学院',
                category: '必修',
                campus: '东校区'
            },
            {
                id: 3,
                title: '大学英语(三)',
                teacher: '王丽副教授',
                rating: 4.5,
                department: '外国语学院',
                category: '必修',
                campus: '南校区'
            },
            {
                id: 4,
                title: '人工智能导论',
                teacher: '刘强教授',
                rating: 4.7,
                department: '计算机学院',
                category: '选修',
                campus: '中心校区'
            }
        ];
        
        // 渲染课程卡片
        coursesGrid.innerHTML = mockCourses.map(course => {
            // 生成星级评分HTML
            const ratingStars = generateStars(course.rating);
            
            return `
            <div class="home-course-card" data-id="${course.id}">
                <div class="home-course-card-content">
                    <h3 class="home-course-title">${course.title}</h3>
                    <div class="home-course-teacher">${course.teacher}</div>
                    <div class="home-course-rating">
                        <div class="stars">${ratingStars}</div>
                        <span class="rating-score">${course.rating}</span>
                    </div>
                    <div class="course-meta">
                        <span class="meta-item"><i class="bi bi-building"></i> ${course.department}</span>
                        <span class="meta-item"><i class="bi bi-geo-alt"></i> ${course.campus}</span>
                    </div>
                </div>
            </div>
            `;
        }).join('');
        
        // 添加点击事件
        const courseCards = document.querySelectorAll('.home-course-card');
        courseCards.forEach(card => {
            card.addEventListener('click', () => {
                const courseId = card.dataset.id;
                window.location.href = `pages/course-detail.html?id=${courseId}`;
            });
        });
    } catch (error) {
        console.error('加载热门课程失败:', error);
        throw error;
    }
}

// 生成星级评分HTML
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let starsHtml = '';
    
    // 添加满星
    for (let i = 0; i < fullStars; i++) {
        starsHtml += '<i class="bi bi-star-fill"></i>';
    }
    
    // 添加半星（如果有）
    if (hasHalfStar) {
        starsHtml += '<i class="bi bi-star-half"></i>';
    }
    
    // 添加空星
    for (let i = 0; i < emptyStars; i++) {
        starsHtml += '<i class="bi bi-star"></i>';
    }
    
    return starsHtml;
} 