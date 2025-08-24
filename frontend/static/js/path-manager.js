// path-manager.js - 路径管理功能
import { appState, updateAppState, DOM } from './globals.js';
import { fetchPaths, addPath, rescanPath, removePath, fetchDirectories } from './api-service.js';
import { showLoading, showMessage } from './ui-utils.js';
import { loadVideos, setDirectoryFilter } from './video-manager.js';

// ===== 路径管理主要功能 =====
export async function loadPaths() {
    try {
        const paths = await fetchPaths();
        renderPathsList(paths);
    } catch (error) {
        console.error('Error loading paths:', error);
        showMessage('Failed to load paths', 'error');
    }
}

export async function loadDirectories() {
    try {
        const data = await fetchDirectories();
        console.log('Loaded directories:', data.directories);
        
        // 构建目录树
        const directoryTree = buildDirectoryTree(data.directories);
        console.log('Directory tree:', directoryTree);
        
        // 更新全局状态
        updateAppState({ 
            allDirectories: data.directories,
            directoryTree: directoryTree
        });
        
        // 初始化面包屑
        renderDirectoryBreadcrumbs(appState.currentDirectory);
    } catch (error) {
        console.error('Error loading directories:', error);
    }
}

// ===== 目录树构建 =====
function buildDirectoryTree(directories) {
    const tree = {};
    const pathSeparator = getPathSeparator(directories);
    
    directories.forEach(dir => {
        const parts = dir.split(pathSeparator).filter(part => part.trim() !== '');
        
        let current = tree;
        let currentPath = '';
        
        parts.forEach((part, index) => {
            // 处理路径拼接
            if (index === 0 && isWindowsDrive(part)) {
                currentPath = part + '\\';
            } else if (currentPath === '') {
                currentPath = part;
            } else {
                currentPath += pathSeparator + part;
            }
            
            if (!current[part]) {
                current[part] = {
                    name: part,
                    path: currentPath,
                    children: {},
                    hasVideos: false
                };
            }
            
            // 标记此路径有视频
            current[part].hasVideos = true;
            current = current[part].children;
        });
    });
    
    return tree;
}

function getPathSeparator(directories) {
    // 根据目录路径判断使用的路径分隔符
    for (const dir of directories) {
        if (dir.includes('\\')) return '\\';
        if (dir.includes('/')) return '/';
    }
    return '/'; // 默认使用 Unix 风格
}

function isWindowsDrive(part) {
    return /^[a-zA-Z]:$/.test(part);
}

// ===== 智能面包屑导航 =====
export function renderDirectoryBreadcrumbs(currentPath = '') {
    const container = DOM.directoryBreadcrumbContainer;
    if (!container) return;
    
    container.innerHTML = '';
    container.className = 'bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm min-h-[40px] flex items-center flex-wrap gap-1';

    // 根节点 "All Directories"
    const allButton = createBreadcrumbButton('All Directories', '', !currentPath);
    container.appendChild(allButton);

    if (!currentPath) {
        // 如果没有选择目录，显示可用的根目录
        const rootDirs = getRootDirectories();
        if (rootDirs.length > 0) {
            const divider = createDivider();
            container.appendChild(divider);
            
            const dropdown = createRootDirectoriesDropdown(rootDirs);
            container.appendChild(dropdown);
        }
        return;
    }

    // 解析当前路径并生成面包屑
    const pathParts = parsePathParts(currentPath);
    let accumulatedPath = '';

    pathParts.forEach((part, index) => {
        // 添加分隔符
        const divider = createDivider();
        container.appendChild(divider);
        
        // 构建累积路径
        accumulatedPath = buildAccumulatedPath(accumulatedPath, part, index === 0);
        
        const isLast = index === pathParts.length - 1;
        const button = createBreadcrumbButton(part, accumulatedPath, isLast);
        container.appendChild(button);
        
        // 如果不是最后一个，添加子目录下拉菜单
        if (!isLast) {
            const childDirs = getChildDirectories(accumulatedPath);
            if (childDirs.length > 0) {
                const childDropdown = createChildDirectoriesDropdown(childDirs, accumulatedPath);
                container.appendChild(childDropdown);
            }
        } else {
            // 最后一个路径，显示子目录选项
            const childDirs = getChildDirectories(accumulatedPath);
            if (childDirs.length > 0) {
                const expandButton = createExpandButton(childDirs, accumulatedPath);
                container.appendChild(expandButton);
            }
        }
    });
}

function createBreadcrumbButton(text, path, isActive = false) {
    const button = document.createElement('button');
    button.textContent = text;
    button.className = `px-2 py-1 rounded transition-colors text-sm ${
        isActive 
            ? 'bg-blue-600 text-white font-medium' 
            : 'text-blue-400 hover:bg-gray-600 hover:text-white'
    }`;
    
    if (!isActive) {
        button.addEventListener('click', () => {
            updateAppState({ currentDirectory: path, currentPage: 1 });
            setDirectoryFilter(path);
            renderDirectoryBreadcrumbs(path);
        });
    }
    
    return button;
}

function createDivider() {
    const divider = document.createElement('span');
    divider.className = 'text-gray-500 mx-1 text-sm';
    divider.innerHTML = '›';
    return divider;
}

function createRootDirectoriesDropdown(rootDirs) {
    const wrapper = document.createElement('div');
    wrapper.className = 'relative inline-block';
    
    const button = document.createElement('button');
    button.className = 'text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-600 text-sm flex items-center';
    button.innerHTML = `<span>Choose folder...</span>
        <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>`;
    
    const dropdown = document.createElement('div');
    dropdown.className = 'absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-10 min-w-[200px] max-h-60 overflow-y-auto hidden';
    
    rootDirs.forEach(dir => {
        const item = document.createElement('button');
        item.className = 'block w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white';
        item.textContent = dir.name;
        item.addEventListener('click', () => {
            updateAppState({ currentDirectory: dir.path, currentPage: 1 });
            setDirectoryFilter(dir.path);
            renderDirectoryBreadcrumbs(dir.path);
            dropdown.classList.add('hidden');
        });
        dropdown.appendChild(item);
    });
    
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });
    
    // 点击外部关闭下拉菜单
    document.addEventListener('click', () => {
        dropdown.classList.add('hidden');
    });
    
    wrapper.appendChild(button);
    wrapper.appendChild(dropdown);
    return wrapper;
}

function createChildDirectoriesDropdown(childDirs, parentPath) {
    const wrapper = document.createElement('div');
    wrapper.className = 'relative inline-block';
    
    const button = document.createElement('button');
    button.className = 'text-gray-500 hover:text-gray-300 px-1 text-xs';
    button.innerHTML = '▼';
    button.title = 'Show subdirectories';
    
    const dropdown = document.createElement('div');
    dropdown.className = 'absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-10 min-w-[200px] max-h-60 overflow-y-auto hidden';
    
    childDirs.forEach(dir => {
        const item = document.createElement('button');
        item.className = 'block w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white';
        item.textContent = dir.name;
        item.addEventListener('click', () => {
            updateAppState({ currentDirectory: dir.path, currentPage: 1 });
            setDirectoryFilter(dir.path);
            renderDirectoryBreadcrumbs(dir.path);
            dropdown.classList.add('hidden');
        });
        dropdown.appendChild(item);
    });
    
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
    });
    
    document.addEventListener('click', () => {
        dropdown.classList.add('hidden');
    });
    
    wrapper.appendChild(button);
    wrapper.appendChild(dropdown);
    return wrapper;
}

function createExpandButton(childDirs, currentPath) {
    const button = document.createElement('button');
    button.className = 'text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-600 text-sm ml-2';
    button.innerHTML = `+ ${childDirs.length} more`;
    button.title = `Show ${childDirs.length} subdirectories`;
    
    button.addEventListener('click', () => {
        // 可以展开显示子目录，或者显示一个小的弹出菜单
        showSubdirectoriesMenu(childDirs, button);
    });
    
    return button;
}

function showSubdirectoriesMenu(childDirs, triggerButton) {
    // 移除已存在的菜单
    const existingMenu = document.querySelector('.subdirs-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    const menu = document.createElement('div');
    menu.className = 'subdirs-menu absolute bg-gray-800 border border-gray-600 rounded-md shadow-lg z-20 min-w-[200px] max-h-60 overflow-y-auto';
    
    // 定位菜单
    const rect = triggerButton.getBoundingClientRect();
    menu.style.top = (rect.bottom + window.scrollY + 5) + 'px';
    menu.style.left = (rect.left + window.scrollX) + 'px';
    
    childDirs.forEach(dir => {
        const item = document.createElement('button');
        item.className = 'block w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white';
        item.textContent = dir.name;
        item.addEventListener('click', () => {
            updateAppState({ currentDirectory: dir.path, currentPage: 1 });
            setDirectoryFilter(dir.path);
            renderDirectoryBreadcrumbs(dir.path);
            menu.remove();
        });
        menu.appendChild(item);
    });
    
    document.body.appendChild(menu);
    
    // 点击外部关闭菜单
    const closeMenu = (e) => {
        if (!menu.contains(e.target) && e.target !== triggerButton) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 0);
}

// ===== 辅助函数 =====
function parsePathParts(path) {
    if (!path) return [];
    
    // 处理不同操作系统的路径格式
    let parts;
    if (path.includes('\\')) {
        // Windows 路径
        parts = path.split('\\').filter(part => part.trim() !== '');
    } else {
        // Unix 路径
        parts = path.split('/').filter(part => part.trim() !== '');
    }
    
    return parts;
}

function buildAccumulatedPath(current, part, isFirst) {
    console.log('构建路径 - current:', current, 'part:', part, 'isFirst:', isFirst);
    
    if (isFirst && isWindowsDrive(part)) {
        // Windows驱动器处理 - 检查数据库中的实际格式
        if (part.endsWith(':')) {
            // 检查数据库中是用单个反斜杠还是双反斜杠
            const { allDirectories } = appState;
            const sampleDir = allDirectories.find(dir => dir.startsWith(part));
            
            if (sampleDir) {
                // 根据实际数据格式确定分隔符
                const afterColon = sampleDir.substring(part.length);
                if (afterColon.startsWith('\\')) {
                    return part + '\\';  // 数据库使用单个反斜杠
                } else if (afterColon.startsWith('/')) {
                    return part + '/';   // 数据库使用正斜杠
                }
            }
            
            return part + '\\';  // 默认使用反斜杠
        }
        return part;
    } else if (!current) {
        return part;
    } else {
        // 保持与数据库一致的分隔符
        const separator = current.includes('\\') ? '\\' : '/';
        return current + separator + part;
    }
}

function getRootDirectories() {
    const { allDirectories } = appState;
    if (!allDirectories || allDirectories.length === 0) return [];
    
    const roots = [];
    const seen = new Set();
    
    allDirectories.forEach(dir => {
        let rootPart;
        if (dir.includes('\\')) {
            // Windows: 获取驱动器号
            const match = dir.match(/^([A-Za-z]:\\)/);
            rootPart = match ? match[1] : dir.split('\\')[0];
        } else {
            // Unix: 获取第一级目录
            const parts = dir.split('/').filter(p => p);
            rootPart = parts.length > 0 ? '/' + parts[0] : '/';
        }
        
        if (rootPart && !seen.has(rootPart)) {
            seen.add(rootPart);
            roots.push({
                name: rootPart,
                path: rootPart
            });
        }
    });
    
    return roots.sort((a, b) => a.name.localeCompare(b.name));
}

function getChildDirectories(parentPath) {
    const { allDirectories } = appState;
    if (!allDirectories || allDirectories.length === 0) return [];
    
    console.log('获取子目录 - parentPath:', parentPath);
    console.log('所有目录:', allDirectories);
    
    const children = [];
    const seen = new Set();
    
    allDirectories.forEach(dir => {
        console.log('检查目录:', dir, '是否以', parentPath, '开头:', dir.startsWith(parentPath));
        
        if (dir.startsWith(parentPath) && dir !== parentPath) {
            let relativePath = dir.substring(parentPath.length);
            
            // 移除开头的分隔符
            if (relativePath.startsWith('\\') || relativePath.startsWith('/')) {
                relativePath = relativePath.substring(1);
            }
            
            if (relativePath) {
                // 检测分隔符
                const separator = relativePath.includes('\\') ? '\\' : '/';
                const nextPart = relativePath.split(separator)[0];
                
                if (nextPart && !seen.has(nextPart)) {
                    seen.add(nextPart);
                    
                    // 构建完整路径 - 确保分隔符正确
                    let fullPath;
                    if (parentPath.endsWith('\\') || parentPath.endsWith('/')) {
                        fullPath = parentPath + nextPart;
                    } else {
                        // 使用与父路径一致的分隔符
                        const parentSeparator = parentPath.includes('\\') ? '\\' : '/';
                        fullPath = parentPath + parentSeparator + nextPart;
                    }
                    
                    console.log('添加子目录:', nextPart, '完整路径:', fullPath);
                    children.push({
                        name: nextPart,
                        path: fullPath
                    });
                }
            }
        }
    });
    
    console.log('找到的子目录:', children);
    return children.sort((a, b) => a.name.localeCompare(b.name));
}
// ===== 原有功能保持不变 =====
export async function addSelectedPath() {
    const { selectedPath } = appState;
    
    if (!selectedPath) return;
    
    showLoading(true);
    
    try {
        const data = await addPath(selectedPath);
        showMessage(data.message, 'success');
        
        // 重置选择状态
        updateAppState({ selectedPath: '' });
        DOM.selectedPathDiv.innerHTML = '<span class="italic">No folder selected</span>';
        DOM.addPathBtn.disabled = true;
        
        // 重新加载所有数据
        await Promise.all([loadVideos(), loadPaths(), loadDirectories()]);
        
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

export async function handleRescanPath(pathId) {
    if (!confirm('This will rescan the folder and update the video library. Continue?')) {
        return;
    }
    
    try {
        showLoading(true);
        const data = await rescanPath(pathId);
        showMessage('Rescan completed successfully', 'success');
        
        // 重新加载所有数据
        await Promise.all([loadVideos(), loadPaths(), loadDirectories()]);
        
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

export async function handleRemovePath(pathId) {
    if (!confirm('This will remove the path and all its videos from the library. Are you sure?')) {
        return;
    }
    
    try {
        const data = await removePath(pathId);
        showMessage('Path removed successfully', 'success');
        
        // 重新加载所有数据
        await Promise.all([loadVideos(), loadPaths(), loadDirectories()]);
        
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

// ===== 路径列表渲染 =====
function renderPathsList(paths) {
    const pathsList = document.getElementById('paths-list');
    pathsList.innerHTML = '';
    
    if (paths.length === 0) {
        pathsList.innerHTML = '<p class="text-gray-400 text-sm text-center py-2">No paths scanned yet</p>';
        return;
    }
    
    paths.forEach(path => {
        const pathItem = createPathItem(path);
        pathsList.appendChild(pathItem);
    });
}

function createPathItem(path) {
    const pathItem = document.createElement('div');
    pathItem.className = 'bg-gray-700 rounded-md p-3 text-sm';
    
    const statusColor = path.is_active ? 'text-green-400' : 'text-red-400';
    const statusText = path.is_active ? 'Active' : 'Inactive';
    
    pathItem.innerHTML = `
        <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
                <p class="text-white truncate" title="${path.directory_path}">
                    ${path.directory_path}
                </p>
                <p class="text-gray-400 text-xs mt-1">
                    Last scan: ${path.last_scanned ? new Date(path.last_scanned).toLocaleDateString() : 'Never'}
                </p>
                <span class="${statusColor} text-xs">● ${statusText}</span>
            </div>
            
            <div class="flex space-x-1 ml-2">
                <button class="rescan-btn text-blue-400 hover:text-blue-300 text-xs px-2 py-1 rounded"
                        title="Rescan" 
                        data-path-id="${path.id}">
                    🔄
                </button>
                <button class="remove-btn text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded"
                        title="Remove" 
                        data-path-id="${path.id}">
                    🗑️
                </button>
            </div>
        </div>
    `;
    
    // 添加事件监听器
    setupPathItemEvents(pathItem);
    
    return pathItem;
}

function setupPathItemEvents(pathItem) {
    // 重新扫描按钮
    const rescanBtn = pathItem.querySelector('.rescan-btn');
    rescanBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pathId = parseInt(rescanBtn.dataset.pathId);
        handleRescanPath(pathId);
    });
    
    // 删除按钮
    const removeBtn = pathItem.querySelector('.remove-btn');
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pathId = parseInt(removeBtn.dataset.pathId);
        handleRemovePath(pathId);
    });
}