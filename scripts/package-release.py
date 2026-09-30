"""Create an immutable, checksum-addressed public frontend release asset."""
import hashlib
import json
import os
import re
import subprocess
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
browser = root / "dist" / "hs-tesis-front" / "browser"
tag = os.environ["RELEASE_TAG"]
if not re.fullmatch(r"v[0-9]+\.[0-9]+\.[0-9]+", tag):
    raise ValueError("Invalid release tag")
config = json.loads((browser / "runtime-config.json").read_text(encoding="utf-8"))
output = root / "dist" / "frontend.zip"
with ZipFile(output, "w", ZIP_DEFLATED) as archive:
    for file in sorted(browser.rglob("*")):
        if file.is_file():
            if file.is_symlink() or file.name.startswith(".") or file.suffix == ".map":
                continue
            archive.write(file, file.relative_to(browser).as_posix())
manifest = {"tag": tag, "commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip(),
            "sha256": hashlib.sha256(output.read_bytes()).hexdigest(), "apiBaseUrl": config["apiBaseUrl"]}
(root / "dist" / "frontend-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print("Frontend archive and public integrity manifest created.")
