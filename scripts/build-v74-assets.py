#!/usr/bin/env python3
from __future__ import annotations

import base64
import io
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SRC = ROOT / "assets-src" / "v74"
SCRIPTURE = ASSETS / "scripture-v74"
LOGIN_OUT = ASSETS / "v74-login-poster.webp"
LOGO_OUT = ASSETS / "v76-efgc-logo.png"

TILE_NAMES = [
    "bible-light.jpg",
    "open-bible.jpg",
    "bible-devotion.jpg",
    "bible-sunrise.jpg",
    "scripture-pages.jpg",
    "quiet-time.jpg",
    "blue-cross.jpg",
    "sunrise-cross.jpg",
    "bible-community.jpg",
    "prayer-bible.jpg",
    "youth-worship.jpg",
    "sunrise-faith.jpg",
    "church-light.jpg",
    "prayer-hands.jpg",
    "cross-sky.jpg",
]

FALLBACK_SOURCES = [
    ASSETS / "v49-youth-fellowship.webp",
    ASSETS / "v49-sunrise.webp",
    ASSETS / "v74-login-poster.webp",
    ASSETS / "efgc-home-hero.webp",
]

def valid_image(path: Path, min_w: int = 1, min_h: int = 1) -> bool:
    if not path.exists() or path.stat().st_size < 1000:
        return False
    try:
        with Image.open(path) as im:
            return im.width >= min_w and im.height >= min_h
    except Exception:
        return False

def build_login() -> None:
    # The exact user-approved login poster is committed directly to assets/.
    # Do not transcode it here: browsers already consume the supplied WebP directly.
    if not LOGIN_OUT.exists() or LOGIN_OUT.stat().st_size < 5000:
        raise RuntimeError(f"Exact login poster missing or undersized: {LOGIN_OUT}")

def build_logo() -> None:
    # Reconstruct the exact approved EFGC logo from the committed source parts.
    parts = sorted(SRC.glob("logo.part*"))
    if not parts:
        raise RuntimeError("Exact EFGC logo source parts are missing.")
    encoded = "".join(p.read_text(encoding="utf-8").strip() for p in parts)
    try:
        raw = base64.b64decode(encoded, validate=True)
        src = Image.open(io.BytesIO(raw)).convert("RGBA")
    except Exception as exc:
        raise RuntimeError(f"Could not decode exact EFGC logo source: {exc}") from exc
    try:
        im = ImageOps.contain(src, (640, 640), method=Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (640, 640), (0, 0, 0, 0))
        canvas.alpha_composite(im, ((640 - im.width) // 2, (640 - im.height) // 2))
        canvas.save(LOGO_OUT, "PNG", optimize=True)
    finally:
        src.close()

def _variant(source: Image.Image, index: int) -> Image.Image:
    # Deterministic high-resolution crops/grades. These are same-origin fallbacks
    # so poster generation never fails because of a remote image/CORS dependency.
    im = ImageOps.exif_transpose(source).convert("RGB")
    w, h = im.size
    ratio = 1080 / 1350
    crop_w = min(w, int(h * ratio))
    crop_h = min(h, int(w / ratio))
    max_x = max(0, w - crop_w)
    max_y = max(0, h - crop_h)
    x_steps = (0.15, 0.50, 0.85)
    y_steps = (0.12, 0.34, 0.58, 0.78, 0.90)
    cx = int(max_x * x_steps[index % len(x_steps)])
    cy = int(max_y * y_steps[(index // len(x_steps)) % len(y_steps)])
    im = im.crop((cx, cy, cx + crop_w, cy + crop_h))
    im = im.resize((1080, 1350), Image.Resampling.LANCZOS)

    brightness = (0.78, 0.88, 0.96, 1.04, 1.10)[index % 5]
    contrast = (1.06, 1.12, 1.18)[index % 3]
    color = (0.90, 0.98, 1.06)[(index // 2) % 3]
    im = ImageEnhance.Brightness(im).enhance(brightness)
    im = ImageEnhance.Contrast(im).enhance(contrast)
    im = ImageEnhance.Color(im).enhance(color)
    if index % 4 == 3:
        im = im.filter(ImageFilter.GaussianBlur(radius=0.35))
    return im

def build_scripture_tiles() -> None:
    sources = []
    for path in FALLBACK_SOURCES:
        if valid_image(path, 400, 400):
            sources.append(Image.open(path).convert("RGB"))
    if not sources:
        raise RuntimeError("No local Scripture background sources are available.")

    SCRIPTURE.mkdir(parents=True, exist_ok=True)
    try:
        for idx, name in enumerate(TILE_NAMES):
            source = sources[idx % len(sources)]
            tile = _variant(source, idx)
            tile.save(
                SCRIPTURE / name,
                "JPEG",
                quality=91,
                optimize=True,
                progressive=True,
            )
    finally:
        for source in sources:
            source.close()

def verify() -> None:
    required = [LOGIN_OUT, LOGO_OUT] + [SCRIPTURE / n for n in TILE_NAMES]
    for path in required:
        if not path.exists() or path.stat().st_size < 5000:
            raise RuntimeError(f"Missing or undersized asset: {path}")


    with Image.open(LOGO_OUT) as im:
        if im.size != (640, 640):
            raise RuntimeError(f"Bad logo output size: {im.size}")

    for path in (SCRIPTURE / n for n in TILE_NAMES):
        with Image.open(path) as im:
            if im.size != (1080, 1350):
                raise RuntimeError(f"Bad Scripture tile size: {path.name} {im.size}")

def main() -> None:
    build_login()
    build_logo()
    build_scripture_tiles()
    verify()
    print("V74 local visual assets built successfully")

if __name__ == "__main__":
    main()
