#!/usr/bin/env python3
"""Fetch and package six licensed Pexels photographs for the EFGC Scripture gallery.

This script runs during every GitHub Pages release before the source validator
and visual browser test. Fail closed if a source is unavailable; do not publish
broken or substituted Scripture imagery.
"""
from __future__ import annotations

from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "assets" / "scripture"
PHOTOS = [[415571,"dawn-cross"],[2258251,"prayer-bible"],[20889043,"mountain-cross"],[27434753,"blue-sky-cross"],[8383496,"morning-devotion"],[25186193,"cross-at-dusk"]]

def fetch(photo_id: int) -> bytes:
    url = ("https://images.pexels.com/photos/" + str(photo_id) +
           "/pexels-photo-" + str(photo_id) +
           ".jpeg?auto=compress&cs=tinysrgb&w=1800")
    req = Request(url, headers={"User-Agent": "EFGCYouthScripture/1.0",
                                 "Accept": "image/avif,image/webp,image/*"})
    with urlopen(req, timeout=45) as response:
        data = response.read(9_000_001)
        if len(data) > 9_000_000:
            raise ValueError("Photo exceeds 9 MB download budget")
    if len(data) < 20_000:
        raise ValueError("Image download is incomplete")
    return data

def main():
    DEST.mkdir(parents=True, exist_ok=True)
    for photo_id, name in PHOTOS:
        data = fetch(photo_id)
        try:
            with Image.open(BytesIO(data)) as image:
                image.load()
                image = ImageOps.exif_transpose(image).convert("RGB")
                if min(image.size) < 600:
                    raise ValueError(f"{name}: source resolution too small: {image.size}")
                # Portrait crop matches the 1080×1350 canvas, no stretch.
                image = ImageOps.fit(image, (1080, 1350),
                                     method=Image.Resampling.LANCZOS,
                                     centering=(0.5, 0.5))
                target = DEST / f"{name}.webp"
                image.save(target, "WEBP", quality=86, method=6)
        except UnidentifiedImageError as error:
            raise ValueError(f"{name}: not a valid photograph") from error
        with Image.open(target) as check:
            check.load()
            assert check.size == (1080, 1350)
        assert target.stat().st_size > 15000, f'{name}: re-encoded photo is unexpectedly small ({target.stat().st_size} bytes)'
        print(f"SCRIPTURE PHOTO OK {name}: {target.stat().st_size} bytes")

if __name__ == "__main__":
    main()
