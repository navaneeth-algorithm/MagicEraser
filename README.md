# Magic Eraser for macOS

A local desktop photo cleanup app powered by Lama Cleaner. The app runs in an Electron window and keeps the large AI models outside the application bundle.

## Demo

[![Magic Eraser demo](magiceraser.gif)](magicerasser.mp4)

Click the preview to watch the full MP4 demo.

## Download and Install

The Git repository contains the app source, not the generated `dist` bundle. The bundle is large and is intentionally excluded from Git. For a distributable app, build a DMG using the packaging steps below or publish the DMG as a GitHub Release asset.

## Run the App Locally

Open the packaged app:

```bash
open "dist/mac-arm64/Magic Eraser.app"
```

To install it manually after building, open the `dist/mac-arm64` folder and drag `Magic Eraser.app` into the Mac `Applications` folder. Since local builds are unsigned, macOS may require Control-clicking the app and choosing **Open** the first time.

On the first launch, choose the folder containing the model cache. The app remembers this location for future launches.

Expected model files:

```text
<model-folder>/torch/hub/checkpoints/big-lama.pt
<model-folder>/torch/hub/checkpoints/sam_vit_l_0b3195.pth
```

The current model folder is usually:

```text
~/.cache
```

The first startup can take about a minute while Torch and the models load. The app then opens the existing Lama Cleaner editor inside a native macOS window. Safari and Chrome are not required.

The setup screen also accepts direct `.pt` and `.pth` URLs. Downloaded files are placed in the selected model folder.

## Build the App

From a fresh clone, install the JavaScript build dependencies:

```bash
npm install
```

The embedded Python runtime is built from the local `venv`. To rebuild it after changing dependencies:

```bash
source venv/bin/activate
./build_runtime.sh
```

Build an unpacked app for local testing:

```bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run build
```

The app is created at:

```bash
dist/mac-arm64/Magic Eraser.app
```

Build a distributable DMG with:

```bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run package
```

The DMG is created under `dist`. A signed and notarized release requires an Apple Developer certificate and notarization credentials.

## Runtime Layout

- `main.js`: Electron process and backend lifecycle
- `setup.html`: first-run model setup screen
- `preload.js`: secure renderer bridge
- `server_entry.py`: packaged Lama Cleaner entry point
- `runtime-dist`: PyInstaller runtime used by the app
- `dist`: generated application bundle
- `venv`: development environment used when rebuilding

The model files are intentionally not bundled into the app. This keeps the application smaller and lets users store the models on another disk.

## Project Layout

This repository is the flattened desktop app project; there is no separate `mac_app` directory.

```text
main.js              Electron main process
setup.html           Model setup screen
server_entry.py      Lama Cleaner entry point
runtime-dist/        Bundled Python runtime
dist/                Generated macOS app
venv/                Local rebuild environment
```

## Troubleshooting

The backend log is stored at:

```text
~/Library/Application Support/magic-eraser-desktop/lama-cleaner.log
```

If the app asks for models again, select the parent folder containing `torch/hub/checkpoints`, not the `checkpoints` folder itself.

## References

- [LaMa](https://github.com/advimman/lama): original resolution-robust image inpainting project
- [Lama Cleaner](https://github.com/Sanster/lama-cleaner): local image editing backend and web interface
- [Segment Anything](https://github.com/facebookresearch/segment-anything): interactive segmentation model

## License

See [LICENSE](LICENSE) for the original LaMa project license and attribution.
