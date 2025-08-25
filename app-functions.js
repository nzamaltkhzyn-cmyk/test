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
            const currentView = document.querySelector('.view:not(.hidden)');
            if (currentView.id === 'folder-content-view') {
                showView(document.getElementById('main-view'));
            } else if (currentView.id === 'media-viewer') {
                // Determine which view to go back to from media viewer
                // If we came from a folder, go back to it, otherwise main view
                if (currentFolderId) {
                    showView(document.getElementById('folder-content-view'));
                } else {
                    // This case might happen if media viewer was opened from recent/favorites
                    // For simplicity, go back to main view or the last active nav item
                    const activeNavItem = document.querySelector('.bottom-nav .nav-item.active');
                    if (activeNavItem) {
                        navigateToView(activeNavItem.dataset.view);
                    } else {
                        showView(document.getElementById('main-view'));
                    }
                }
            } else {
                showView(document.getElementById('main-view')); // Default back to main
            }
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
    // إخفاء مشغل الوسائط والنوافذ المنبثقة
    document.getElementById('media-viewer').classList.add('hidden');
    document.getElementById('folder-modal').classList.add('hidden');
    document.getElementById('file-modal').classList.add('hidden');
    document.getElementById('change-password-modal').classList.add('hidden');


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
        } else if (viewType === 'folders') {
            fetchFolders(); // Re-fetch folders when navigating back to main view
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
            name: fileData.name,
            type: fileData.type,
            file_path: fileData.file_path,
            content: fileData.content,
            favoritedAt: new Date().toISOString()
        });
        // Add to Supabase favorites table
        supabase.from('favorites').insert({ user_id: currentUser.id, file_id: fileId })
            .then(({ error }) => {
                if (error) console.error('Error adding to Supabase favorites:', error);
            });
    } else {
        // إزالة من المفضلة
        favorites.splice(index, 1);
        // Remove from Supabase favorites table
        supabase.from('favorites').delete().eq('user_id', currentUser.id).eq('file_id', fileId)
            .then(({ error }) => {
                if (error) console.error('Error removing from Supabase favorites:', error);
            });
    }

    // حفظ في localStorage
    localStorage.setItem('favorites', JSON.stringify(favorites));

    // تحديث واجهة المستخدم (زر المفضلة في مشغل الوسائط)
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

async function loadFavorites() {
    showLoading();
    const favoritesListEl = document.getElementById('favorites-list');
    if (!favoritesListEl) return;

    favoritesListEl.innerHTML = '';

    // Fetch favorites from Supabase
    const { data: supabaseFavorites, error: favError } = await supabase
        .from('favorites')
        .select('file_id, files(*)') // Select file details from the files table
        .eq('user_id', currentUser.id)
        .order('favorited_at', { ascending: false });

    if (favError) {
        console.error('Error loading favorites from Supabase:', favError);
        favoritesListEl.innerHTML = '<p class="error">حدث خطأ في تحميل المفضلة</p>';
        hideLoading();
        return;
    }

    if (!supabaseFavorites || supabaseFavorites.length === 0) {
        favoritesListEl.innerHTML = '<p class="empty-state">لا توجد عناصر في المفضلة</p>';
        hideLoading();
        return;
    }

    // Update local favorites list from Supabase data
    favorites = supabaseFavorites.map(fav => ({
        id: fav.files.id,
        name: fav.files.name,
        type: fav.files.type,
        file_path: fav.files.file_path,
        content: fav.files.content,
        favoritedAt: fav.favorited_at
    }));
    localStorage.setItem('favorites', JSON.stringify(favorites));


    supabaseFavorites.forEach(fav => {
        if (fav.files) { // Ensure file data exists
            const fileEl = createFileCard(fav.files, true); // Pass true for isFavorite
            favoritesListEl.appendChild(fileEl);
        }
    });
    hideLoading();
}

// ===== إدارة العناصر الحديثة =====
async function loadRecentFiles() {
    showLoading();
    const recentList = document.getElementById('recent-list');
    if (!recentList) return;

    // جلب آخر 20 ملفاً من Supabase
    const { data: files, error } = await supabase.from('files')
        .select('*')
        .eq('user_id', currentUser.id) // Only show current user's recent files
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error loading recent files:', error);
        recentList.innerHTML = '<p class="error">حدث خطأ في تحميل العناصر الحديثة</p>';
        hideLoading();
        return;
    }

    recentList.innerHTML = '';

    if (files.length === 0) {
        recentList.innerHTML = '<p class="empty-state">لا توجد عناصر حديثة</p>';
        hideLoading();
        return;
    }

    files.forEach(file => {
        const fileEl = createFileCard(file, favorites.some(fav => fav.id === file.id)); // Check if it's favorited
        recentList.appendChild(fileEl);
    });
    hideLoading();
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

    // Event listener for theme select
    document.getElementById('theme-select').addEventListener('change', (e) => {
        const selectedTheme = e.target.value;
        document.body.classList.remove('theme-light', 'theme-dark');
        if (selectedTheme === 'auto') {
            // Implement auto theme logic (e.g., based on system preference)
            // For now, default to light if auto is selected
            document.body.classList.add('theme-light');
            localStorage.setItem('theme', 'light'); // Save 'light' for auto
        } else {
            document.body.classList.add(`theme-${selectedTheme}`);
            localStorage.setItem('theme', selectedTheme);
        }
        // Update all theme toggle buttons
        const themeToggleButtons = document.querySelectorAll('#theme-toggle, #theme-toggle-inner, #theme-toggle-fav, #theme-toggle-recent, #theme-toggle-settings');
        themeToggleButtons.forEach(btn => {
            btn.innerHTML = selectedTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        });
    });
}

function calculateStorageUsage() {
    // هذه دالة محاكاة - في التطبيق الحقيقي يجب حساب المساحة الفعلية
    // يمكن استخدام Supabase Edge Functions لحساب المساحة الفعلية من Storage
    const used = Math.random() * 500 + 100; // بين 100 و 600 MB
    const available = 1000; // Total available storage (e.g., 1GB)

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

    // إخفاء جميع مشغلات المحتوى
    document.getElementById('image-viewer').classList.add('hidden');
    document.getElementById('video-viewer').classList.add('hidden');
    document.getElementById('pdf-viewer').classList.add('hidden');
    document.getElementById('text-viewer').classList.add('hidden');

    // تحميل المحتوى بناءً على نوع الملف
    switch (file.type) {
        case 'image':
            document.getElementById('image-viewer').classList.remove('hidden');
            document.getElementById('image-display').src = file.file_path;
            break;
        case 'video':
            document.getElementById('video-viewer').classList.remove('hidden');
            document.getElementById('video-display').src = file.file_path;
            document.getElementById('video-display').load(); // Load video
            break;
        case 'pdf':
            document.getElementById('pdf-viewer').classList.remove('hidden');
            document.getElementById('pdf-display').src = file.file_path;
            break;
        case 'note':
            document.getElementById('text-viewer').classList.remove('hidden');
            document.getElementById('text-display').textContent = file.content;
            break;
        case 'audio':
            // For audio, we can use the video player or a dedicated audio player
            document.getElementById('video-viewer').classList.remove('hidden'); // Re-use video player for audio
            const audioPlayer = document.getElementById('video-display');
            audioPlayer.src = file.file_path;
            audioPlayer.controls = true;
            audioPlayer.load();
            // You might want to hide video specific controls if using a custom player
            break;
        default:
            alert('نوع الملف غير مدعوم للعرض.');
            break;
    }
}

// Event listener for favorite button in media viewer
document.getElementById('favorite-media').addEventListener('click', () => {
    if (currentMediaFile) {
        const isFavorited = toggleFavorite(currentMediaFile.id, currentMediaFile);
        // alert(isFavorited ? 'تمت الإضافة إلى المفضلة!' : 'تمت الإزالة من المفضلة!'); // Removed alert for smoother UX
        updateFavoriteButton(currentMediaFile.id); // Ensure button updates immediately
    }
});

// Event listener for download button in media viewer
document.getElementById('download-media').addEventListener('click', () => {
    if (currentMediaFile && currentMediaFile.file_path) {
        const link = document.createElement('a');
        link.href = currentMediaFile.file_path;
        link.download = currentMediaFile.name; // Suggest original file name
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        alert('لا يوجد ملف قابل للتنزيل.');
    }
});


// ===== وظائف مساعدة لإنشاء بطاقات الملفات/المجلدات =====
function createFileCard(file, isFavorite = false) {
    let contentPreview = '';
    let icon = '📄'; // Default icon
    let fileActions = '';
    let cardClass = 'card';

    switch (file.type) {
        case 'note':
            contentPreview = file.content ? file.content.substring(0, 100) + (file.content.length > 100 ? '...' : '') : 'ملاحظة نصية';
            icon = '<i class="fas fa-file-alt"></i>';
            break;
        case 'image':
            contentPreview = 'صورة';
            icon = '<i class="fas fa-image"></i>';
            break;
        case 'video':
            contentPreview = 'فيديو';
            icon = '<i class="fas fa-video"></i>';
            break;
        case 'pdf':
            contentPreview = 'ملف PDF';
            icon = '<i class="fas fa-file-pdf"></i>';
            break;
        case 'audio':
            contentPreview = 'ملف صوتي';
            icon = '<i class="fas fa-file-audio"></i>';
            break;
        default:
            contentPreview = 'ملف غير معروف';
            icon = '<i class="fas fa-file"></i>';
            break;
    }

    // Add favorite button to file cards
    const favoriteIconClass = isFavorite ? 'fas' : 'far'; // Solid star if favorited, outline if not
    fileActions = `
        <button class="favorite-file" data-id="${file.id}"><i class="${favoriteIconClass} fa-star"></i></button>
        <button class="delete-file" data-id="${file.id}" data-path="${file.file_path || ''}">🗑️</button>
    `;

    const fileEl = document.createElement('div');
    fileEl.className = cardClass;
    fileEl.dataset.id = file.id;
    fileEl.dataset.name = file.name;
    fileEl.dataset.type = file.type;
    fileEl.dataset.path = file.file_path || '';
    fileEl.dataset.content = file.content || ''; // Store content for notes

    fileEl.innerHTML = `
        <h4>${icon} ${file.name}</h4>
        <p>${contentPreview}</p>
        <div class="card-footer">
            <span>${new Date(file.created_at).toLocaleDateString()}</span>
            <div class="card-actions">
                ${fileActions}
            </div>
        </div>
    `;

    return fileEl;
}
