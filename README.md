# Battle Cart Prototype

Browser-first Battle Cart prototype built with Vite, React, TypeScript, and PixiJS. The desktop build wraps the same production Vite output in Electron for offline Windows playtesting.

## Development

Install dependencies:

```sh
npm install
```

Run browser development:

```sh
npm run dev
```

Run Electron development:

```sh
npm run electron:dev
```

The Electron dev command starts the Vite dev server and opens the desktop shell against it.

## Browser Build

Create the production browser build:

```sh
npm run build
```

The build output is written to:

```text
dist/
```

Sprites from `Sprites/` are copied into `dist/Sprites/` as part of the build.

## Windows Desktop Build

Create the Windows desktop package:

```sh
npm run electron:build
```

This command runs the Vite production build first, then packages the Electron app.

Output location:

```text
desktop-build-final/
```

Expected executable:

```text
desktop-build-final/win-unpacked/Battle Cart Prototype.exe
```

Package type:

```text
Unpacked Windows app folder
```
