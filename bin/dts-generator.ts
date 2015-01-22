import dts = require('../index');

var kwArgs:{
	[key:string]: any;
	excludes?: string[];
} = {};

for (var i = 2, j = process.argv.length; i < j; i += 2) {
	var key = process.argv[i].replace(/^-+/, '');
	var value = process.argv[i + 1];

	if (key === 'exclude') {
		if (!kwArgs.excludes) {
			kwArgs.excludes = [];
		}

		kwArgs.excludes.push(value);
	}
	else {
		kwArgs[key] = value;
	}
}

[ 'baseDir', 'name', 'out' ].forEach(function (key) {
	if (!kwArgs[key]) {
		console.error('Missing required argument "' + key + '"');
		process.exit(1);
	}
});

dts.generate(<any> kwArgs);
