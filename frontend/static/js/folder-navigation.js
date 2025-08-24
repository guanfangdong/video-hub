// folder-navigation.js - Windows风格文件夹导航功能

import { appState, updateAppState, DOM } from './globals.js';
import { browseFolderContents } from './api-service.js';

// ===== 文件夹浏览器主要功能 =====
export async function openFolderBrowser() {
    updateAppState({
        navigationHistory: [],
        navigationIndex: -1,
        currentPath: ''
    });
    
    DOM.folderBrowserModal.classList.remove('hidden');
    updateCurrentSelection('None');
    
    await navigateToPath('');
}

export function closeFolderBrowser() {
    DOM.folderBrowserModal.classList.add('hidden');
    updateAppState({
        currentPath: '',
        navigationHistory: [],
        navigationIndex: -1
    });
}

export async function navigateToPath(path, addToHistory = true) {
    showFolderLoading(true);
    
    try {
        const data = await browseFolderContents(path);
        
        // 更新当前路径
        updateAppState({ currentPath: data.current_path });
        
        // 添加到导航历史
        if (addToHistory) {
            addToNavigationHistory(data.current_path);
        }
        
        // 更新界面
        updateBreadcrumbNavigation();
        updateNavigationButtons();
        renderFolderContents(data.items);
        updateCurrentSelection(data.current_path || 'Computer');
        
    } catch (error) {
        console.error('Error loading folder contents:', error);
        showFolderError(error.message);
    } finally {
        showFolderLoading(false);
    }
}

// ===== 导航历史管理 =====
function addToNavigationHistory(path) {
    const { navigationIndex, navigationHistory } = appState;
    
    if (navigationIndex === -1 || navigationHistory[navigationIndex] !== path) {
        const newHistory = navigationHistory.slice(0, navigationIndex + 1);
        newHistory.push(path);
        updateAppState({
            navigationHistory: newHistory,
            navigationIndex: newHistory.length - 1
        });
    }
}

export function navigateBack() {
    const { navigationIndex, navigationHistory } = appState;
    
    if (navigationIndex > 0) {
        const newIndex = navigationIndex - 1;
        updateAppState({ navigationIndex: newIndex });
        navigateToPath(navigationHistory[newIndex], false);
    }
}

export function navigateForward() {
    const { navigationIndex, navigationHistory } = appState;
    
    if (navigationIndex < navigationHistory.length - 1) {
        const newIndex = navigationIndex + 1;
        updateAppState({ navigationIndex: newIndex });
        navigateToPath(navigationHistory[newIndex], false);
    }
}

export function goUpDirectory() {
    const { currentPath } = appState;
    
    if (currentPath) {
        const pathParts = currentPath.split(/[/\\]/);
        pathParts.pop();
        const parentPath = pathParts.join('/');
        navigateToPath(parentPath);
    }
}

export function refreshCurrentFolder() {
    navigateToPath(appState.currentPath, false);
}

// ===== 面包屑导航 =====
export function updateBreadcrumbNavigation() {
    const { currentPath } = appState;
    DOM.breadcrumbNav.innerHTML = '';
    
    if (!currentPath) {
        const computerCrumb = createBreadcrumb('Computer', '', true);
        DOM.breadcrumbNav.appendChild(computerCrumb);
        return;
    }
    
    let pathParts;
    let isWindows = false;
    
    if (currentPath.match(/^[A-Z]:\\/i)) {
        isWindows = true;
        pathParts = currentPath.split(/[/\\]/);
    } else {
        pathParts = currentPath.split('/').filter(part => part);
    }
    
    // Computer根节点
    const computerCrumb = createBreadcrumb('Computer', '');
    DOM.breadcrumbNav.appendChild(computerCrumb);
    
    if (pathParts.length > 0) {
        DOM.breadcrumbNav.appendChild(createSeparator());
        
        let accumulatedPath = '';
        pathParts.forEach((part, index) => {
            if (index === 0 && isWindows) {
                accumulatedPath = part;
            } else {
                accumulatedPath += (accumulatedPath && !accumulatedPath.endsWith('/') ? '/' : '') + part;
            }
            
            const isLast = index === pathParts.length - 1;
            const crumb = createBreadcrumb(part, accumulatedPath, isLast);
            DOM.breadcrumbNav.appendChild(crumb);
            
            if (!isLast) {
                DOM.breadcrumbNav.appendChild(createSeparator());
            }
        });
    }
}

function createBreadcrumb(text, path, isActive = false) {
    const crumb = document.createElement('button');
    crumb.className = `px-2 py-1 rounded text-sm transition-colors ${
        isActive 
            ? 'bg-blue-100 text-blue-800 font-medium' 
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
    }`;
    crumb.textContent = text;
    
    if (!isActive) {
        crumb.addEventListener('click', () => navigateToPath(path));
    }
    
    return crumb;
}

function createSeparator() {
    const separator = document.createElement('span');
    separator.className = 'text-gray-400 mx-1';
    separator.innerHTML = '>';
    return separator;
}

// ===== 导航按钮状态更新 =====
export function updateNavigationButtons() {
    const { navigationIndex, navigationHistory, currentPath } = appState;
    
    DOM.goBackBtn.disabled = navigationIndex <= 0;
    DOM.goForwardBtn.disabled = navigationIndex >= navigationHistory.length - 1;
    DOM.goUpBtn.disabled = !currentPath;
}

// ===== 视图模式切换 =====
export function switchViewMode(mode) {
    updateAppState({ currentViewMode: mode });
    
    DOM.listViewBtn.classList.toggle('bg-gray-600', mode === 'list');
    DOM.gridViewBtn.classList.toggle('bg-gray-600', mode === 'grid');
    
    if (appState.currentPath !== undefined) {
        refreshCurrentFolder();
    }
}

// ===== 文件夹内容渲染 =====
export function renderFolderContents(items) {
    DOM.folderList.innerHTML = '';
    
    if (items.length === 0) {
        DOM.folderList.innerHTML = '<div class="text-center text-gray-400 py-12">This folder is empty</div>';
        updateItemCount(0);
        return;
    }
    
    if (appState.currentViewMode === 'list') {
        renderListView(items);
    } else {
        renderGridView(items);
    }
    
    updateItemCount(items.length);
}

function renderListView(items) {
    const listContainer = document.createElement('div');
    listContainer.className = 'divide-y divide-gray-700';
    
    items.forEach(item => {
        const listItem = document.createElement('div');
        listItem.className = 'flex items-center px-4 py-3 hover:bg-gray-800 cursor-pointer transition-colors group';
        
        listItem.innerHTML = `
            <div class="flex-shrink-0 mr-3">
                <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2v0"></path>
                </svg>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">
                    ${item.name}
                </p>
                <p class="text-xs text-gray-500 truncate">${item.path}</p>
            </div>
            <div class="flex-shrink-0">
                <svg class="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            </div>
        `;
        
        listItem.addEventListener('click', () => navigateToPath(item.path));
        listItem.addEventListener('dblclick', () => navigateToPath(item.path));
        
        listContainer.appendChild(listItem);
    });
    
    DOM.folderList.appendChild(listContainer);
}

function renderGridView(items) {
    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid grid-cols-4 gap-4 p-4';
    
    items.forEach(item => {
        const gridItem = document.createElement('div');
        gridItem.className = 'flex flex-col items-center p-3 hover:bg-gray-800 cursor-pointer transition-colors rounded-md group';
        
        gridItem.innerHTML = `
            <div class="mb-2">
                <svg class="w-12 h-12 text-blue-400 group-hover:text-blue-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2v0"></path>
                </svg>
            </div>
            <p class="text-sm text-gray-200 text-center truncate w-full group-hover:text-white transition-colors" title="${item.name}">
                ${item.name}
            </p>
        `;
        
        gridItem.addEventListener('click', () => navigateToPath(item.path));
        gridItem.addEventListener('dblclick', () => navigateToPath(item.path));
        
        gridContainer.appendChild(gridItem);
    });
    
    DOM.folderList.appendChild(gridContainer);
}

// ===== 辅助函数 =====
export function showFolderLoading(show) {
    DOM.folderLoading.classList.toggle('hidden', !show);
}

export function showFolderError(message) {
    DOM.folderList.innerHTML = `
        <div class="flex items-center justify-center h-32 text-red-400">
            <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
            <span>Error: ${message}</span>
        </div>
    `;
}

export function updateItemCount(count) {
    DOM.itemCount.textContent = `${count} item${count !== 1 ? 's' : ''}`;
}

export function updateCurrentSelection(path) {
    DOM.currentSelection.textContent = path || 'None';
}

export function selectCurrentFolder() {
    const { currentPath } = appState;
    
    if (currentPath) {
        updateAppState({ selectedPath: currentPath });
        DOM.selectedPathDiv.innerHTML = `<span class="text-green-400">${currentPath}</span>`;
        DOM.addPathBtn.disabled = false;
        closeFolderBrowser();
        updateCurrentSelection('None');
    }
}