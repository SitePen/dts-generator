module.exports = function (grunt) {
	var dtsGenerator = require('../index').default;
	var path = require('path');

	grunt.registerMultiTask('dtsGenerator', function () {
		var done = this.async();

		var kwArgs = this.options();
		kwArgs.sendMessage = grunt.verbose.writeln.bind(grunt.verbose);
		kwArgs.files = this.filesSrc.map(function (filename) {
			if (kwArgs.hasOwnProperty('baseDir')) {
				return path.relative(kwArgs.baseDir, filename);
			}  else {
				return path.relative(kwArgs.project, filename);
			}
		});

		dtsGenerator(kwArgs).then(function () {
			grunt.log.writeln('Generated d.ts bundle at \x1b[36m' + kwArgs.out + '\x1b[39;49m');
			done();
		}, done);
	});
};
