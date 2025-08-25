// app.js

// -- DOM Elements --
// Views
const authView = document.getElementById('auth-view');
const mainView = document.getElementById('main-view');
const folderContentView = document.getElementById('folder-content-view');

// Auth
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');
const signupContainer = document.getElementById('signup-container');
const logoutButtons = document.querySelectorAll('#logout-button, #logout-button-inner');

// Folders
const foldersList = document.getElementById('folders-list');
const addFolderButton = document.getElementById('add-folder-button');
const folderModal = document.getElementById('folder-modal');
const folderForm = document.getElementById('folder-form');
const folderIdInput = document.getElementById('folder-id');
const folderNameInput = document.getElementById('folder-name');
const folderDescriptionInput = document.getElementById('folder-description');
const modalTitle = document.getElementById('modal-title');

// Files
const backToFoldersButton = document.getElementById('back-to-folders-button');
const currentFolderName = document.getElementById('current-folder-name');
const filesList = document.getElementById('files-list');
const addFileButton = document.getElementById('add-file-button');
const fileModal = document.getElementById('file-modal');
const fileForm = document.getElementById('file-form');
const fileNameInput = document.getElementById('file-name');
const fileTypeSelect = document.getElementById('file-type');
const noteContentWrapper = document.getElementById('note-content-wrapper');
const noteContentInput = document.getElementById('note-content');
const fileUploadWrapper = document.getElementById('file-upload-wrapper');
const fileUploadInput = document.getElementById('file-upload');

// Search
const searchInput = document.getElementById('search-input');

// General
const loadingSpinner = document.getElementById('loading-spinner');
const closeButtons = document.querySelectorAll('.close-button');

// -- App State --
let currentUser = null;
let currentFolderId = null;

// -- Utility Functions --
const showView = (view) => {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    view.classList.remove('hidden');
};

const showLoading = () => loadingSpinner.classList.remove('hidden');
const hideLoading = () => loadingSpinner.classList.add('hidden');

// -- Authentication --
const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        showView(mainView);
        fetchFolders();
    } else {
        currentUser = null;
        showView(authView);
    }
};

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else checkUser();
    hideLoading();
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert('تم إرسال رابط تأكيد إلى بريدك الإلكتروني!');
    hideLoading();
});

logoutButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        checkUser();
    });
});

showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    signupContainer.style.display = 'block';
    loginForm.parentElement.style.display = 'none';
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    signupContainer.style.display = 'none';
    loginForm.parentElement.style.display = 'block';
});

// -- Folder Management --
const fetchFolders = async (searchTerm = '') => {
    showLoading();
    let query = supabase.from('folders').select('*').order('created_at', { ascending: false });
    if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
    }
    const { data: folders, error } = await query;

    if (error) console.error('Error fetching folders:', error);
    else renderFolders(folders);
    hideLoading();
};

const renderFolders = (folders) => {
    foldersList.innerHTML = '';
    if (!folders || folders.length === 0) {
        foldersList.innerHTML = '<p>لا يوجد مجلدات بعد. قم بإنشاء مجلد جديد.</p>';
        return;
    }
    folders.forEach(folder => {
        const folderEl = document.createElement('div');
        folderEl.className = 'card';
        folderEl.dataset.id = folder.id;
        folderEl.dataset.name = folder.name;
        folderEl.innerHTML = `
            <h4>${folder.name}</h4>
            <p>${folder.description || 'لا يوجد وصف'}</p>
            <div class="card-footer">
                <span>${new Date(folder.created_at).toLocaleDateString()}</span>
                <div class="card-actions">
                    <button class="edit-folder" data-id="${folder.id}">✏️</button>
                    <button class="delete-folder" data-id="${folder.id}">🗑️</button>
                </div>
            </div>
        `;
        folderEl.addEventListener('click', (e) => {
            if (!e.target.closest('.card-actions')) {
                openFolder(folder.id, folder.name);
            }
        });
        foldersList.appendChild(folderEl);
    });
};

addFolderButton.addEventListener('click', () => {
    folderForm.reset();
    folderIdInput.value = '';
    modalTitle.textContent = 'مجلد جديد';
    folderModal.classList.remove('hidden');
});

folderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();
    const folderData = {
        name: folderNameInput.value,
        description: folderDescriptionInput.value,
        user_id: currentUser.id
    };

    let error;
    if (folderIdInput.value) { // Update
        ({ error } = await supabase.from('folders').update(folderData).eq('id', folderIdInput.value));
    } else { // Create
        ({ error } = await supabase.from('folders').insert(folderData));
    }

    if (error) alert(error.message);
    else {
        folderModal.classList.add('hidden');
        fetchFolders();
    }
    hideLoading();
});

foldersList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('edit-folder')) {
        const id = e.target.dataset.id;
        const { data: folder, error } = await supabase.from('folders').select('*').eq('id', id).single();
        if (folder) {
            folderIdInput.value = folder.id;
            folderNameInput.value = folder.name;
            folderDescriptionInput.value = folder.description;
            modalTitle.textContent = 'تعديل المجلد';
            folderModal.classList.remove('hidden');
        }
    }
    if (e.target.classList.contains('delete-folder')) {
        const id = e.target.dataset.id;
        if (confirm('هل أنت متأكد من حذف هذا المجلد وكل محتوياته؟')) {
            showLoading();
            const { error } = await supabase.from('folders').delete().eq('id', id);
            if (error) alert(error.message);
            else fetchFolders();
            hideLoading();
        }
    }
});


// -- File Management --
const openFolder = (folderId, folderName) => {
    currentFolderId = folderId;
    showView(folderContentView);
    document.getElementById('folder-title-placeholder').textContent = folderName; // Update header title
    currentFolderName.textContent = `محتويات مجلد: ${folderName}`;
    fetchFiles(folderId);
};

const fetchFiles = async (folderId) => {
    showLoading();
    const { data: files, error } = await supabase.from('files').select('*').eq('folder_id', folderId).order('created_at', { ascending: false });
    if (error) console.error('Error fetching files:', error);
    else renderFiles(files);
    hideLoading();
};

const renderFiles = (files) => {
    filesList.innerHTML = '';
    if (!files || files.length === 0) {
        filesList.innerHTML = '<p>هذا المجلد فارغ. قم بإضافة عنصر جديد.</p>';
        return;
    }
    files.forEach(file => {
        const fileEl = createFileCard(file, false); // Use createFileCard from app-functions.js
        filesList.appendChild(fileEl);
    });
};

backToFoldersButton.addEventListener('click', () => {
    currentFolderId = null;
    showView(mainView);
});

addFileButton.addEventListener('click', () => {
    fileForm.reset();
    fileModal.classList.remove('hidden');
    // Reset form state
    noteContentWrapper.classList.remove('hidden');
    fileUploadWrapper.classList.add('hidden');
    fileTypeSelect.value = 'note'; // Default to note
    fileUploadInput.value = ''; // Clear selected file
});

fileTypeSelect.addEventListener('change', () => {
    const selectedType = fileTypeSelect.value;
    if (selectedType === 'note') {
        noteContentWrapper.classList.remove('hidden');
        fileUploadWrapper.classList.add('hidden');
        fileUploadInput.removeAttribute('accept');
    } else {
        noteContentWrapper.classList.add('hidden');
        fileUploadWrapper.classList.remove('hidden');
        // Set accept attribute based on file type
        switch (selectedType) {
            case 'image':
                fileUploadInput.setAttribute('accept', 'image/*');
                break;
            case 'video':
                fileUploadInput.setAttribute('accept', 'video/*');
                break;
            case 'pdf':
                fileUploadInput.setAttribute('accept', 'application/pdf');
                break;
            case 'audio':
                fileUploadInput.setAttribute('accept', 'audio/*');
                break;
            default:
                fileUploadInput.removeAttribute('accept');
        }
    }
});

fileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();

    const fileType = fileTypeSelect.value;
    const fileName = fileNameInput.value;
    let fileData = {
        name: fileName,
        type: fileType,
        folder_id: currentFolderId,
        user_id: currentUser.id
    };

    if (fileType === 'note') {
        fileData.content = noteContentInput.value;
    } else {
        const file = fileUploadInput.files[0];
        if (!file) {
            alert('الرجاء اختيار ملف للرفع.');
            hideLoading();
            return;
        }
        const filePath = `${currentUser.id}/${currentFolderId || 'root'}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, file);
        if (uploadError) {
            alert('خطأ في رفع الملف: ' + uploadError.message);
            hideLoading();
            return;
        }
        // Get public URL for the uploaded file
        const { data: publicURLData } = supabase.storage.from('uploads').getPublicUrl(filePath);
        fileData.file_path = publicURLData.publicUrl;
    }

    const { error: insertError } = await supabase.from('files').insert(fileData);
    if (insertError) {
        alert('خطأ في حفظ البيانات: ' + insertError.message);
    } else {
        fileModal.classList.add('hidden');
        fetchFiles(currentFolderId);
    }
    hideLoading();
});

filesList.addEventListener('click', async (e) => {
    const target = e.target;
    const card = target.closest('.card');
    if (!card) return;

    const fileId = card.dataset.id;
    const fileType = card.dataset.type;
    const fileName = card.dataset.name;
    const filePath = card.dataset.path;
    const fileContent = card.dataset.content;

    const file = {
        id: fileId,
        name: fileName,
        type: fileType,
        file_path: filePath,
        content: fileContent
    };

    if (target.classList.contains('delete-file')) {
        if (confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
            showLoading();
            // 1. Delete file from storage if it exists and is not a note
            if (file.file_path && file.type !== 'note') {
                // Extract path from public URL
                const pathSegments = file.file_path.split('/');
                const storagePath = pathSegments.slice(pathSegments.indexOf('public') + 1).join('/');
                const { error: storageError } = await supabase.storage.from('uploads').remove([storagePath]);
                if (storageError) console.error('Error deleting from storage:', storageError.message);
            }
            // 2. Delete record from database
            const { error: dbError } = await supabase.from('files').delete().eq('id', file.id);
            if (dbError) alert(dbError.message);
            else fetchFiles(currentFolderId);
            hideLoading();
        }
    } else if (target.classList.contains('favorite-file')) {
        // Toggle favorite status
        const isFavorited = toggleFavorite(file.id, file); // From app-functions.js
        alert(isFavorited ? 'تمت الإضافة إلى المفضلة!' : 'تمت الإزالة من المفضلة!');
        // Re-render the card to update the favorite icon
        const updatedCard = createFileCard(file, isFavorited);
        card.replaceWith(updatedCard);
    }
    else {
        // Open media viewer for the file
        openMediaViewer(file); // From app-functions.js
    }
});


// -- Search --
searchInput.addEventListener('input', (e) => {
    fetchFolders(e.target.value);
});


// -- Modal Closing Logic --
closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        folderModal.classList.add('hidden');
        fileModal.classList.add('hidden');
        document.getElementById('change-password-modal').classList.add('hidden');
    });
});
window.addEventListener('click', (e) => {
    if (e.target == folderModal) folderModal.classList.add('hidden');
    if (e.target == fileModal) fileModal.classList.add('hidden');
    if (e.target == document.getElementById('change-password-modal')) document.getElementById('change-password-modal').classList.add('hidden');
});

// -- Theme Toggle --
const themeToggleButtons = document.querySelectorAll('#theme-toggle, #theme-toggle-inner, #theme-toggle-fav, #theme-toggle-recent, #theme-toggle-settings');
themeToggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        document.body.classList.toggle('theme-dark');
        document.body.classList.toggle('theme-light');
        const currentTheme = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
        localStorage.setItem('theme', currentTheme);
        // Update icon
        btn.innerHTML = currentTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });
});

// Apply saved theme on load
const savedTheme = localStorage.getItem('theme') || 'light';
document.body.classList.add(`theme-${savedTheme}`);
themeToggleButtons.forEach(btn => {
    btn.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
});


// -- Change Password --
document.getElementById('change-password-btn').addEventListener('click', () => {
    document.getElementById('change-password-modal').classList.remove('hidden');
    document.getElementById('change-password-form').reset();
});

document.getElementById('change-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;

    if (newPassword !== confirmNewPassword) {
        alert('كلمة المرور الجديدة وتأكيدها غير متطابقين.');
        hideLoading();
        return;
    }

    // Supabase does not directly support changing password with current password for security reasons.
    // It usually involves sending a password reset email.
    // For simplicity in this example, we'll simulate a direct change (though not how Supabase works for security).
    // In a real app, you'd use: await supabase.auth.resetPasswordForEmail(currentUser.email);
    // and then the user follows a link.

    // For this demo, we'll just update the user directly (this is NOT secure for production)
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
        alert('خطأ في تغيير كلمة المرور: ' + error.message);
    } else {
        alert('تم تغيير كلمة المرور بنجاح!');
        document.getElementById('change-password-modal').classList.add('hidden');
    }
    hideLoading();
});


// -- Initial Load --
document.addEventListener('DOMContentLoaded', () => {
    checkUser();
    setupNavigation(); // From app-functions.js
});
