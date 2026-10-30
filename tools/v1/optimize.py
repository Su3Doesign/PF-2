#!/usr/bin/env python3
"""
Re-run this whenever you add new artwork.

    python3 tools/optimize.py path/to/new-originals

Writes web-sized WebP into assets/images/ (2000px for renders, 1400px for
social crops) and pulls poster frames out of any .mp4 into assets/posters/.
Keep your 4K originals off the server — a thief should only ever get a
degraded copy.
"""
import os, re, subprocess, sys
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

BIG = re.compile(r'^(japa-|fudomyo-|koipond-|car-|conceptdesign|cylinder|op-|sensei|\d+\.|1 \(|carousel)')
SRC = sys.argv[1] if len(sys.argv) > 1 else 'incoming'
IMG_OUT, POS_OUT, VID_OUT = 'assets/images', 'assets/posters', 'assets/videos'
for d in (IMG_OUT, POS_OUT, VID_OUT):
    os.makedirs(d, exist_ok=True)

for f in sorted(os.listdir(SRC)):
    p = os.path.join(SRC, f)
    stem, ext = os.path.splitext(f)
    if ext.lower() in ('.webp', '.png', '.jpg', '.jpeg'):
        target, q = (2000, 78) if BIG.match(f) else (1400, 72)
        im = Image.open(p).convert('RGB')
        w, h = im.size
        if max(w, h) > target:
            r = target / max(w, h)
            im = im.resize((round(w * r), round(h * r)), Image.LANCZOS)
        im.save(os.path.join(IMG_OUT, stem + '.webp'), 'WEBP', quality=q, method=5)
        print('image →', stem + '.webp')
    elif ext.lower() == '.mp4':
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', p,
                        '-vf', "scale='min(1280,iw)':-2:flags=lanczos",
                        '-c:v', 'libx264', '-crf', '28', '-preset', 'veryfast',
                        '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an',
                        os.path.join(VID_OUT, f)], check=True)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', p,
                        '-vf', "scale='min(1000,iw)':-2", '-frames:v', '1', '-q:v', '6',
                        os.path.join(POS_OUT, stem + '.jpg')], check=True)
        print('video →', f)
