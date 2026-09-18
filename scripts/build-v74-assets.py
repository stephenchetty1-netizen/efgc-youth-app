#!/usr/bin/env python3
from __future__ import annotations

import base64
import io
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SRC = ROOT / "assets-src" / "v74"
SCRIPTURE = ASSETS / "scripture-v74"
LOGIN_OUT = ASSETS / "v74-login-poster.webp"
LOGO_OUT = ASSETS / "v74-efgc-logo.png"

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

def decode_parts(prefix: str) -> bytes:
    parts = sorted(SRC.glob(f"{prefix}.part*"))
    if not parts:
        raise RuntimeError(f"No source parts found for {prefix}")
    encoded = "".join(p.read_text(encoding="utf-8").strip() for p in parts)
    try:
        return base64.b64decode(encoded, validate=True)
    except Exception as exc:
        raise RuntimeError(f"Invalid base64 for {prefix}: {exc}") from exc

def open_payload(prefix: str) -> Image.Image:
    raw = decode_parts(prefix)
    try:
        return Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise RuntimeError(f"Could not decode {prefix} image: {exc}") from exc

def build_login() -> None:
    im = open_payload("login")
    if im.width < 700 or im.height < 1200:
        raise RuntimeError(f"Login artwork too small: {im.size}")
    ASSETS.mkdir(parents=True, exist_ok=True)
    im.save(LOGIN_OUT, "WEBP", quality=92, method=6)

def build_logo() -> None:
    im = open_payload("logo")
    if im.width < 400 or im.height < 400:
        raise RuntimeError(f"Logo artwork too small: {im.size}")
    im = ImageOps.fit(im, (640, 640), method=Image.Resampling.LANCZOS)
    im.save(LOGO_OUT, "PNG", optimize=True)

def build_scripture_tiles() -> None:
    atlas = open_payload("atlas")
    if atlas.width < 1200 or atlas.height < 2500:
        raise RuntimeError(f"Scripture atlas too small: {atlas.size}")

    cols, rows = 3, 5
    tile_w = atlas.width // cols
    tile_h = atlas.height // rows
    if abs((tile_w / tile_h) - 0.8) > 0.04:
        raise RuntimeError(f"Unexpected atlas tile ratio: {tile_w}x{tile_h}")

    SCRIPTURE.mkdir(parents=True, exist_ok=True)
    for idx, name in enumerate(TILE_NAMES):
        row, col = divmod(idx, cols)
        left = col * tile_w
        top = row * tile_h
        right = atlas.width if col == cols - 1 else (col + 1) * tile_w
        bottom = atlas.height if row == rows - 1 else (row + 1) * tile_h
        tile = atlas.crop((left, top, right, bottom)).convert("RGB")
        tile = ImageOps.fit(tile, (1080, 1350), method=Image.Resampling.LANCZOS)
        tile.save(SCRIPTURE / name, "JPEG", quality=90, optimize=True, progressive=True)

def verify() -> None:
    required = [LOGIN_OUT, LOGO_OUT] + [SCRIPTURE / n for n in TILE_NAMES]
    for path in required:
        if not path.exists() or path.stat().st_size < 8000:
            raise RuntimeError(f"Missing or undersized asset: {path}")
    with Image.open(LOGIN_OUT) as im:
        if im.size[0] < 700 or im.size[1] < 1200:
            raise RuntimeError(f"Bad login output size: {im.size}")
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
    print("V74 exact local assets built successfully")

if __name__ == "__main__":
    main()
