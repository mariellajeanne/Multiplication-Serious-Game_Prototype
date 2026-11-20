"""Export startup artwork without changing approved frames or source assets.

python scripts/prepare-refinement-art.py INTERIOR_PNG LOCALIZED_PACKAGES_EDIT [EXTENDED_INTERIOR]
Pillow is a development tool only; the game remains buildless and offline.
"""
import hashlib
import json
from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/bakery-runtime'
OUT.mkdir(exist_ok=True)
assets, evidence = {}, []

def export(name, source, limit=None):
    im = Image.open(source)
    original_size = im.size
    if limit:
        im.thumbnail((limit, limit), Image.Resampling.LANCZOS)
    restored = source.stem == 'background-floor-restored'
    target = OUT / ((source.stem if restored else name) + '.webp')
    # The opaque scenery can use high-quality compression. Frame/prop alpha and
    # color remain lossless; icons retain at least twice their displayed size.
    scenery = name == 'background-floor'
    im.save(target, 'WEBP', lossless=restored or not scenery, quality=96, exact=True, method=6)
    check = Image.open(target).convert('RGBA')
    assert check.getchannel('A').tobytes() == im.convert('RGBA').getchannel('A').tobytes()
    assets[name] = target.relative_to(ROOT).as_posix()
    evidence.append({'name': name, 'source': str(source.relative_to(ROOT)),
                     'sourceBytes': source.stat().st_size, 'runtimeBytes': target.stat().st_size,
                     'sourceSize': original_size, 'runtimeSize': im.size,
                     'encoding': 'WebP quality 96' if scenery and not restored else 'lossless WebP'})

# Integrate only the edited lower-center rectangle. Every pixel outside is original.
original = Image.open(ROOT / 'assets/bakery-approved/packages-frame.png').convert('RGBA')
edit = Image.open(sys.argv[2]).convert('RGBA')
if edit.size != original.size:
    edit = edit.resize(original.size, Image.Resampling.LANCZOS)
patch = (620, 820, 1050, 941)
result = original.copy()
result.paste(edit.crop(patch), patch[:2])
edited = ROOT / 'assets/bakery-approved/packages-frame-no-ribbon.png'
result.save(edited)
for box in [(0, 0, 1670, 820), (0, 820, 620, 941), (1050, 820, 1670, 941)]:
    assert result.crop(box).tobytes() == original.crop(box).tobytes()

interior = ROOT / 'assets/bakery-approved/background-floor-source.png'
interior.write_bytes(Path(sys.argv[1]).read_bytes())
if len(sys.argv) > 3:
    extended = ROOT / 'assets/bakery-approved/background-floor-extended.png'
    extended.write_bytes(Path(sys.argv[3]).read_bytes())
    restored = ROOT / 'assets/bakery-approved/background-floor-restored.png'
    export('background-floor', restored if restored.exists() else extended)
else:
    export('background-floor', interior)
for name in ['menu-frame', 'orders-frame', 'packages-frame']:
    export(name, edited if name == 'packages-frame' else ROOT / f'assets/bakery-approved/{name}.png')
names = ['register', 'counter-gifts', 'gift-icon', 'hat-icon', 'orders-icon', 'book-icon',
         'price-coin', 'tray', 'refresh-icon', 'utility-gift',
         *[f'package-{i:02}' for i in range(1, 9)],
         *[f'ticket-{color}' for color in ['gold', 'pink', 'purple', 'rainbow']],
         *[f'reward-{name}' for name in ['bucket', 'cart', 'chest', 'crown']],
         *[f'food-{name}' for name in ['ube-ensaymada', 'brazo', 'buko-pie', 'pianono', 'ensaymada', 'ube-pandesal']]]
for name in names:
    limit = 160 if name.endswith('-icon') or name == 'utility-gift' else 600 if name in ['register', 'counter-gifts'] else 1400 if name.startswith('ticket-') else None
    export(name, ROOT / f'assets/bakery-faithful/{name}.png', limit)
for kind, count in [('food', 17), ('coin', 8)]:
    for i in range(1, count + 1):
        name = f'{kind}-{i:02}'
        export(name, ROOT / f'assets/bakery-ui/illustrated/{name}.png', 300 if kind == 'coin' else None)

(ROOT / 'src/bakery-assets.js').write_text('/* Source-preserving runtime exports; regenerate with scripts/prepare-refinement-art.py. */\nconst BAKERY_ASSETS=Object.freeze(' + json.dumps(assets, indent=2) + ');\n', encoding='utf-8')
(OUT / 'provenance.json').write_text(json.dumps({'packagePatch': patch, 'editTool': 'built-in image_gen',
    'editPrompt': 'Remove only the lower bow and tails; restore the wooden base. Preserve the original canvas, transparency, top ribbon, text, supports and all other pixels.',
    'backgroundPrompt': 'Extend the supplied bakery horizontally into a seamless 3:1 panorama, continuing pastel arches, swags, windows and floor perspective at the same proportions. No UI or foreground stations.',
    'originalPackageSHA256': hashlib.sha256((ROOT / 'assets/bakery-approved/packages-frame.png').read_bytes()).hexdigest(),
    'assets': evidence}, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'assets': len(assets), 'sourceBytes': sum(x['sourceBytes'] for x in evidence),
                  'runtimeBytes': sum(x['runtimeBytes'] for x in evidence)}))
