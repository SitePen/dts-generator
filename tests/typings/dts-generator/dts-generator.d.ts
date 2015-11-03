/// <reference path="../../../node_modules/intern/typings/intern/intern.d.ts" />

declare module 'intern/dojo/node!../../index' {
	let dtsGenerator: any;
	export default dtsGenerator;
}

declare module 'intern/dojo/node!../../../bin/dts-generator' {
	let dtsGenerator: any;
	export = dtsGenerator;
}

declare module 'intern/dojo/node!fs' {
	import * as fs from 'fs';
	export = fs;
}
