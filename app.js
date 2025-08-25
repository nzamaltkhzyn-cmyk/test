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
        let contentPreview = '';
        let icon = '📄'; // Default icon
        switch (file.type) {
            case 'note':
                contentPreview = file.content.substring(0, 100) + '...';
                icon = '📝';
                break;
            case 'image':
                contentPreview = 'صورة';
                icon = '🖼️';
                break;
            case 'video':
                contentPreview = 'فيديو';
                icon = '🎬';
                break;
            case 'pdf':
                contentPreview = 'ملف PDF';
                icon = '📑';
                break;
        }

        const fileEl = document.createElement('div');
        fileEl.className = 'card';
        fileEl.innerHTML = `
             <h4>${icon} ${file.name}</h4>
             <p>${contentPreview}</p>
             <div class="card-footer">
                <span>${new Date(file.created_at).toLocaleDateString()}</span>
                <div class="card-actions">
                    <button class="delete-file" data-id="${file.id}" data-path="${file.file_path || ''}">🗑️</button>
                </div>
            </div>
        `;
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
});

fileTypeSelect.addEventListener('change', () => {
    if (fileTypeSelect.value === 'note') {
        noteContentWrapper.classList.remove('hidden');
        fileUploadWrapper.classList.add('hidden');
    } else {
        noteContentWrapper.classList.add('hidden');
        fileUploadWrapper.classList.remove('hidden');
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
        const filePath = `${currentUser.id}/${currentFolderId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, file);
        if (uploadError) {
            alert('خطأ في رفع الملف: ' + uploadError.message);
            hideLoading();
            return;
        }
        fileData.file_path = filePath;
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
    if (e.target.classList.contains('delete-file')) {
        const id = e.target.dataset.id;
        const path = e.target.dataset.path;

        if (confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
            showLoading();
            // 1. Delete file from storage if it exists
            if (path) {
                const { error: storageError } = await supabase.storage.from('uploads').remove([path]);
                if (storageError) console.error('Error deleting from storage:', storageError.message);
            }
            // 2. Delete record from database
            const { error: dbError } = await supabase.from('files').delete().eq('id', id);
            if (dbError) alert(dbError.message);
            else fetchFiles(currentFolderId);
            hideLoading();
        }
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
    });
});
window.addEventListener('click', (e) => {
    if (e.target == folderModal) folderModal.classList.add('hidden');
    if (e.target == fileModal) fileModal.classList.add('hidden');
});

// -- Initial Load --
document.addEventListener('DOMContentLoaded', () => {
    checkUser();
    setupNavigation(); // ★★★ التعديل هنا ★★★
});
