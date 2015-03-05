/// <reference path="./typings/tsd" />

import fs = require('fs');
import glob = require('glob');
import mkdirp = require('mkdirp');
import os = require('os');
import pathUtil = require('path');
import Promise = require('bluebird');
import ts = require('typescript');

interface Options {
	baseDir: string;
	files: string[];
	excludes?: string[];
	externs?: string[];
	eol?: string;
	includes?: string[];
	indent?: string;
	main?: string;
	name: string;
	out: string;
	target?: ts.ScriptTarget;
}

export interface EmitterError extends Error {
	status: number;
}

var filenameToMid:(filename: string) => string = (function () {
	if (pathUtil.sep === '/') {
		return function (filename: string) {
			return filename;
		};
	}
	else {
		var separatorExpression = new RegExp(pathUtil.sep.replace('\\', '\\\\'), 'g');
		return function (filename: string) {
			return filename.replace(separatorExpression, '/');
		};
	}
})();

function getError(status: ts.EmitReturnStatus, diagnostics: ts.Diagnostic[]) {
	var message = 'Declaration generation failed with status ' + ts.EmitReturnStatus[status];

	diagnostics.forEach(function (diagnostic) {
		var position = diagnostic.file.getLineAndCharacterFromPosition(diagnostic.start);

		message +=
			`\n${diagnostic.file.filename}(${position.line},${position.character}): ` +
			`error TS${diagnostic.code}: ${diagnostic.messageText}`;
	});

	var error = <EmitterError> new Error(message);
	error.name = 'EmitterError';
	error.status = status;
	return error;
}

function getFilenames(baseDir: string, files:string[]): string[] {
	return files.map(function (filename) {
		return pathUtil.resolve(baseDir, filename);
	});
}

function processTree(sourceFile: ts.SourceFile, replacer:(node: ts.Node) => string): string {
	var code = '';
	var cursorPosition = 0;

	function skip(node: ts.Node) {
		cursorPosition = node.end;
	}

	function readThrough(node: ts.Node) {
		code += sourceFile.text.slice(cursorPosition, node.pos);
		cursorPosition = node.pos;
	}

	function visit(node: ts.Node) {
		readThrough(node);

		var replacement = replacer(node);

		if (replacement != null) {
			code += replacement;
			skip(node);
		}
		else {
			ts.forEachChild(node, visit);
		}
	}

	visit(sourceFile);
	code += sourceFile.text.slice(cursorPosition);

	return code;
}

export function generate(options: Options, sendMessage: (message: string) => void = function () {}) {
	var baseDir = pathUtil.resolve(options.baseDir);
	var eol = options.eol || os.EOL;
	var nonEmptyLineStart = new RegExp(eol + '(?!' + eol + '|$)', 'g');
	var indent = options.indent === undefined ? '\t' : options.indent;
	var target = options.target || ts.ScriptTarget.Latest;
	var compilerOptions: ts.CompilerOptions = {
		declaration: true,
		module: ts.ModuleKind.CommonJS,
		target: target
	};

	var filenames = getFilenames(baseDir, options.files);
	var excludesMap: { [filename: string]: boolean; } = {};
	options.excludes && options.excludes.forEach(function (filename) {
		excludesMap[pathUtil.resolve(baseDir, filename)] = true;
	});

	mkdirp.sync(pathUtil.dirname(options.out));
	var output = fs.createWriteStream(options.out, { mode: parseInt('644', 8) });

	var host = ts.createCompilerHost(compilerOptions);
	var program = ts.createProgram(filenames, compilerOptions, host);
	var checker = ts.createTypeChecker(program, true);

	var emitHost = ts.createEmitHostFromProgram(program);
	emitHost.writeFile = function (filename: string, data: string, writeByteOrderMark: boolean) {
		// Compiler is emitting the non-declaration file, which we do not care about
		if (filename.slice(-5) !== '.d.ts') {
			return;
		}

		writeDeclaration(ts.createSourceFile(filename, data, target, true));
	};

	var emitResolver = checker.getEmitResolver();

	return new Promise<void>(function (resolve, reject) {
		output.on('close', () => { resolve(undefined); });
		output.on('error', reject);

		if (options.externs) {
			options.externs.forEach(function (path: string) {
				sendMessage(`Writing external dependency ${path}`);
				output.write(`/// <reference path="${path}" />` + eol);
			});
		}

		program.getSourceFiles().some(function (sourceFile) {
			// Source file is a default library, or other dependency from another project, that should not be included in
			// our bundled output
			if (sourceFile.filename.indexOf(baseDir) !== 0) {
				return;
			}

			if (excludesMap[sourceFile.filename]) {
				return;
			}

			sendMessage(`Processing ${sourceFile.filename}`);

			// Source file is already a declaration file so should does not need to be pre-processed by the emitter
			if (sourceFile.filename.slice(-5) === '.d.ts') {
				writeDeclaration(sourceFile);
				return;
			}

			var emitOutput = ts.emitFiles(emitResolver, emitHost, sourceFile);
			if (emitOutput.emitResultStatus !== ts.EmitReturnStatus.Succeeded) {
				reject(getError(
					emitOutput.emitResultStatus,
					emitOutput.diagnostics
						.concat(program.getDiagnostics(sourceFile))
						.concat(checker.getDiagnostics(sourceFile))
				));

				return true;
			}
		});

		if (options.main) {
			output.write(`declare module '${options.name}' {` + eol + indent);
			output.write(`import main = require('${options.main}');` + eol + indent);
			output.write('export = main;' + eol);
			output.write('}' + eol);
			sendMessage(`Aliased main module ${options.name} to ${options.main}`);
		}

		output.end();
	});

	function writeDeclaration(declarationFile: ts.SourceFile) {
		var filename = declarationFile.filename;
		var sourceModuleId = options.name + filenameToMid(filename.slice(baseDir.length, -5));

		if (declarationFile.externalModuleIndicator) {
			output.write('declare module \'' + sourceModuleId + '\' {' + eol + indent);

			var content = processTree(declarationFile, function (node) {
				if (node.kind === ts.SyntaxKind.ExternalModuleReference) {
					var expression = <ts.LiteralExpression> (<ts.ExternalModuleReference> node).expression;

					if (expression.text.charAt(0) === '.') {
						return ' require(\'' + pathUtil.join(pathUtil.dirname(sourceModuleId), expression.text) + '\')';
					}
				}
				else if (node.kind === ts.SyntaxKind.DeclareKeyword) {
					return '';
				}
			});

			output.write(content.replace(nonEmptyLineStart, '$&' + indent));
			output.write(eol + '}' + eol);
		}
		else {
			output.write(declarationFile.text);
		}
	}
}
