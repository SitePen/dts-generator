module.exports = function (grunt) {
	var dtsGenerator = require('../index');
	var path = require('path');

	grunt.registerMultiTask('dtsGenerator', function () {
		var done = this.async();
		var onProgress = grunt.verbose.writeln.bind(grunt.verbose);

		var kwArgs = this.options();
		kwArgs.files = this.filesSrc.map(function (filename) {
			return path.relative(kwArgs.baseDir, filename);
		});

		dtsGenerator.generate(kwArgs, onProgress).then(function () {
			grunt.log.writeln('Generated d.ts bundle at \x1b[36m' + kwArgs.out + '\x1b[39;49m');
			done();
		}, done);
	});
};
