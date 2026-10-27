#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR="$SCRIPT_DIR"
RUNTIME_DIR="$SCRIPT_DIR/runtime-dist"

"$PROJECT_DIR/venv/bin/python" -m pip install pyinstaller
rm -rf "$RUNTIME_DIR" "$SCRIPT_DIR/model-cache"

mkdir -p "$SCRIPT_DIR/model-cache/torch/hub/checkpoints"
cp "$HOME/.cache/torch/hub/checkpoints/"*.pth "$SCRIPT_DIR/model-cache/torch/hub/checkpoints/"
cp "$HOME/.cache/torch/hub/checkpoints/"*.pt "$SCRIPT_DIR/model-cache/torch/hub/checkpoints/"

cd "$SCRIPT_DIR"
"$PROJECT_DIR/venv/bin/python" -m PyInstaller \
  --noconfirm \
  --clean \
  --onedir \
  --name MagicEraserRuntime \
  --collect-all lama_cleaner \
  --collect-all segment_anything \
  --collect-all torchvision \
  --hidden-import engineio.async_drivers.threading \
  --hidden-import simple_websocket \
  server_entry.py

mkdir -p "$RUNTIME_DIR"
cp -R "$SCRIPT_DIR/dist/MagicEraserRuntime" "$RUNTIME_DIR/"

printf 'Built runtime in %s\n' "$RUNTIME_DIR"