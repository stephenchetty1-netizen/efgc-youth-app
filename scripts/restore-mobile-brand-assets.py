#!/usr/bin/env python3
"""Reassemble the user's approved church logo and login poster from complete source parts.

The old committed V74 WebP files are truncated (RIFF length does not match actual
bytes), which left the mobile welcome page an entirely navy background.
"""
import base64
import struct
from pathlib import Path

root = Path(__file__).resolve().parents[1]

def restore(source, stem, destination):
    parts = sorted((root / source).glob(stem + ".part*"))
    if not parts:
        raise SystemExit("Missing original EFGC asset parts: " + source + "/" + stem)
    encoded = "".join("".join(p.read_text(encoding="ascii").split()) for p in parts)
    data = base64.b64decode(encoded, validate=True)
    expected = 8 + struct.unpack_from("<I", data, 4)[0]
    if data[:4] != b"RIFF" or data[8:12] != b"WEBP" or expected != len(data):
        raise SystemExit(f"Refusing invalid EFGC artwork: {source}/{stem}; got {len(data)}, expected {expected}")
    output = root / "assets" / destination
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(data)
    print(f"RESTORED {destination}: {len(data)} bytes, WebP RIFF OK")

restore("assets-src/v73", "poster", "v74-login-poster.webp")
restore("assets-src/v74", "logo", "v74-efgc-logo.webp")
