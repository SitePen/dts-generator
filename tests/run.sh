#!/usr/bin/env bash
set -e
cd "$(dirname $0)/.."
echo "Linting files..."
node_modules/.bin/tslint --config tslint.json index.ts bin/dts-generator.ts tests/unit/all.ts
echo "Building modules..."
node_modules/.bin/tsc --project tsconfig.json
echo "Building tests..."
node_modules/.bin/tsc --project tests/tsconfig.json
echo "Running intern..."
npx intern config=tests/intern.json
echo "Cleanup..."
rm -rf tmp
