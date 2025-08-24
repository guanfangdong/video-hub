import os
import sys
import subprocess
from datetime import datetime

from flask import Flask, render_template, request, jsonify, send_from_directory
from .database import db, Video, Screenshot, Path
from .video_processing import get_video_metadata, create_contact_sheet, SUPPORTED_FORMATS

def create_app():
    """
    创建并配置 Flask 应用。
    这是应用的主工厂函数。
    """
    app = Flask(__name__,
                template_folder='../frontend/templates',
                static_folder='../frontend/static')

    # 配置数据库
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///../instance/videos.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # 配置生成图片的存储路径
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    app.config['GENERATED_IMAGES_FOLDER'] = os.path.join(project_root, 'generated_images')

    # 初始化扩展
    db.init_app(app)

    with app.app_context():
        db.create_all()

    # --- 单线程处理辅助函数 ---

    def cleanup_video_files(video_obj, output_folder):
        """清理与一个视频记录相关的所有图片文件。"""
        if video_obj.contact_sheet_path:
            full_path = os.path.join(output_folder, video_obj.contact_sheet_path)
            if os.path.exists(full_path):
                os.remove(full_path)
        
        for screenshot in video_obj.screenshots:
            full_path = os.path.join(output_folder, screenshot.image_path)
            if os.path.exists(full_path):
                os.remove(full_path)

    def process_single_video(video_path, output_folder):
        """
        处理单个视频文件：提取元数据、创建图片、存入数据库。
        这是一个完整的、原子的操作。
        """
        # 检查视频是否已存在
        if Video.query.filter_by(file_path=video_path).first():
            print(f"视频已存在，跳过: {video_path}")
            return

        metadata = get_video_metadata(video_path)
        if not metadata:
            return

        contact_sheet_path, screenshots_paths = create_contact_sheet(video_path, output_folder)
        if not contact_sheet_path:
            return

        rel_contact_sheet_path = os.path.relpath(contact_sheet_path, output_folder).replace('\\', '/')
        file_mtime = datetime.fromtimestamp(os.path.getmtime(video_path))

        new_video = Video(
            file_path=video_path,
            filename=os.path.basename(video_path),
            directory=os.path.dirname(video_path),
            duration=metadata['duration'],
            resolution=metadata['resolution'],
            size_mb=metadata['size_mb'],
            contact_sheet_path=rel_contact_sheet_path,
            file_modified_time=file_mtime
        )
        db.session.add(new_video)
        db.session.flush()

        for spath in screenshots_paths:
            rel_spath = os.path.relpath(spath, output_folder).replace('\\', '/')
            screenshot = Screenshot(video_id=new_video.id, image_path=rel_spath)
            db.session.add(screenshot)

        db.session.commit()
        print(f"成功处理: {video_path}")

    def scan_and_process_videos(directory, output_folder):
        """
        (单线程) 扫描目录并处理所有找到的视频。
        """
        for root, _, files in os.walk(directory):
            for file in files:
                if file.lower().endswith(SUPPORTED_FORMATS):
                    video_path = os.path.join(root, file)
                    process_single_video(video_path, output_folder)

    def smart_rescan(directory, output_folder):
        """
        (单线程) 智能重新扫描目录，处理文件变化。
        """
        existing_videos = Video.query.filter(Video.file_path.startswith(directory)).all()
        existing_paths = {v.file_path: v for v in existing_videos}
        
        current_files = set()
        
        for root, _, files in os.walk(directory):
            for file in files:
                if file.lower().endswith(SUPPORTED_FORMATS):
                    video_path = os.path.join(root, file)
                    current_files.add(video_path)
                    
                    if video_path not in existing_paths:
                        # 新增文件
                        process_single_video(video_path, output_folder)
                    else:
                        # 已存在的文件，检查修改时间
                        video_obj = existing_paths[video_path]
                        file_mtime = datetime.fromtimestamp(os.path.getmtime(video_path))
                        if file_mtime > video_obj.file_modified_time:
                            # 文件被修改，先删除旧记录和文件，再重新处理
                            print(f"文件已修改，重新处理: {video_path}")
                            cleanup_video_files(video_obj, output_folder)
                            db.session.delete(video_obj)
                            db.session.commit()
                            process_single_video(video_path, output_folder)
        
        # 删除已不存在于文件系统的记录
        paths_to_delete = set(existing_paths.keys()) - current_files
        for path_to_delete in paths_to_delete:
            video_obj = existing_paths[path_to_delete]
            print(f"文件已移除，删除记录: {path_to_delete}")
            cleanup_video_files(video_obj, output_folder)
            db.session.delete(video_obj)
        db.session.commit()

    # --- API 路由 ---

    @app.route('/')
    def index():
        return render_template('index.html')

    
    @app.route('/api/videos', methods=['GET'])
    def get_videos():
        try:
            show_favorites = request.args.get('favorites', 'false').lower() == 'true'
            directory_filter = request.args.get('directory', '')
            page = int(request.args.get('page', 1))
            limit = int(request.args.get('limit', 25))

            query = Video.query.order_by(Video.filename)
            if show_favorites:
                query = query.filter(Video.is_favorite == True)
            if directory_filter:
                query = query.filter(Video.directory.startswith(directory_filter))

            total_videos = query.count()
            
            # 修复：处理"显示全部"的情况
            if limit <= 0:  # -1 或 0 表示显示全部
                videos = query.all()
                return jsonify({
                    'videos': [v.to_dict() for v in videos],
                    'total_count': total_videos,
                    'page': 1,
                    'limit': -1,
                    'total_pages': 1
                })
            else:
                # 正常分页
                videos = query.offset((page - 1) * limit).limit(limit).all()
                total_pages = (total_videos + limit - 1) // limit if total_videos > 0 else 1
                
                return jsonify({
                    'videos': [v.to_dict() for v in videos],
                    'total_count': total_videos,
                    'page': page,
                    'limit': limit,
                    'total_pages': total_pages
                })
                
        except Exception as e:
            print(f"获取视频列表时出错: {e}")
            return jsonify({"error": "无法从数据库加载视频列表。", "details": str(e)}), 500

    @app.route('/api/directories', methods=['GET'])
    def get_directories():
        try:
            directories = db.session.query(Video.directory).distinct().all()
            dir_list = sorted([d[0] for d in directories])
            return jsonify({'directories': dir_list})
        except Exception as e:
            print(f"获取目录列表时出错: {e}")
            return jsonify({"error": "无法从数据库加载目录列表。", "details": str(e)}), 500

    @app.route('/api/browse_folder', methods=['POST'])
    def browse_folder():
        current_path = request.json.get('path', '')
        try:
            if not current_path:
                if sys.platform == "win32":
                    drives = [{'name': f"{l}:\\", 'path': f"{l}:\\", 'is_directory': True} for l in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' if os.path.exists(f"{l}:\\")]
                    return jsonify({'items': drives, 'current_path': ''})
                else:
                    current_path = '/'
            
            if not os.path.exists(current_path) or not os.path.isdir(current_path):
                return jsonify({'error': '无效的目录'}), 400
                
            items = []
            for item in sorted(os.listdir(current_path)):
                if item.startswith('.'): continue
                item_path = os.path.join(current_path, item)
                if os.path.isdir(item_path):
                    items.append({'name': item, 'path': item_path, 'is_directory': True})
            return jsonify({'items': items, 'current_path': current_path})
        except PermissionError:
            return jsonify({'error': '权限不足'}), 403
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/paths', methods=['GET'])
    def get_paths():
        try:
            paths = Path.query.all()
            return jsonify([p.to_dict() for p in paths])
        except Exception as e:
            print(f"获取路径列表时出错: {e}")
            return jsonify({"error": "无法从数据库加载路径列表。", "details": str(e)}), 500

    @app.route('/api/paths', methods=['POST'])
    def add_path():
        path = request.json.get('path')
        if not path or not os.path.isdir(path):
            return jsonify({'error': '无效的目录路径'}), 400

        if Path.query.filter_by(directory_path=path).first():
            return jsonify({'message': '路径已存在'}), 200

        # 同步执行扫描
        scan_and_process_videos(path, app.config['GENERATED_IMAGES_FOLDER'])

        new_path = Path(directory_path=path)
        db.session.add(new_path)
        db.session.commit()

        return jsonify({'message': '路径已添加并处理完成。'}), 201

    @app.route('/api/paths/<int:path_id>/rescan', methods=['POST'])
    def rescan_path_route(path_id):
        path_obj = Path.query.get_or_404(path_id)
        if not os.path.isdir(path_obj.directory_path):
            path_obj.is_active = False
            db.session.commit()
            return jsonify({'error': '目录不存在'}), 400
            
        # 同步执行重新扫描
        smart_rescan(path_obj.directory_path, app.config['GENERATED_IMAGES_FOLDER'])
        
        path_obj.last_scanned = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'message': '重新扫描完成。'}), 200

    @app.route('/api/paths/<int:path_id>', methods=['DELETE'])
    def remove_path(path_id):
        path_obj = Path.query.get_or_404(path_id)
        videos_to_delete = Video.query.filter(Video.file_path.startswith(path_obj.directory_path)).all()
        
        for video in videos_to_delete:
            cleanup_video_files(video, app.config['GENERATED_IMAGES_FOLDER'])
            db.session.delete(video)
        
        db.session.delete(path_obj)
        db.session.commit()
        return jsonify({'message': '路径及相关视频已移除'}), 200

    @app.route('/api/videos/<int:video_id>/favorite', methods=['POST'])
    def toggle_favorite(video_id):
        video = Video.query.get_or_404(video_id)
        video.is_favorite = not video.is_favorite
        video.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'message': '收藏状态已更新', 'is_favorite': video.is_favorite})

    @app.route('/generated_images/<path:filename>')
    def generated_image(filename):
        return send_from_directory(app.config['GENERATED_IMAGES_FOLDER'], filename)
    
    @app.route('/api/play_video', methods=['POST'])
    def play_video():
        file_path = request.json.get('path')
        if not file_path or not os.path.exists(file_path):
            return jsonify({'error': '文件未找到'}), 404
        try:
            if sys.platform == "win32":
                os.startfile(file_path)
            elif sys.platform == "darwin":
                subprocess.Popen(["open", file_path])
            else:
                subprocess.Popen(["xdg-open", file_path])
            return jsonify({'message': '已调用播放器'}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return app
