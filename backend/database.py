from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Video(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    file_path = db.Column(db.String, unique=True, nullable=False)
    filename = db.Column(db.String, nullable=False)
    directory = db.Column(db.String, nullable=False)
    duration = db.Column(db.Float, nullable=False)
    resolution = db.Column(db.String, nullable=False)
    size_mb = db.Column(db.Float, nullable=False)
    contact_sheet_path = db.Column(db.String, nullable=False)
    is_favorite = db.Column(db.Boolean, default=False)
    file_modified_time = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    screenshots = db.relationship('Screenshot', backref='video', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        """
        将Video对象序列化为字典，返回纯净的数据类型。
        这是解决前端数据显示和功能问题的关键。
        """
        return {
            'id': self.id,
            'file_path': self.file_path,
            'filename': self.filename,
            'directory': self.directory,
            # --- START: 关键修复 ---
            # 返回原始的浮点数，而不是格式化后的字符串
            'duration': self.duration,
            'size_mb': self.size_mb,
            # --- END: 关键修复 ---
            'resolution': self.resolution,
            'contact_sheet_path': self.contact_sheet_path,
            'is_favorite': self.is_favorite,
            'screenshots': [s.image_path for s in self.screenshots]
        }

class Screenshot(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    video_id = db.Column(db.Integer, db.ForeignKey('video.id'), nullable=False)
    image_path = db.Column(db.String, nullable=False)

class Path(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    directory_path = db.Column(db.String, unique=True, nullable=False)
    last_scanned = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'directory_path': self.directory_path,
            'last_scanned': self.last_scanned.isoformat() if self.last_scanned else None,
            'is_active': self.is_active
        }
