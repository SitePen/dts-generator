export let loaderOptions = {
	packages: [
		{ name: 'dts-generator', location: '.' }
	]
};

export let suites = [ 'dts-generator/tests/unit/all' ];

export let excludeInstrumentation = /^(?:tests|node_modules)\//;
