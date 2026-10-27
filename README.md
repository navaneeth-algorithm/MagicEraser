# Magic Eraser for macOS

A local desktop photo cleanup app powered by Lama Cleaner. The app runs in an Electron window and keeps the large AI models outside the application bundle.

## Demo

<video controls width="720" src="https://github.com/navaneeth-algorithm/MagicEraser/releases/download/v1.0.0/magicerasser.mp4"></video>

[![Magic Eraser demo](magiceraser.gif)](https://github.com/navaneeth-algorithm/MagicEraser/releases/download/v1.0.0/magicerasser.mp4)

Click the preview to watch the full MP4 demo.

## Download and Install

End users should download the latest DMG from the repository's [Releases page](https://github.com/navaneeth-algorithm/MagicEraser/releases). The current release is [v1.0.0](https://github.com/navaneeth-algorithm/MagicEraser/releases/tag/v1.0.0). The Git repository contains the app source, not the generated `dist` bundle. The bundle is large and is intentionally excluded from Git.

Repository:

```text
https://github.com/navaneeth-algorithm/MagicEraser
```

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

Developers can clone and enter the repository with:

```bash
git clone https://github.com/navaneeth-algorithm/MagicEraser.git
cd MagicEraser
```

The build requires macOS, Node.js/npm, and Python 3.11. Install the JavaScript build dependencies:

```bash
npm install
```

The embedded Python runtime is built from a local Python environment containing Lama Cleaner, PyTorch, TorchVision, Segment Anything, and PyInstaller. That development environment is intentionally not committed because it is large and machine-specific. After preparing that environment, rebuild the embedded runtime with:

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

## First Run

The app opens a native Electron window and starts its local Lama Cleaner backend automatically. On first launch:

1. Choose the parent model folder, usually `~/.cache`.
2. Confirm that `torch/hub/checkpoints` contains `big-lama.pt` and `sam_vit_l_0b3195.pth`.
3. Click **Open Magic Eraser**.

The selected model path is saved for future launches. The frontend is served by the bundled Lama Cleaner runtime and displayed inside the Electron window; Safari and Chrome are not required.

## Models and Capabilities

Magic Eraser is a focused desktop wrapper around the Lama Cleaner inpainting workflow. It currently enables:

- **LaMa inpainting** for removing unwanted objects, people, marks, and defects
- **Interactive segmentation** for selecting an object with clicks before removing it
- **CPU inference** with interactive segmentation configured for Apple Silicon MPS
- **Local processing** without uploading images to a remote service

### Required Models

| File | Purpose |
| --- | --- |
| `big-lama.pt` | Main LaMa image inpainting model |
| `sam_vit_l_0b3195.pth` | Segment Anything interactive selection model |

Both files must be inside:

```text
<model-folder>/torch/hub/checkpoints/
```

The setup screen can download direct `.pt` and `.pth` URLs into this structure. The selected folder is saved locally and reused on later launches.

This app does not currently expose every model and plugin available in the wider IOPaint/Lama Cleaner ecosystem, such as Stable Diffusion replacement, outpainting, RealESRGAN, GFPGAN, RestoreFormer, anime segmentation, or background removal. Those projects are useful references for future features:

- [IOPaint models](https://www.iopaint.com/models)
- [IOPaint plugins](https://www.iopaint.com/plugins)
- [Lama Cleaner documentation](https://lama-cleaner.github.io/)

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
