export const loaders = {
	'host-browser': 'node_modules/dojo-loader/loader.js',
	'host-node': 'dojo-loader'
};

export const loaderOptions = {
	packages: [
		{ name: 'dts-generator', location: '.' }
	]
};

export const suites = [ 'dts-generator/tests/unit/all' ];

export const excludeInstrumentation = /^(?:tests|node_modules)\//;
