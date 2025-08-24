# run.py
from backend.app import create_app
import os

if __name__ == '__main__':
    # 确保 generated_images 文件夹存在
    if not os.path.exists('generated_images'):
        os.makedirs('generated_images')
        
    app = create_app()
    app.run(debug=True)