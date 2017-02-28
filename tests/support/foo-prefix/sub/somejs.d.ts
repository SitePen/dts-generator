
interface RubeGoldbergMachine {
	pieces: string[];
	stages: any[];
	start: Function;
}

declare module 'sub/somejs' {
	let exports: {
		js: RubeGoldbergMachine
	};
	export = exports;
}
