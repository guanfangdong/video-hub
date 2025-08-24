// api-service.js - API调用服务层

// ===== 视频相关API =====
export async function fetchVideos(params = {}) {
    const urlParams = new URLSearchParams();
    
    if (params.favorites) {
        urlParams.append('favorites', 'true');
    }
    if (params.directory) {
        urlParams.append('directory', params.directory);
    }
    
    // 添加分页参数
    if (params.page) {
        urlParams.append('page', params.page.toString());
    }
    if (params.limit !== undefined) {
        urlParams.append('limit', params.limit.toString());
    }
    
    const response = await fetch(`/api/videos?${urlParams}`);
    if (!response.ok) {
        throw new Error('Failed to load videos');
    }
    
    return await response.json();
}

export async function toggleVideoFavorite(videoId) {
    const response = await fetch(`/api/videos/${videoId}/favorite`, {
        method: 'POST'
    });
    
    if (!response.ok) {
        throw new Error('Failed to toggle favorite');
    }
    
    return await response.json();
}

export async function playVideo(filePath) {
    const response = await fetch('/api/play_video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath })
    });
    
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to play video');
    }
    
    return await response.json();
}

// ===== 路径管理API =====
export async function fetchPaths() {
    const response = await fetch('/api/paths');
    if (!response.ok) {
        throw new Error('Failed to load paths');
    }
    
    return await response.json();
}

export async function addPath(path) {
    const response = await fetch('/api/paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to add path');
    }
    
    return data;
}

export async function rescanPath(pathId) {
    const response = await fetch(`/api/paths/${pathId}/rescan`, {
        method: 'POST'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to rescan path');
    }
    
    return data;
}

export async function removePath(pathId) {
    const response = await fetch(`/api/paths/${pathId}`, {
        method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to remove path');
    }
    
    return data;
}

// ===== 目录和文件夹浏览API =====
export async function fetchDirectories() {
    const response = await fetch('/api/directories');
    if (!response.ok) {
        throw new Error('Failed to load directories');
    }
    
    return await response.json();
}

export async function browseFolderContents(path) {
    const response = await fetch('/api/browse_folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Failed to load folder contents');
    }
    
    return data;
}