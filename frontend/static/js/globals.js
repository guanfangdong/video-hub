// globals.js - 全局状态管理和DOM元素引用

// ===== 全局状态变量 =====
export let appState = {
    selectedPath: '',
    currentFilter: 'all',
    currentDirectory: '',
    allDirectories: [],
    directoryTree: {}, // 新增：目录树结构
    
    // 分页状态
    currentPage: 1,
    itemsPerPage: 25,
    totalVideos: 0,
    totalPages: 1,

    // Windows风格文件夹导航相关
    currentPath: '',
    navigationHistory: [],
    navigationIndex: -1,
    currentViewMode: 'grid'
};

export function updateAppState(newState) {
    Object.assign(appState, newState);
}

// ===== DOM 元素引用 =====
export const DOM = {
    // 主要界面元素
    videoGrid: null,
    loadingSpinner: null,
    formMessage: null,
    // --- START: 关键修复 ---
    paginationControls: null, // 添加分页容器的引用
    // --- END: 关键修复 ---
    
    // 模态窗口元素
    folderBrowserModal: null,
    folderList: null,
    selectedPathDiv: null,
    
    // 按钮元素
    browseFolderBtn: null,
    addPathBtn: null,
    closeModalBtn: null,
    cancelSelectionBtn: null,
    selectCurrentBtn: null,
    
    // 筛选按钮
    showAllBtn: null,
    showFavoritesBtn: null,
    directoryBreadcrumbContainer: null,
    videoCount: null,
    
    // 导航相关DOM元素
    goBackBtn: null,
    goForwardBtn: null,
    goUpBtn: null,
    refreshBtn: null,
    listViewBtn: null,
    gridViewBtn: null,
    breadcrumbNav: null,
    folderLoading: null,
    itemCount: null,
    currentSelection: null
};

// 初始化DOM引用
export function initializeDOMReferences() {
    DOM.videoGrid = document.getElementById('video-grid');
    DOM.loadingSpinner = document.getElementById('loading-spinner');
    DOM.formMessage = document.getElementById('form-message');
    // --- START: 关键修复 ---
    DOM.paginationControls = document.getElementById('pagination-controls'); // 获取分页容器
    // --- END: 关键修复 ---
    
    DOM.folderBrowserModal = document.getElementById('folder-browser-modal');
    DOM.folderList = document.getElementById('folder-list');
    DOM.selectedPathDiv = document.getElementById('selected-path');
    
    DOM.browseFolderBtn = document.getElementById('browse-folder-btn');
    DOM.addPathBtn = document.getElementById('add-path-btn');
    DOM.closeModalBtn = document.getElementById('close-modal-btn');
    DOM.cancelSelectionBtn = document.getElementById('cancel-selection-btn');
    DOM.selectCurrentBtn = document.getElementById('select-current-btn');
    
    DOM.showAllBtn = document.getElementById('show-all-btn');
    DOM.showFavoritesBtn = document.getElementById('show-favorites-btn');
    DOM.directoryBreadcrumbContainer = document.getElementById('directory-breadcrumb-container');
    DOM.videoCount = document.getElementById('video-count');
    
    DOM.goBackBtn = document.getElementById('go-back-btn');
    DOM.goForwardBtn = document.getElementById('go-forward-btn');
    DOM.goUpBtn = document.getElementById('go-up-btn');
    DOM.refreshBtn = document.getElementById('refresh-btn');
    DOM.listViewBtn = document.getElementById('list-view-btn');
    DOM.gridViewBtn = document.getElementById('grid-view-btn');
    DOM.breadcrumbNav = document.getElementById('breadcrumb-nav');
    DOM.folderLoading = document.getElementById('folder-loading');
    DOM.itemCount = document.getElementById('item-count');
    DOM.currentSelection = document.getElementById('current-selection');
}
