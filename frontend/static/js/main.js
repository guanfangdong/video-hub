// main.js - 应用程序主入口文件

import { initializeDOMReferences } from './globals.js';
import { setupEventListeners, setupWindowEvents } from './event-handlers.js';
import { loadVideos } from './video-manager.js';
import { loadPaths, loadDirectories } from './path-manager.js';
import { showMessage } from './ui-utils.js';

// ===== 应用程序初始化 =====
class VideoHubApp {
    constructor() {
        this.initialized = false;
    }
    
    async init() {
        try {
            console.log('🎬 Initializing Video Hub...');
            
            // 初始化DOM引用
            this.initializeDOM();
            
            // 设置事件监听器
            this.setupEvents();
            
            // 加载初始数据
            await this.loadInitialData();
            
            // 应用初始化完成
            this.initialized = true;
            console.log('✅ Video Hub initialized successfully');
            
            // 显示欢迎消息
            this.showWelcomeMessage();
            
        } catch (error) {
            console.error('❌ Failed to initialize Video Hub:', error);
            showMessage('Failed to initialize application', 'error');
        }
    }
    
    initializeDOM() {
        console.log('📋 Setting up DOM references...');
        initializeDOMReferences();
        
        // 验证关键DOM元素是否存在
        this.validateDOMElements();
    }
    
    validateDOMElements() {
        const criticalElements = [
            'videoGrid',
            'loadingSpinner',
            'formMessage',
            'folderBrowserModal',
            'browseFolderBtn',
            'addPathBtn'
        ];
        
        const missingElements = criticalElements.filter(elementKey => {
            const element = document.getElementById(elementKey.replace(/([A-Z])/g, '-$1').toLowerCase());
            return !element;
        });
        
        if (missingElements.length > 0) {
            throw new Error(`Missing critical DOM elements: ${missingElements.join(', ')}`);
        }
    }
    
    setupEvents() {
        console.log('⚡ Setting up event listeners...');
        setupEventListeners();
        setupWindowEvents();
    }
    
    async loadInitialData() {
        console.log('📊 Loading initial data...');
        
        // 并行加载所有数据
        const loadPromises = [
            loadVideos(),
            loadPaths(),
            loadDirectories()
        ];
        
        try {
            await Promise.all(loadPromises);
            console.log('✅ All data loaded successfully');
        } catch (error) {
            console.warn('⚠️ Some data failed to load:', error);
            // 不抛出错误，让应用继续运行
        }
    }
    
    showWelcomeMessage() {
        // 检查是否是首次访问
        const isFirstVisit = !localStorage.getItem('video-hub-visited');
        
        if (isFirstVisit) {
            showMessage('Welcome to Video Hub! Add your first video folder to get started.', 'info');
            localStorage.setItem('video-hub-visited', 'true');
        }
    }
    
    // ===== 应用程序生命周期方法 =====
    destroy() {
        console.log('🔄 Cleaning up Video Hub...');
        
        // 清理事件监听器
        this.cleanupEventListeners();
        
        // 重置状态
        this.initialized = false;
    }
    
    cleanupEventListeners() {
        // 移除全局事件监听器
        window.removeEventListener('resize', this.handleWindowResize);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
    
    // ===== 调试和开发辅助方法 =====
    getAppInfo() {
        return {
            initialized: this.initialized,
            version: '2.0.0',
            timestamp: new Date().toISOString()
        };
    }
    
    // 供控制台调试使用
    debug() {
        console.log('🐛 Video Hub Debug Info:', this.getAppInfo());
        return this;
    }
}

// ===== 创建应用实例 =====
const app = new VideoHubApp();

// ===== 页面加载完成后初始化 =====
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM content loaded, starting Video Hub...');
    
    try {
        await app.init();
    } catch (error) {
        console.error('💥 Critical error during initialization:', error);
    }
});

// ===== 导出应用实例供调试使用 =====
window.VideoHubApp = app;

// ===== 错误处理 =====
window.addEventListener('error', function(event) {
    console.error('🚨 Uncaught error:', event.error);
    showMessage('An unexpected error occurred', 'error');
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('🚨 Unhandled promise rejection:', event.reason);
    showMessage('An unexpected error occurred', 'error');
    
    // 防止错误进入控制台
    event.preventDefault();
});

// ===== 性能监控 =====
window.addEventListener('load', function() {
    if ('performance' in window) {
        const loadTime = performance.now();
        console.log(`⚡ Page loaded in ${Math.round(loadTime)}ms`);
    }
});

export default app;