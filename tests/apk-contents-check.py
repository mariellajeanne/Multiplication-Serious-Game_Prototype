"""Verify the built debug APK's actual contents against the source tree.

Run after `gradlew :app:assembleDebug`:  python tests/apk-contents-check.py [path/to/app-debug.apk]
- index.html, src/, styles/, worksheet/ are bundled byte-for-byte;
- every asset is either byte-identical in the APK or recorded as excluded in
  android/app/build/asset-optimization-report.json (and then truly absent);
- every literal asset path referenced by shipped source exists in the APK;
- the background music keeps byte-identical MP3 audio frames (only ID3/cover art removed).
"""
import hashlib, json, re, sys, zipfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
APK = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'android/app/build/outputs/apk/debug/app-debug.apk'
REPORT = json.loads((ROOT / 'android/app/build/asset-optimization-report.json').read_text())
MUSIC = 'assets/music/My Panaderya - Background Music.mp3'
sha = lambda b: hashlib.sha256(b).hexdigest()

with zipfile.ZipFile(APK) as apk:
    names = set(apk.namelist())
    inside = lambda rel: 'assets/game/' + rel
    excluded = {e['path'] for e in REPORT['excluded']}
    source = [ROOT / 'index.html'] + [p for d in ('src', 'styles', 'worksheet') for p in (ROOT / d).rglob('*') if p.is_file() and p.name != 'README.md']
    for p in source:
        rel = p.relative_to(ROOT).as_posix()
        assert inside(rel) in names, ('missing source', rel)
        assert sha(apk.read(inside(rel))) == sha(p.read_bytes()), ('source differs', rel)
    kept = 0
    for p in (ROOT / 'assets').rglob('*'):
        if not p.is_file(): continue
        rel = p.relative_to(ROOT).as_posix()
        if rel in excluded:
            assert inside(rel) not in names, ('excluded asset still packaged', rel); continue
        assert inside(rel) in names, ('required asset missing from APK', rel)
        if rel == MUSIC:
            packed = apk.read(inside(rel))
            assert sha(packed) == REPORT['music']['unchangedAudioSha256'], 'music audio frames changed'
            assert p.read_bytes().endswith(packed), 'music is not the original audio-frame tail'
        else:
            assert sha(apk.read(inside(rel))) == sha(p.read_bytes()), ('asset differs', rel)
        kept += 1
    plan = json.loads((ROOT / 'tools/android-asset-optimization-plan.json').read_text())
    guard = plan['fallbackGuard']
    refs, fallback = set(), set()
    for p in source:
        rel_src = p.relative_to(ROOT).as_posix()
        text = p.read_text(encoding='utf-8', errors='replace')
        for m in re.finditer(r'(?:\.\./)?(assets/[A-Za-z0-9_\-./ ]+?\.(?:png|webp|svg|jpg|mp3|woff2?|ttf|otf))', text):
            ref = m.group(1)
            # Audited, unreachable fallbacks (used only if BAKERY_ASSETS were absent).
            if rel_src in guard['allowedFallbackReferences'] and any(ref.startswith(r) for r in guard['legacyRoots']): fallback.add(ref)
            else: refs.add(ref)
    missing = sorted(r for r in refs if '${' not in r and inside(r) not in names)
    assert not missing, ('referenced assets missing from APK', missing)
    # The production loader requires every BAKERY_ASSETS entry before boot.
    mapped = set(re.findall(r'''["'](assets/[^"']+)["']''', (ROOT / 'src/bakery-assets.js').read_text(encoding='utf-8')))
    assert mapped and all(inside(r) in names for r in mapped), ('BAKERY_ASSETS entry missing', sorted(r for r in mapped if inside(r) not in names))
    size = APK.stat().st_size
    print(f'PASS: {len(source)} source files byte-identical; {kept} assets packaged byte-identical; '
          f'{len(excluded)} audited exclusions absent; {len(refs)} literal asset references and {len(mapped)} BAKERY_ASSETS entries resolve ({len(fallback)} audited fallback-only refs); '
          f'music frames preserved; mode={REPORT["mode"]}; APK {size:,} bytes ({size/2**20:.2f} MiB)')
