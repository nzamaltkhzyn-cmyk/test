// app-functions.js
// هذا الملف يحتوي على جميع الوظائف الإضافية للتطبيق

// ===== متغيرات عامة =====
let currentMediaFile = null;
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

// ===== إدارة التنقل بين الصفحات =====
function setupNavigation() {
    // إعداد التنقل السفلي
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewType = item.dataset.view;
            navigateToView(viewType);
        });
    });

    // إعداد أزرار العودة
    document.querySelectorAll('.back-button').forEach(btn => {
        btn.addEventListener('click', () => {
            history.back();
        });
    });
}

function navigateToView(viewType) {
    const views = {
        'folders': document.getElementById('main-view'),
        'recent': document.getElementById('recent-view'),
        'favorites': document.getElementById('favorites-view'),
        'settings': document.getElementById('settings-view')
    };

    // إخفاء جميع الصفحات
    Object.values(views).forEach(view => view.classList.add('hidden'));

    // إظهار الصفحة المطلوبة
    if (views[viewType]) {
        views[viewType].classList.remove('hidden');
        
        // تحميل المحتوى إذا لزم الأمر
        if (viewType === 'favorites') {
            loadFavorites();
        } else if (viewType === 'recent') {
            loadRecentFiles();
        } else if (viewType === 'settings') {
            loadSettings();
        }
    }

    // تحديث حالة التنقل النشط
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === viewType) {
            item.classList.add('active');
        }
    });
}

// ===== إدارة المفضلات =====
function toggleFavorite(fileId, fileData) {
    const index = favorites.findIndex(fav => fav.id === fileId);
    
    if (index === -1) {
        // إضافة إلى المفضلة
        favorites.push({
            id: fileId,
            ...fileData,
            favoritedAt: new Date().toISOString()
        });
    } else {
        // إزالة من المفضلة
        favorites.splice(index, 1);
    }
    
    // حفظ في localStorage
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    // تحديث واجهة المستخدم
    updateFavoriteButton(fileId);
    
    return index === -1; // إرجاع true إذا تمت الإضافة، false إذا تمت الإزالة
}

function updateFavoriteButton(fileId) {
    const favoriteBtn = document.getElementById('favorite-media');
    if (favoriteBtn) {
        const isFavorite = favorites.some(fav => fav.id === fileId);
        favoriteBtn.innerHTML = isFavorite ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
    }
}

function loadFavorites() {
    const favoritesList = document.getElementById('favorites-list');
    if (!favoritesList) return;

    favoritesList.innerHTML = '';

    if (favorites.length === 0) {
        favoritesList.innerHTML = '<p class="empty-state">لا توجد عناصر في المفضلة</p>';
        return;
    }

    favorites.forEach(file => {
        const fileEl = createFileCard(file, true);
        favoritesList.appendChild(fileEl);
    });
}

// ===== إدارة العناصر الحديثة =====
function loadRecentFiles() {
    const recentList = document.getElementById('recent-list');
    if (!recentList) return;

    // جلب آخر 20 ملفاً من Supabase
    supabase.from('files')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data: files, error }) => {
            if (error) {
                console.error('Error loading recent files:', error);
                recentList.innerHTML = '<p class="error">حدث خطأ في تحميل العناصر الحديثة</p>';
                return;
            }

            recentList.innerHTML = '';

            if (files.length === 0) {
                recentList.innerHTML = '<p class="empty-state">لا توجد عناصر حديثة</p>';
                return;
            }

            files.forEach(file => {
                const fileEl = createFileCard(file, false);
                recentList.appendChild(fileEl);
            });
        });
}

// ===== إدارة الإعدادات =====
function loadSettings() {
    // تحميل إعدادات المستخدم
    const userData = JSON.parse(localStorage.getItem('current_user'));
    if (userData) {
        document.getElementById('user-email-settings').textContent = userData.email;
    }

    // تحميل إعدادات المظهر
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.getElementById('theme-select').value = savedTheme;

    // حساب مساحة التخزين (محاكاة)
    calculateStorageUsage();
}

function calculateStorageUsage() {
    // هذه دالة محاكاة - في التطبيق الحقيقي يجب حساب المساحة الفعلية
    const used = Math.random() * 500 + 100; // بين 100 و 600 MB
    const available = 1000;
    
    document.getElementById('storage-used').textContent = `${used.toFixed(1)} MB`;
    document.getElementById('storage-available').textContent = `${available} MB`;
}

// ===== مشغل الوسائط =====
function openMediaViewer(file) {
    currentMediaFile = file;
    
    // إظهار مشغل الوسائط
    document.getElementById('media-viewer').classList.remove('hidden');
    document.getElementById('media-title').textContent = file.name;
    
    // تحديث زر المفضلة
    updateFavoriteButton(file.id);
    
    // تحميل المحتوى بناءً على نوع الملف
    const mediaTypes = {
        'image': showImage,
        'video': showVideo,
        'pdf': showPDF,
        'note': showText,
        'audio': showAudio
    };
    
    if (mediaTypes[file.type]) {
        mediaTypes[file
