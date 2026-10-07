# GitHub Pages Deployment Guide

This repository is a Vite + React + TypeScript project. To deploy it to GitHub Pages, update the Vite config and add a deployment script.

## 1. Update `vite.config.ts`

```typescript
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: '/pos-project-sample/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
```

## 2. Update `package.json`

Add this script under `scripts`:

```json
"deploy": "npm run build && gh-pages -d dist"
```

Then install `gh-pages`:

```sh
npm install --save-dev gh-pages
```

## 3. Enable GitHub Pages

Because the repository is private, GitHub Pages requires either:
- a public repository, or
- a GitHub Pro account.

After making the repo public, open:
- `Settings` → `Pages`
- Select `Deploy from a branch`
- Choose branch: `gh-pages`
- Folder: `/ (root)`

## 4. Deploy the project

```sh
npm run build
npm run deploy
```

This will build the app and publish the `dist` folder to the `gh-pages` branch.

## 5. Site URL

Once deployed, the project should be available at:

```text
https://rakagilangputra.github.io/pos-project-sample/
```

## Important Note

The repository was originally private; if GitHub Pages is required for this project, the repository must be made public or GitHub Pro must be used.
