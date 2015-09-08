/// <reference path="../../../node_modules/intern/typings/intern/intern.d.ts" />

declare module 'intern/dojo/node!../../index' {
	import dtsGenerator = require('index');
	export = dtsGenerator;
}

declare module 'intern/dojo/node!fs' {
	import fs = require('fs');
	export = fs;
}
