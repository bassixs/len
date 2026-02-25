import os
import re

dir_path = r"c:\Users\filza\Desktop\len"
html_files = [f for f in os.listdir(dir_path) if f.endswith('.html')]

old_logo_pattern = re.compile(
    r'<a href="index\.html" class="logo">\s*<div class="logo-icon">Н</div>\s*<div class="logo-text">нжен <span>ЛЁН</span></div>\s*</a>',
    re.MULTILINE
)

new_logo = '''<a href="index.html" class="logo">
                <img src="images/logo.png" alt="нжен ЛЁН" class="logo-image" onerror="this.onerror=null; this.src='images/logo.svg'" style="height: 40px; width: auto; display: block;">
            </a>'''
            
old_logo_pattern2 = re.compile(
    r'<div class="logo-text">нжен <span>ЛЁН</span></div>',
    re.MULTILINE
)

new_logo2 = '''<img src="images/logo.png" alt="нжен ЛЁН" class="logo-image" onerror="this.onerror=null; this.src='images/logo.svg'" style="height: 30px; width: auto; margin-bottom: 1rem;">'''

for fname in html_files:
    fpath = os.path.join(dir_path, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Header logo
    content = old_logo_pattern.sub(new_logo, content)
    # Footer logo (assuming we want to replace there too)
    content = old_logo_pattern2.sub(new_logo2, content)
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

print(f"Updated {len(html_files)} files.")
