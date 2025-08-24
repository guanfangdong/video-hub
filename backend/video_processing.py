import cv2
import os
import re
import hashlib
import math
from PIL import Image

SUPPORTED_FORMATS = ('.mp4', '.mkv', '.avi', '.mov', '.flv')

def get_organized_path(file_path, base_output_folder):
    normalized_path = os.path.normpath(file_path)
    directory = os.path.dirname(normalized_path)
    
    if os.name == 'nt' and ':' in directory:
        drive_letter = directory[0].lower()
        path_without_drive = directory[3:] if len(directory) > 3 else ""
        # --- FIX: 保留原始的大小写和字符 ---
        path_parts = [drive_letter] + [p for p in path_without_drive.split(os.sep) if p]
    else:
        # --- FIX: 保留原始的大小写和字符 ---
        path_parts = [p for p in directory.split(os.sep) if p]
    
    # 只对路径的每一部分进行文件名安全清理
    clean_parts = [sanitize_filename(p) for p in path_parts if sanitize_filename(p) and sanitize_filename(p) not in ['.', '..']]
    
    output_dir = os.path.join(base_output_folder, *clean_parts) if clean_parts else os.path.join(base_output_folder, 'root')
    os.makedirs(output_dir, exist_ok=True)
    return output_dir

def generate_unique_filename(original_path, base_name, extension):
    path_hash = hashlib.md5(original_path.encode('utf-8')).hexdigest()[:8]
    clean_base = sanitize_filename(base_name)
    return f"{clean_base}_{path_hash}{extension}"

def sanitize_filename(filename):
    """
    清理文件名，只移除Windows/Linux非法字符，保留包括中文在内的所有其他字符。
    """
    if not filename: return "unnamed"
    
    # --- START: FIX FOR CHINESE CHARACTERS ---
    # 只移除明确在文件名中非法的字符
    sanitized = re.sub(r'[\\/*?:"<>|]', "_", filename)
    
    # 移除之前过于宽泛的Emoji清理规则，因为它会误删中文字符
    
    # 移除文件名开头和结尾的空格和点
    sanitized = sanitized.strip(' .')
    # --- END: FIX FOR CHINESE CHARACTERS ---
    
    return sanitized if sanitized else "unnamed"

def get_video_metadata(video_path):
    """获取视频元数据，并对数值进行有效性检查"""
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened(): return None
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        if fps > 0 and frame_count > 0:
            duration = frame_count / fps
            if not math.isfinite(duration): duration = 0.0
        else:
            duration = 0.0

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        try:
            size_bytes = os.path.getsize(video_path)
            size_mb = size_bytes / (1024 * 1024)
            if not math.isfinite(size_mb): size_mb = 0.0
        except OSError:
            size_mb = 0.0

        return {'duration': duration, 'resolution': f"{width}x{height}", 'size_mb': size_mb}
    except Exception as e:
        print(f"获取 {video_path} 的元数据时出错: {e}")
        return None
    finally:
        if 'cap' in locals() and cap.isOpened():
            cap.release()

def create_contact_sheet(video_path, base_output_folder):
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened(): return None, []

        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if frame_count < 4: return None, []

        screenshots_paths, images = [], []
        intervals = [0.2, 0.4, 0.6, 0.8]
        organized_output_dir = get_organized_path(video_path, base_output_folder)
        base_filename_raw = os.path.splitext(os.path.basename(video_path))[0]
        
        for i, interval in enumerate(intervals):
            frame_number = int(frame_count * interval)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
            ret, frame = cap.read()
            if ret:
                screenshot_filename = generate_unique_filename(video_path, f"{base_filename_raw}_ss_{i+1}", ".jpg")
                screenshot_path = os.path.join(organized_output_dir, screenshot_filename)
                is_success, buffer = cv2.imencode(".jpg", frame)
                if is_success:
                    with open(screenshot_path, 'wb') as f: f.write(buffer)
                    screenshots_paths.append(screenshot_path)
                    images.append(Image.open(screenshot_path))

        if len(images) < 4:
            for p in screenshots_paths:
                if os.path.exists(p): os.remove(p)
            return None, []

        img_width, img_height = images[0].size
        grid_img = Image.new('RGB', (img_width * 2, img_height * 2))
        grid_img.paste(images[0], (0, 0))
        grid_img.paste(images[1], (img_width, 0))
        grid_img.paste(images[2], (0, img_height))
        grid_img.paste(images[3], (img_width, img_height))
        
        contact_sheet_filename = generate_unique_filename(video_path, f"{base_filename_raw}_contact", ".jpg")
        contact_sheet_path = os.path.join(organized_output_dir, contact_sheet_filename)
        grid_img.save(contact_sheet_path, "JPEG", quality=85)

        return contact_sheet_path, screenshots_paths
    except Exception as e:
        print(f"为 {video_path} 创建联系图时出错: {e}")
        return None, []
    finally:
        if 'cap' in locals() and cap.isOpened():
            cap.release()
