#!/usr/bin/env python3
from __future__ import annotations

import base64
import io
import os
import shutil
import time
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SCRIPTURE = ASSETS / "scripture-v74"
SOURCE = ROOT / "assets-src" / "v73"

POSTER_PARTS = [SOURCE / f"poster.part{i:02d}" for i in range(5)]
POSTER_OUT = ASSETS / "v74-login-poster.webp"
LOGO_OUT = ASSETS / "v74-efgc-logo.png"

REMOTE = [
    ("bible-light.jpg", "https://unsplash.com/photos/MszZIWTVOi8/download?force=true&w=1800"),
    ("open-bible.jpg", "https://unsplash.com/photos/SZaxKdLwz6o/download?force=true&w=1800"),
    ("bible-devotion.jpg", "https://unsplash.com/photos/eCE40LwVDss/download?force=true&w=1800"),
    ("bible-sunrise.jpg", "https://unsplash.com/photos/VbcEb-Fkuzs/download?force=true&w=1800"),
    ("scripture-pages.jpg", "https://unsplash.com/photos/qhnVF1K3lnk/download?force=true&w=1800"),
    ("quiet-time.jpg", "https://unsplash.com/photos/wB9AJS9t-4k/download?force=true&w=1800"),
    ("blue-cross.jpg", "https://unsplash.com/photos/ITiJrBI3XnE/download?force=true&w=1800"),
    ("sunrise-cross.jpg", "https://unsplash.com/photos/UTY4N-NU6Wg/download?force=true&w=1800"),
    ("bible-community.jpg", "https://unsplash.com/photos/5AoQbO_-TYo/download?force=true&w=1800"),
    ("prayer-bible.jpg", "https://images.unsplash.com/photo-1607098263775-e2cc11657839?auto=format&fit=crop&w=1800&q=88"),
]

LOCAL = [
    ("youth-worship.jpg", ASSETS / "v49-youth-fellowship.webp"),
    ("sunrise-faith.jpg", ASSETS / "v49-sunrise.webp"),
]


def reconstruct_poster() -> Image.Image:
    encoded = "".join(p.read_text(encoding="utf-8").strip() for p in POSTER_PARTS)
    raw = base64.b64decode(encoded)
    POSTER_OUT.parent.mkdir(parents=True, exist_ok=True)
    POSTER_OUT.write_bytes(raw)
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    if im.width < 500 or im.height < 900:
        raise RuntimeError(f"Unexpected poster dimensions {im.size}")
    return im


def build_logo(poster: Image.Image) -> None:
    # Exact emblem crop measured from the user's supplied 864x1536 poster.
    w, h = poster.size
    x1 = round(w * (225 / 864))
    y1 = round(h * (18 / 1536))
    x2 = round(w * (639 / 864))
    y2 = round(h * (432 / 1536))
    crop = poster.crop((x1, y1, x2, y2)).convert("RGBA")
    crop = crop.resize((640, 640), Image.Resampling.LANCZOS)
    mask = Image.new("L", crop.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((2, 2, 638, 638), fill=255)
    crop.putalpha(mask)
    crop.save(LOGO_OUT, "PNG", optimize=True)


def cover_4x5(im: Image.Image) -> Image.Image:
    im = ImageOps.exif_transpose(im).convert("RGB")
    target_ratio = 1080 / 1350
    ratio = im.width / im.height
    if ratio > target_ratio:
        new_w = round(im.height * target_ratio)
        left = max(0, (im.width - new_w) // 2)
        im = im.crop((left, 0, left + new_w, im.height))
    else:
        new_h = round(im.width / target_ratio)
        top = max(0, (im.height - new_h) // 2)
        im = im.crop((0, top, im.width, top + new_h))
    return im.resize((1080, 1350), Image.Resampling.LANCZOS)


def save_normalized(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    cover_4x5(im).save(path, "JPEG", quality=88, optimize=True, progressive=True)


def download_image(url: str) -> Image.Image:
    headers = {
        "User-Agent": "Mozilla/5.0 EFGC-Youth-App/74",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    }
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=35) as resp:
                data = resp.read()
            if len(data) < 12000:
                raise RuntimeError(f"download too small: {len(data)} bytes")
            return Image.open(io.BytesIO(data)).convert("RGB")
        except Exception as exc:
            last = exc
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Could not download {url}: {last}")


def build_scripture_images(poster: Image.Image) -> None:
    SCRIPTURE.mkdir(parents=True, exist_ok=True)
    failures = []
    for name, url in REMOTE:
        try:
            save_normalized(download_image(url), SCRIPTURE / name)
        except Exception as exc:
            failures.append((name, str(exc)))
            # Realistic same-origin fallback: use a clean worship crop from supplied poster.
            save_normalized(poster, SCRIPTURE / name)

    for name, source in LOCAL:
        if source.exists():
            save_normalized(Image.open(source), SCRIPTURE / name)
        else:
            save_normalized(poster, SCRIPTURE / name)

    if failures:
        print("V74 image fetch fallbacks:", failures)


def verify() -> None:
    required = [POSTER_OUT, LOGO_OUT]
    required += [SCRIPTURE / name for name, _ in REMOTE]
    required += [SCRIPTURE / name for name, _ in LOCAL]
    for p in required:
        if not p.exists() or p.stat().st_size < 5000:
            raise RuntimeError(f"Missing/invalid generated asset: {p}")
    with Image.open(POSTER_OUT) as im:
        if im.width / im.height < 0.50 or im.width / im.height > 0.60:
            raise RuntimeError(f"Login poster aspect ratio is wrong: {im.size}")
    with Image.open(LOGO_OUT) as im:
        if im.size != (640, 640):
            raise RuntimeError(f"Logo size is wrong: {im.size}")
    for p in SCRIPTURE.glob("*.jpg"):
        with Image.open(p) as im:
            if im.size != (1080, 1350):
                raise RuntimeError(f"Scripture image dimensions wrong: {p} {im.size}")


def main() -> None:
    poster = reconstruct_poster()
    build_logo(poster)
    build_scripture_images(poster)
    verify()
    print("V74 assets built successfully")


if __name__ == "__main__":
    main()
