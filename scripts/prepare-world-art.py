"""Prepare supplied raster artwork without adopting the previous attempt's layout.

Usage: python scripts/prepare-world-art.py assets.zip previous-project.zip
"""
import hashlib
import io
import json
from pathlib import Path
import sys
import zipfile
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
from scipy import ndimage

OUT = Path(__file__).resolve().parents[1] / 'assets' / 'bakery-world'
OUT.mkdir(parents=True, exist_ok=True)
records = []


def export(archive, member, name, crop=None, largest=False):
    raw = archive.read(member)
    image = Image.open(io.BytesIO(raw)).convert('RGBA')
    if crop:
        image = image.crop(crop)
    if largest:
        pixels = np.array(image)
        labels, count = ndimage.label(pixels[:, :, 3] > 32)
        sizes = np.bincount(labels.ravel())
        sizes[0] = 0
        keep = ndimage.binary_dilation(labels == sizes.argmax(), iterations=2)
        pixels[:, :, 3] = np.where(keep, pixels[:, :, 3], 0)
        image = Image.fromarray(pixels)
    if name.endswith('.webp'):
        image.convert('RGB').save(OUT / name, quality=92)
    else:
        image.save(OUT / name, optimize=True)
    records.append(dict(file=name, source=member, source_sha256=hashlib.sha256(raw).hexdigest(),
                        crop=crop, isolated_component=largest, size=list(image.size)))


with zipfile.ZipFile(sys.argv[1]) as original, zipfile.ZipFile(sys.argv[2]) as previous:
    background = next(n for n in original.namelist() if 'Interior.png' in n)
    export(original, background, 'bakery-panorama.webp')
    ambient = Image.open(io.BytesIO(original.read(background))).convert('RGB')
    ambient = ImageEnhance.Color(ambient).enhance(.64)
    ambient = Image.blend(ambient, Image.new('RGB', ambient.size, '#fff4d1'), .64)
    ambient = ambient.filter(ImageFilter.GaussianBlur(4))
    ambient.save(OUT / 'bakery-ambient.webp', quality=92)
    records.append(dict(file='bakery-ambient.webp', source=background,
                        source_sha256=hashlib.sha256(original.read(background)).hexdigest(),
                        adaptation='64% cream blend, 64% saturation, 4px source-space blur',
                        size=list(ambient.size)))
    export(original, 'images/Glossy Bakery Orders Board.png', 'orders-frame.png')
    export(original, 'images/Glossy Packages Game UI Frame.png', 'packages-frame.png')
    for source, name, crop, largest in [
        ('menu_frame.png', 'menu-frame.png', None, True),
        ('gold_normal.png', 'button-gold.png', None, True),
        ('gold_hover.png', 'button-gold-hover.png', None, True),
        ('gold_pressed.png', 'button-gold-pressed.png', None, True),
        ('gold_selected.png', 'button-cream.png', None, True),
        ('coin_normal.png', 'hud-coins.png', None, True),
        ('boost_normal.png', 'hud-boost.png', None, True),
        ('help_normal.png', 'help.png', None, True),
        ('settings_normal.png', 'settings.png', None, True),
        ('icon_gift.png', 'icon-packages.png', None, True),
        ('icon_hat.png', 'icon-menu.png', None, True),
        ('icon_clipboard.png', 'icon-orders.png', None, True),
        ('order_button_hover.png', 'utility-hover.png', (0, 0, 882, 246), True),
        ('order_button_normal.png', 'utility-cream.png', None, True),
        ('order_button_pressed.png', 'utility-pressed.png', None, True),
    ]:
        export(previous, 'production_assets/' + source, name, crop, largest)
    for index, tier in enumerate(['gift', 'surprise', 'mystery', 'secret', 'enchanted', 'mythical', 'celestial', 'divine']):
        export(previous, f'production_assets/package_{tier}.png', f'package-{index+1:02}.png')
    export(original, 'images/My_Panaderya_Orders_Button_Assets_Final_Spaced.png',
           'icon-refresh.png', (1020, 420, 1410, 810), True)

(OUT / 'provenance.json').write_text(json.dumps(records, indent=2) + '\n', encoding='utf-8')
print(f'Prepared {len(records)} raster assets in {OUT}')
