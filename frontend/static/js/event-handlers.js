// event-handlers.js - 事件监听器和处理函数

import { DOM } from './globals.js';
import { 
    openFolderBrowser, 
    closeFolderBrowser, 
    selectCurrentFolder,
    navigateBack,
    navigateForward,
    goUpDirectory,
    refreshCurrentFolder,
    switchViewMode
} from './folder-navigation.js';
import { setFilter, setDirectoryFilter } from './video-manager.js';
import { addSelectedPath } from './path-manager.js';
import { isKeyCombo } from './ui-utils.js';

// ===== 主要事件监听器设置 =====
export function setupEventListeners() {
    setupFolderBrowserEvents();
    setupNavigationEvents();
    setupFilterEvents();
    setupPathManagementEvents();
    setupKeyboardShortcuts();
    setupModalEvents();
    // 注意：您原来的文件中没有调用 setupWindowEvents，如果需要可以取消下面的注释
    // setupWindowEvents(); 
}

// ===== 文件夹浏览器事件 =====
function setupFolderBrowserEvents() {
    DOM.browseFolderBtn.addEventListener('click', openFolderBrowser);
    DOM.closeModalBtn.addEventListener('click', closeFolderBrowser);
    DOM.cancelSelectionBtn.addEventListener('click', closeFolderBrowser);
    DOM.selectCurrentBtn.addEventListener('click', selectCurrentFolder);
}

// ===== 导航事件 =====
function setupNavigationEvents() {
    DOM.goBackBtn.addEventListener('click', navigateBack);
    DOM.goForwardBtn.addEventListener('click', navigateForward);
    DOM.goUpBtn.addEventListener('click', goUpDirectory);
    DOM.refreshBtn.addEventListener('click', refreshCurrentFolder);
    
    DOM.listViewBtn.addEventListener('click', () => switchViewMode('list'));
    DOM.gridViewBtn.addEventListener('click', () => switchViewMode('grid'));
}

// ===== 筛选事件 =====
function setupFilterEvents() {
    DOM.showAllBtn.addEventListener('click', () => setFilter('all'));
    DOM.showFavoritesBtn.addEventListener('click', () => setFilter('favorites'));
    
    // --- START: FIX ---
    // 下面这行代码是导致错误的唯一原因，因为 'directory-filter' 元素已被面包屑导航替换。
    // 我们将其注释掉。新的面包屑导航的点击事件是在 path-manager.js 中动态创建时绑定的。
    /*
    DOM.directoryFilter.addEventListener('change', (e) => {
        setDirectoryFilter(e.target.value);
    });
    */
    // --- END: FIX ---
}

// ===== 路径管理事件 =====
function setupPathManagementEvents() {
    DOM.addPathBtn.addEventListener('click', addSelectedPath);
    // 注意：处理 rescan/remove 的事件监听器已移至 path-manager.js 内部，使用事件委托，这是更好的实践
}

// ===== 键盘快捷键 =====
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function handleKeyboardShortcuts(event) {
    // 只在文件夹浏览器打开时处理导航快捷键
    if (!DOM.folderBrowserModal.classList.contains('hidden')) {
        handleFolderBrowserShortcuts(event);
        return;
    }
    
    // 全局快捷键
    handleGlobalShortcuts(event);
}

function handleFolderBrowserShortcuts(event) {
    // 防止在输入框中触发快捷键
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }
    
    switch (event.key) {
        case 'Escape':
            event.preventDefault();
            closeFolderBrowser();
            break;
            
        case 'F5':
            event.preventDefault();
            refreshCurrentFolder();
            break;
            
        case 'Backspace':
            event.preventDefault();
            goUpDirectory();
            break;
            
        case 'Enter':
            event.preventDefault();
            selectCurrentFolder();
            break;
    }
    
    // Alt + 方向键导航
    if (event.altKey) {
        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault();
                navigateBack();
                break;
                
            case 'ArrowRight':
                event.preventDefault();
                navigateForward();
                break;
        }
    }
}

function handleGlobalShortcuts(event) {
    // Ctrl/Cmd + 组合键
    if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
            case 'o':
            case 'O':
                event.preventDefault();
                openFolderBrowser();
                break;
                
            case 'r':
            case 'R':
                event.preventDefault();
                window.location.reload();
                break;
        }
    }
    
    // 功能键
    switch (event.key) {
        case 'F1':
            event.preventDefault();
            showHelpDialog();
            break;
    }
}

// ===== 模态窗口事件 =====
function setupModalEvents() {
    // 点击外部关闭模态窗口
    DOM.folderBrowserModal.addEventListener('click', (e) => {
        if (e.target === DOM.folderBrowserModal) {
            closeFolderBrowser();
        }
    });
    
    // 防止模态窗口内部点击冒泡
    const modalContent = DOM.folderBrowserModal.querySelector('.bg-gray-800');
    if (modalContent) {
        modalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
}

// ===== 帮助对话框 =====
function showHelpDialog() {
    const helpContent = `
Video Hub - Keyboard Shortcuts

Global Shortcuts:
• Ctrl+O / Cmd+O: Open folder browser
• Ctrl+R / Cmd+R: Refresh page
• F1: Show this help dialog

Folder Browser (when open):
• Esc: Close folder browser
• F5: Refresh current folder
• Backspace: Go up one level
• Enter: Select current folder
• Alt+←: Go back
• Alt+→: Go forward

Navigation:
• Click on breadcrumbs to navigate
• Double-click folders to enter
• Use toolbar buttons for navigation

Tips:
• Use the view toggle for list/grid view
• Right-click for context menu (coming soon)
• Drag and drop support (coming soon)
    `.trim();
    
    // 注意：alert() 会阻塞页面，未来可以替换为更美观的UI模态框
    alert(helpContent);
}

// ===== 窗口事件 =====
export function setupWindowEvents() {
    // 窗口大小变化时的响应
    window.addEventListener('resize', handleWindowResize);
    
    // 页面可见性变化
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 页面卸载前的清理
    window.addEventListener('beforeunload', handleBeforeUnload);
}

function handleWindowResize() {
    // 响应式调整（如果需要的话）
    console.log('Window resized');
}

function handleVisibilityChange() {
    if (!document.hidden) {
        // 页面重新变为可见时，可以选择刷新数据
        console.log('Page became visible');
    }
}

function handleBeforeUnload(event) {
    // 如果有未保存的更改，可以提示用户
    // event.preventDefault();
    // event.returnValue = '';
}
