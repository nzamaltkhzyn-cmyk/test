// mobile-interactions.js
// هذا الملف مخصص للتفاعلات الخاصة بالواجهة المحمولة، مثل شريط التنقل السفلي.

document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // إزالة الفئة 'active' من جميع العناصر
            navItems.forEach(nav => nav.classList.remove('active'));
            // إضافة الفئة 'active' للعنصر الذي تم النقر عليه
            item.classList.add('active');

            // هنا يمكنك إضافة منطق لتبديل طرق العرض بناءً على data-view
            const viewType = item.dataset.view;
            console.log(`Navigating to: ${viewType} view`);

            // مثال: إذا كان لديك طرق عرض مختلفة (مثل مجلدات، حديثة، مفضلة)
            // يمكنك إخفاء وإظهار الأقسام المناسبة هنا.
            // بما أن app.js يدير views، قد تحتاج إلى دمج هذا المنطق معه
            // أو استخدام أحداث مخصصة.
            // For now, it's just a visual active state.
        });
    });
});
