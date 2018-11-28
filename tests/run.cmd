@echo off
pushd "%~dp0\.."

echo "Linting files..."
call node_modules/.bin/tslint --config tslint.json index.ts bin/dts-generator.ts tests/unit/all.ts
if %ERRORLEVEL% NEQ 0 goto exit

echo "Building modules..."
call node_modules/.bin/tsc --project tsconfig.json
if %ERRORLEVEL% NEQ 0 goto exit

echo "Building tests..."
call node_modules/.bin/tsc --project tests/tsconfig.json
if %ERRORLEVEL% NEQ 0 goto exit

echo "Running intern..."
call npx intern config=tests/intern.json
if %ERRORLEVEL% NEQ 0 goto exit

echo "Cleanup..."
rd /s/q tmp

:exit
popd
