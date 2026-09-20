"""Package the exact user-supplied 2026-09-20 EFGC Youth welcome image for GitHub Pages."""
from hashlib import sha256
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image

SOURCE = "https://d2ol7oe51mr4n9.cloudfront.net/user_3JWUZpcMSfms4wKF11rbDVcHjyJ/7064d407-f62e-4b59-a211-13148ccd04e3.png"
EXPECTED_SHA256 = "73a86948149ca28a0ef25085b1106fa662ec87547607cf4a81c27e8d24317de4"
DESTINATION = Path("assets/efgc-login-2026-09-20.webp")

def main():
    req = Request(SOURCE, headers={"User-Agent": "EFGC-Youth-Pages-build/83"})
    with urlopen(req, timeout=45) as response:
        original = response.read()
    digest = sha256(original).hexdigest()
    if digest != EXPECTED_SHA256:
        raise RuntimeError(f"EFGC welcome artwork checksum mismatch: {digest}")
    with Image.open(BytesIO(original)) as image:
        if image.size != (864, 1536):
            raise RuntimeError(f"Unexpected EFGC welcome artwork dimensions: {image.size}")
        DESTINATION.parent.mkdir(parents=True, exist_ok=True)
        image.convert("RGB").save(DESTINATION, "WEBP", quality=86, method=6)
    if DESTINATION.stat().st_size < 50000:
        raise RuntimeError("EFGC welcome artwork output was unexpectedly small")
    print(f"EFGC welcome artwork ready: {DESTINATION} ({DESTINATION.stat().st_size} bytes)")

if __name__ == "__main__":
    main()
