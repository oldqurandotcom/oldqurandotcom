#!/bin/bash
# Double-click this file to run the old (2023) Quran.com at http://localhost:3000
set -e
cd "$(dirname "$0")"

# The 2023 code needs Node 18; keep a private copy in .node/ so the system Node is untouched.
if [ ! -x .node/bin/node ]; then
  echo "Downloading Node 18 (one time only)..."
  mkdir -p .node
  ARCH=$(uname -m); [ "$ARCH" = "x86_64" ] && ARCH=x64
  curl -sL "https://nodejs.org/dist/v18.20.8/node-v18.20.8-darwin-$ARCH.tar.gz" | tar xz -C .node --strip-components=1
fi
export PATH="$PWD/.node/bin:$PATH"

if [ ! -d node_modules ]; then
  echo "Installing dependencies (one time only, a few minutes)..."
  npx --yes yarn@1.22.22 install --frozen-lockfile --ignore-engines
fi

if [ ! -f .next/BUILD_ID ]; then
  echo "Building the site (one time only, a few minutes)..."
  NODE_OPTIONS=--max-old-space-size=8192 npx --yes yarn@1.22.22 next build
fi

(sleep 3 && open "http://localhost:3000") &
echo "Old Quran.com is running at http://localhost:3000 — close this window to stop it."
npx --yes yarn@1.22.22 next start -p 3000
