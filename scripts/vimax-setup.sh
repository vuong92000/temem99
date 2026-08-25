#!/usr/bin/env bash
# Re-provisions the vendored ViMax workspace after a sandbox restart.
# .venv and web/node_modules are excluded from snapshots, so they must be
# recreated. Run from anywhere:  bash scripts/vimax-setup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VIMAX="$ROOT/vimax"
export PATH="$HOME/.local/bin:$PATH"

# 1. uv (PyPI is the only Python package source reachable from this sandbox)
if ! command -v uv >/dev/null 2>&1; then
  pip3 install --user --break-system-packages uv
fi
uv --version

# 2. Python deps. The sandbox cannot download standalone CPython (GitHub
#    release assets are blocked), so we pin the system Python (3.11) —
#    requires-python in vimax/pyproject.toml was relaxed to >=3.11 for it.
cd "$VIMAX"
uv sync --python /usr/bin/python3

# 3. Headless container has no libGL: opencv-python breaks on import.
#    Swap it for the headless build at the same version (idempotent).
if uv pip list 2>/dev/null | awk '/^opencv-python /{found=1} END{exit !found}'; then
  VER="$(uv pip list 2>/dev/null | awk '/^opencv-python /{print $2}')"
  uv pip uninstall opencv-python
  uv pip install "opencv-python-headless==$VER"
fi

# 4. Private agent config (kept out of the upstream repo; safe to recreate)
cp -n configs/agent.example.yaml configs/agent.local.yaml || true

# 5. Frontend deps
cd "$VIMAX/web"
[ -d node_modules ] || npm install --no-audit --no-fund

# Sanity check
"$VIMAX/.venv/bin/python3" -c "import langchain, openai, google.genai, moviepy, cv2, faiss, yaml, aiohttp; print('vimax imports OK')"
echo "setup complete"
