#!/usr/bin/env python3
from __future__ import annotations

import base64
import io
import urllib.request
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SRC = ROOT / "assets-src" / "v74"
LOGIN_SRC = ROOT / "assets-src" / "v73"
SCRIPTURE = ASSETS / "scripture-v74"
LOGIN_OUT = ASSETS / "v76-login-poster.webp"
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

SCRIPTURE_REMOTE_SOURCES = [
    "https://images.pexels.com/photos/28896476/pexels-photo-28896476.jpeg?auto=compress&cs=tinysrgb&w=1400",
    "https://images.pexels.com/photos/34923397/pexels-photo-34923397.jpeg?auto=compress&cs=tinysrgb&w=1400",
    "https://images.pexels.com/photos/29179297/pexels-photo-29179297.jpeg?auto=compress&cs=tinysrgb&w=1400",
    "https://images.pexels.com/photos/267559/pexels-photo-267559.jpeg?auto=compress&cs=tinysrgb&w=1400",
    "https://images.pexels.com/photos/5199806/pexels-photo-5199806.jpeg?auto=compress&cs=tinysrgb&w=1400",
    "https://images.pexels.com/photos/2356140/pexels-photo-2356140.jpeg?auto=compress&cs=tinysrgb&w=1400",
    "https://images.pexels.com/photos/133699/pexels-photo-133699.jpeg?auto=compress&cs=tinysrgb&w=1400",
    "https://images.pexels.com/photos/6284489/pexels-photo-6284489.jpeg?auto=compress&cs=tinysrgb&w=1400",
    "https://images.pexels.com/photos/935944/pexels-photo-935944.jpeg?auto=compress&cs=tinysrgb&w=1400",
    "https://images.pexels.com/photos/34328516/pexels-photo-34328516.jpeg?auto=compress&cs=tinysrgb&w=1400",
    "https://images.pexels.com/photos/15689008/pexels-photo-15689008.jpeg?auto=compress&cs=tinysrgb&w=1400",
    "https://images.pexels.com/photos/15689010/pexels-photo-15689010.jpeg?auto=compress&cs=tinysrgb&w=1400",
    "https://images.pexels.com/photos/8942891/pexels-photo-8942891.jpeg?auto=compress&cs=tinysrgb&w=1400",
    "https://images.pexels.com/photos/34612224/pexels-photo-34612224.jpeg?auto=compress&cs=tinysrgb&w=1400",
    "https://images.pexels.com/photos/7780806/pexels-photo-7780806.jpeg?auto=compress&cs=tinysrgb&w=1400",
]

FALLBACK_SOURCES = [
    ASSETS / "v49-youth-fellowship.webp",
    ASSETS / "v49-sunrise.webp",
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
    # Reconstruct the exact approved login artwork from committed source parts.
    parts = sorted(LOGIN_SRC.glob("poster.part*"))
    if not parts:
        raise RuntimeError("Exact login poster source parts are missing.")
    encoded = "".join(p.read_text(encoding="utf-8").strip() for p in parts)
    try:
        raw = base64.b64decode(encoded, validate=True)
        with Image.open(io.BytesIO(raw)) as im:
            im.load()
            if im.width < 500 or im.height < 900:
                raise RuntimeError(f"Unexpected login poster dimensions: {im.size}")
        LOGIN_OUT.write_bytes(raw)
    except Exception as exc:
        raise RuntimeError(f"Could not reconstruct exact login poster: {exc}") from exc

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
    if index % 2:
        im = ImageOps.mirror(im)
    if index % 4 == 3:
        im = im.filter(ImageFilter.GaussianBlur(radius=0.35))
    return im

def _download_photo(url: str) -> Image.Image:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 EFGC-Youth-App/78"},
    )
    with urllib.request.urlopen(request, timeout=35) as response:
        raw = response.read()
    if len(raw) < 15000:
        raise RuntimeError("Downloaded photo is unexpectedly small.")
    with Image.open(io.BytesIO(raw)) as src:
        return ImageOps.exif_transpose(src).convert("RGB")

def _portrait_photo(source: Image.Image) -> Image.Image:
    im = ImageOps.fit(
        source,
        (1080, 1350),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )
    im = ImageEnhance.Contrast(im).enhance(1.06)
    im = ImageEnhance.Color(im).enhance(1.04)
    return im

def build_scripture_tiles() -> None:
    SCRIPTURE.mkdir(parents=True, exist_ok=True)

    fallbacks = []
    for path in FALLBACK_SOURCES:
        if valid_image(path, 400, 400):
            fallbacks.append(Image.open(path).convert("RGB"))
    if not fallbacks:
        raise RuntimeError("No local Scripture fallback sources are available.")

    try:
        for idx, name in enumerate(TILE_NAMES):
            try:
                remote = _download_photo(SCRIPTURE_REMOTE_SOURCES[idx])
                try:
                    tile = _portrait_photo(remote)
                finally:
                    remote.close()
                print(f"Downloaded unique Scripture photo {idx + 1}/{len(TILE_NAMES)}")
            except Exception as exc:
                print(f"Remote Scripture photo {idx + 1} failed: {exc}; using local fallback.")
                tile = _variant(fallbacks[idx % len(fallbacks)], idx)

            try:
                tile.save(
                    SCRIPTURE / name,
                    "JPEG",
                    quality=90,
                    optimize=True,
                    progressive=True,
                )
            finally:
                tile.close()
    finally:
        for source in fallbacks:
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
