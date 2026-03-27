# geoviz-tauri-app

`geoviz-tauri-app` is the separate desktop consumer for the `geoviz` SDK. Its purpose is to exercise the charting packages from the perspective of a real application instead of allowing the SDK to stay tightly coupled to an internal demo.

This repo is intentionally separate from the SDK monorepo so that:

- packaging boundaries stay honest
- application concerns do not leak back into the SDK architecture
- the SDK can be validated as an external dependency surface
- the desktop app can evolve on its own schedule

## Purpose

The app is the shell where a future production workflow will live:

- Tauri desktop runtime
- TypeScript frontend using the `geoviz` SDK
- Rust backend for file I/O, long-running jobs, local caching, and domain preprocessing

At the current stage, this repo is a scaffolded consumer that proves:

- the SDK can be resolved from a separate repo
- the seismic and well-correlation charts can both be mounted in a Tauri-targeted frontend
- the local machine has the required Tauri toolchain and can produce a debug executable

## Current Setup

The frontend uses Vite and imports the SDK packages through local aliases that point to the sibling `geoviz` repo. This keeps the repos separate while avoiding the need to publish packages during active iteration.

Current chart surfaces in the scaffold:

- seismic section viewer
- well correlation panel viewer

The app is currently optimized for validating integration and buildability rather than for product UX polish.

## Tauri Toolchain

This repo now has the required local toolchain pieces in place:

- Rust with the MSVC toolchain
- WebView2 runtime
- Visual Studio Build Tools with the native desktop C++ workload
- local `@tauri-apps/cli`

The repo also includes the minimal `src-tauri/` structure needed for debug builds and future backend extension.

## Development

Frontend-only loop:

```bash
bun install
bun run dev:web
```

Frontend validation:

```bash
bun run typecheck
bun run build:web
```

Tauri loop:

```bash
bun run tauri:dev
```

Debug desktop build without bundling:

```bash
bunx tauri build --debug --no-bundle
```

## Relationship To geoviz

The SDK repo owns:

- chart data models
- chart-core math and layout
- renderers
- domain chart controllers
- demo and benchmark apps

This app repo owns:

- Tauri shell integration
- frontend consumption pattern for the SDK
- future Rust commands and backend orchestration
- future application workflow and product UX

## Immediate Next Steps

Likely next work in this repo:

- replace local aliasing with published or versioned SDK package consumption when the package boundaries stabilize
- add Rust commands for real data ingestion and transformation
- move from mock datasets to actual seismic and well-log sources
- add application-level state management, file loading, and session workflows
