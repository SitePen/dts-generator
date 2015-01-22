#!/usr/bin/env bash
PATH=node_modules/.bin:$PATH
if [ ! -d "node_modules" ]; then
	npm install
fi

echo 'tsc built from 2052ac3 or later is necessary for success!'
echo '(Run `npm install` inside node_module/typescript and then'
echo ' run `jake LKG` to get it built in the right place)'
tsd reinstall
tsd rebundle
rm -rf typings/typescript
ln -s ../node_modules/typescript/bin typings/typescript
tsc -m commonjs -t es5 bin/dts-generator.ts index.ts
