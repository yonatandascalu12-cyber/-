#!/usr/bin/env bash
# Bundle src/ (three.js world) into assets/world.js.
# three.js internals use Math.random (UUIDs only) and requestAnimationFrame (setAnimationLoop, unused):
# both are replaced with deterministic stand-ins so the render is a pure function of timeline time.
set -euo pipefail
cd "$(dirname "$0")/.."
THREE_DIR=${THREE_DIR:-/tmp/hf/node_modules/three}; ${ESBUILD:-/tmp/hf/node_modules/.bin/esbuild} src/entry.js --alias:three=$THREE_DIR --bundle --format=iife --minify \
  --banner:js='var __hfSeed=1;function __hfRand(){__hfSeed=(__hfSeed*16807)%2147483647;return(__hfSeed-1)/2147483646}function __hfNoFrame(){return 0}' \
  --outfile=assets/world.js
sed -i -e 's/Math\.random()/__hfRand()/g' -e 's/cancelAnimationFrame/__hfNoFrame/g' -e 's/requestAnimationFrame/__hfNoFrame/g' assets/world.js
grep -c "Math.random\|requestAnimationFrame" assets/world.js || true
