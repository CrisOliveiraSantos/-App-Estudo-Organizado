from pathlib import Path
from PIL import Image

source = Path('/home/ubuntu/webdev-static-assets/estudo-organizado-icon.png')
targets = [
    Path('/home/ubuntu/estudo-organizado/assets/images/icon.png'),
    Path('/home/ubuntu/estudo-organizado/assets/images/splash-icon.png'),
    Path('/home/ubuntu/estudo-organizado/assets/images/favicon.png'),
    Path('/home/ubuntu/estudo-organizado/assets/images/android-icon-foreground.png'),
]
img = Image.open(source).convert('RGB')
for target in targets:
    size = (512, 512) if target.name != 'favicon.png' else (192, 192)
    img.resize(size, Image.Resampling.LANCZOS).save(target, format='PNG', optimize=True, compress_level=9)
