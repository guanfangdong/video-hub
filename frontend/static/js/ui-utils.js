// ui-utils.js - UI相关的工具函数

import { DOM } from './globals.js';

// ===== 加载动画控制 =====
export function showLoading(show) {
    if (DOM.loadingSpinner) {
        DOM.loadingSpinner.classList.toggle('hidden', !show);
    }
}

// ===== 消息提示系统 =====
export function showMessage(message, type = 'info') {
    if (DOM.formMessage) {
        DOM.formMessage.textContent = message;
        DOM.formMessage.className = `mt-3 text-center text-sm ${getMessageTypeClass(type)}`;
        
        // 3秒后清除消息
        setTimeout(() => {
            DOM.formMessage.textContent = '';
            DOM.formMessage.className = 'mt-3 text-center text-sm';
        }, 3000);
    }
}

function getMessageTypeClass(type) {
    const classes = {
        'success': 'text-green-400',
        'error': 'text-red-400',
        'warning': 'text-yellow-400',
        'info': 'text-blue-400'
    };
    return classes[type] || classes.info;
}

// ===== 数据格式化函数 =====
export function formatDuration(durationInSeconds) {
    if (!durationInSeconds || isNaN(durationInSeconds)) {
        return '0:00';
    }
    
    const hours = Math.floor(durationInSeconds / 3600);
    const minutes = Math.floor((durationInSeconds % 3600) / 60);
    const seconds = Math.floor(durationInSeconds % 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

export function formatSizeMB(sizeInMB) {
    if (!sizeInMB || isNaN(sizeInMB)) {
        return '0 MB';
    }
    
    if (sizeInMB >= 1024) {
        const sizeInGB = sizeInMB / 1024;
        return `${sizeInGB.toFixed(1)} GB`;
    } else {
        return `${sizeInMB.toFixed(1)} MB`;
    }
}

// ===== 模态窗口控制 =====
export function showModal(modalElement) {
    if (modalElement) {
        modalElement.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // 防止背景滚动
    }
}

export function hideModal(modalElement) {
    if (modalElement) {
        modalElement.classList.add('hidden');
        document.body.style.overflow = ''; // 恢复滚动
    }
}

// ===== 确认对话框 =====
export function confirmAction(message, title = 'Confirm Action') {
    return new Promise((resolve) => {
        const confirmed = confirm(`${title}\n\n${message}`);
        resolve(confirmed);
    });
}

// ===== 动画和过渡效果 =====
export function fadeIn(element, duration = 300) {
    if (!element) return;
    
    element.style.opacity = '0';
    element.style.display = 'block';
    
    const startTime = performance.now();
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        element.style.opacity = progress.toString();
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    requestAnimationFrame(animate);
}

export function fadeOut(element, duration = 300) {
    if (!element) return;
    
    const startTime = performance.now();
    const initialOpacity = parseFloat(getComputedStyle(element).opacity) || 1;
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        element.style.opacity = (initialOpacity * (1 - progress)).toString();
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            element.style.display = 'none';
        }
    }
    
    requestAnimationFrame(animate);
}

// ===== 表单验证辅助 =====
export function validatePath(path) {
    if (!path || path.trim() === '') {
        return { valid: false, message: 'Path cannot be empty' };
    }
    
    // 检查路径格式
    const windowsPathRegex = /^[A-Za-z]:\\/;
    const unixPathRegex = /^\/[^<>:"|?*]*/;
    
    if (!windowsPathRegex.test(path) && !unixPathRegex.test(path)) {
        return { valid: false, message: 'Invalid path format' };
    }
    
    return { valid: true };
}

// ===== 文件大小格式化 =====
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ===== 时间格式化 =====
export function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

// ===== 文本截断 =====
export function truncateText(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

// ===== 防抖函数 =====
export function debounce(func, delay = 300) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// ===== 节流函数 =====
export function throttle(func, delay = 100) {
    let lastCall = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            return func.apply(this, args);
        }
    };
}

// ===== 复制到剪贴板 =====
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showMessage('Copied to clipboard', 'success');
        return true;
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        showMessage('Failed to copy to clipboard', 'error');
        return false;
    }
}

// ===== 键盘快捷键辅助 =====
export function isKeyCombo(event, combo) {
    const keys = combo.split('+').map(k => k.trim().toLowerCase());
    const pressedKeys = [];
    
    if (event.ctrlKey) pressedKeys.push('ctrl');
    if (event.altKey) pressedKeys.push('alt');
    if (event.shiftKey) pressedKeys.push('shift');
    if (event.metaKey) pressedKeys.push('meta');
    
    pressedKeys.push(event.key.toLowerCase());
    
    return keys.length === pressedKeys.length && 
           keys.every(key => pressedKeys.includes(key));
}