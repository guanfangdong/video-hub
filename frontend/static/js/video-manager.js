// video-manager.js - 视频展示和管理功能

import { appState, updateAppState, DOM } from './globals.js';
import { fetchVideos, toggleVideoFavorite, playVideo } from './api-service.js';
import { showMessage, formatDuration, formatSizeMB } from './ui-utils.js';

// ===== 视频加载和渲染 =====
export async function loadVideos() {
    try {
        const params = {
            page: appState.currentPage,
            limit: appState.itemsPerPage
        };
        
        if (appState.currentFilter === 'favorites') {
            params.favorites = true;
        }
        if (appState.currentDirectory) {
            params.directory = appState.currentDirectory;
        }
        
        console.log('Loading videos with params:', params);
        const data = await fetchVideos(params);
        console.log('Received video data:', data);
        
        updateAppState({
            totalVideos: data.total_count,
            totalPages: data.total_pages,
            currentPage: data.page
        });
        
        renderVideos(data.videos);
        updateVideoCount(data.total_count);
        renderPaginationControls();
        
    } catch (error) {
        console.error('Error loading videos:', error);
        showMessage('Failed to load videos', 'error');
    }
}

export function renderVideos(videos) {
    if (!DOM.videoGrid) {
        console.error('Video grid DOM element not found');
        return;
    }
    
    DOM.videoGrid.innerHTML = '';
    
    if (videos.length === 0) {
        DOM.videoGrid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <svg class="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4z"></path>
                </svg>
                <p class="text-gray-400 text-lg">没有找到视频</p>
                <p class="text-gray-500 text-sm mt-2">请尝试添加视频文件夹或调整筛选器</p>
            </div>`;
        return;
    }
    
    videos.forEach(video => {
        const videoCard = createVideoCard(video);
        DOM.videoGrid.appendChild(videoCard);
    });
}

export function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-105';
    
    const favoriteClass = video.is_favorite ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400';
    const favoriteIcon = video.is_favorite ? '★' : '☆';

    const imageUrl = `/generated_images/${encodeURIComponent(video.contact_sheet_path)}`;
    
    card.innerHTML = `
        <div class="relative group">
            <img src="${imageUrl}" 
                 alt="${video.filename}" 
                 class="w-full h-48 object-cover">
            
            <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <button class="play-btn bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full transition-colors" 
                        title="使用本地播放器播放">
                    <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </button>
            </div>
            
            <button class="favorite-btn absolute top-2 right-2 ${favoriteClass} text-2xl transition-colors z-10"
                    title="收藏/取消收藏">
                ${favoriteIcon}
            </button>
        </div>
        
        <div class="p-4">
            <h3 class="text-white font-semibold truncate mb-2" title="${video.filename}">
                ${video.filename}
            </h3>
            
            <div class="text-sm text-gray-400 space-y-1">
                <div class="flex justify-between">
                    <span>时长:</span>
                    <span>${formatDuration(video.duration)}</span>
                </div>
                <div class="flex justify-between">
                    <span>分辨率:</span>
                    <span>${video.resolution}</span>
                </div>
                <div class="flex justify-between">
                    <span>大小:</span>
                    <span>${formatSizeMB(video.size_mb)}</span>
                </div>
            </div>
            
            <div class="mt-2 text-xs text-gray-500 truncate" title="${video.directory}">
                📁 ${video.directory}
            </div>
        </div>
    `;
    
    // 将数据附加到元素上，以便事件处理器可以访问
    card.dataset.videoId = video.id;
    card.dataset.filePath = video.file_path;
    card.dataset.contactSheet = imageUrl;
    
    // 处理截图数组 - 确保正确的URL格式
    const screenshots = video.screenshots || [];
    const screenshotUrls = screenshots.map(screenshot => {
        // 如果screenshot已经包含了完整路径，直接使用；否则添加前缀
        if (screenshot.startsWith('/generated_images/')) {
            return screenshot;
        } else {
            return `/generated_images/${encodeURIComponent(screenshot)}`;
        }
    });
    card.dataset.screenshots = JSON.stringify(screenshotUrls);

    setupVideoCardEvents(card);
    return card;
}

function setupVideoCardEvents(card) {
    const img = card.querySelector('img');
    let hoverInterval = null;

    // 悬停动画
    card.addEventListener('mouseenter', () => {
        try {
            const screenshots = JSON.parse(card.dataset.screenshots || '[]');
            if (screenshots.length > 0) {
                let currentIndex = 0;
                hoverInterval = setInterval(() => {
                    img.src = screenshots[currentIndex];
                    currentIndex = (currentIndex + 1) % screenshots.length;
                }, 800);
            }
        } catch (error) {
            console.error('Error in hover animation:', error);
        }
    });

    card.addEventListener('mouseleave', () => {
        clearInterval(hoverInterval);
        img.src = card.dataset.contactSheet;
    });

    // 播放按钮事件
    const playBtn = card.querySelector('.play-btn');
    if (playBtn) {
        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const filePath = card.dataset.filePath;
            if (filePath) {
                handlePlayVideo(filePath);
            }
        });
    }
    
    // 收藏按钮事件
    const favoriteBtn = card.querySelector('.favorite-btn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const videoId = parseInt(card.dataset.videoId);
            if (videoId) {
                handleToggleFavorite(videoId, favoriteBtn);
            }
        });
    }
}

async function handlePlayVideo(filePath) {
    try {
        await playVideo(filePath);
        showMessage('播放器已启动', 'success');
    } catch (error) {
        console.error('Error playing video:', error);
        showMessage(error.message, 'error');
    }
}

async function handleToggleFavorite(videoId, button) {
    try {
        const data = await toggleVideoFavorite(videoId);
        button.textContent = data.is_favorite ? '★' : '☆';
        button.classList.toggle('text-yellow-400', data.is_favorite);
        button.classList.toggle('text-gray-400', !data.is_favorite);
        
        if (appState.currentFilter === 'favorites' && !data.is_favorite) {
            loadVideos();
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showMessage(error.message, 'error');
    }
}

// ===== 筛选功能 =====
export function setFilter(filter) {
    updateAppState({ currentFilter: filter, currentPage: 1 });
    
    // 更新按钮状态
    if (DOM.showAllBtn && DOM.showFavoritesBtn) {
        DOM.showAllBtn.classList.remove('bg-blue-700');
        DOM.showFavoritesBtn.classList.remove('bg-yellow-700');
        
        if (filter === 'all') {
            DOM.showAllBtn.classList.add('bg-blue-700');
        } else if (filter === 'favorites') {
            DOM.showFavoritesBtn.classList.add('bg-yellow-700');
        }
    }
    
    loadVideos();
}

export function setDirectoryFilter(directory) {
    updateAppState({ currentDirectory: directory, currentPage: 1 });
    loadVideos();
}

export function updateVideoCount(count) {
    if (DOM.videoCount) {
        DOM.videoCount.textContent = count;
    }
}

// ===== 分页控制 =====
export function renderPaginationControls() {
    const container = DOM.paginationControls;
    if (!container) {
        console.error('Pagination controls container not found');
        return;
    }
    
    container.innerHTML = '';

    const { currentPage, totalPages, itemsPerPage, totalVideos } = appState;
    
    // 修复：即使只有1页，也要显示分页控件（包含每页显示数量选择器）
    // 只有当没有视频时才完全隐藏分页控件
    if (totalVideos === 0) {
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-wrap items-center justify-center gap-2 md:gap-4';
    
    // 每页显示数量选择器（始终显示）
    wrapper.appendChild(createPerPageSelector());
    
    // 只有当页数大于1时才显示导航按钮
    if (totalPages > 1) {
        // 上一页按钮
        wrapper.appendChild(createPaginationButton('上一页', currentPage - 1, currentPage === 1));
        
        // 页码信息
        const pageInfo = document.createElement('span');
        pageInfo.className = 'text-gray-400 text-sm px-2';
        pageInfo.textContent = `第 ${currentPage} / ${totalPages} 页`;
        wrapper.appendChild(pageInfo);
        
        // 下一页按钮
        wrapper.appendChild(createPaginationButton('下一页', currentPage + 1, currentPage >= totalPages));
    }
    
    container.appendChild(wrapper);
}

function createPaginationButton(text, page, isDisabled = false) {
    const button = document.createElement('button');
    button.textContent = text;
    button.disabled = isDisabled;
    button.className = 'px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors text-sm';
    
    if (!isDisabled) {
        button.addEventListener('click', () => {
            updateAppState({ currentPage: page });
            loadVideos();
        });
    }
    
    return button;
}

function createPerPageSelector() {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex items-center space-x-2 text-sm';
    
    const label = document.createElement('span');
    label.className = 'text-gray-400 hidden md:inline';
    label.textContent = '每页显示:';
    wrapper.appendChild(label);

    const select = document.createElement('select');
    select.className = 'bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-white text-sm';
    
    const options = [
        { value: 25, label: '25' },
        { value: 50, label: '50' },
        { value: 100, label: '100' },
        { value: -1, label: '全部' }
    ];
    
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        if (opt.value === appState.itemsPerPage) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
        const newLimit = parseInt(e.target.value);
        updateAppState({ 
            itemsPerPage: newLimit, 
            currentPage: 1 
        });
        loadVideos();
    });
    
    wrapper.appendChild(select);
    return wrapper;
}

// ===== 页面跳转函数 =====
export function goToPage(page) {
    if (page >= 1 && page <= appState.totalPages) {
        updateAppState({ currentPage: page });
        loadVideos();
    }
}

export function goToNextPage() {
    if (appState.currentPage < appState.totalPages) {
        updateAppState({ currentPage: appState.currentPage + 1 });
        loadVideos();
    }
}

export function goToPreviousPage() {
    if (appState.currentPage > 1) {
        updateAppState({ currentPage: appState.currentPage - 1 });
        loadVideos();
    }
}