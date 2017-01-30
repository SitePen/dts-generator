import * as fs from 'fs';
import * as glob from 'glob';
import * as mkdirp from 'mkdirp';
import * as os from 'os';
import * as pathUtil from 'path';
import * as Promise from 'bluebird';
import * as ts from 'typescript';

export interface ResolveModuleIdParams {
	/** The identifier of the module being declared in the generated d.ts */
	currentModuleId: string;
}

export interface ResolveModuleImportParams {
	/** The identifier of the module currently being imported in the generated d.ts */
	importedModuleId: string;

	/** The identifier of the enclosing module currently being declared in the generated d.ts */
	currentModuleId: string;

	/** True if the imported module id is declared as a module in the input files. */
	isDeclaredExternalModule: boolean;
}

export interface Options {
	baseDir?: string;
	project?: string;
	files?: string[];
	exclude?: string[];
	externs?: string[];
	types?: string[];
	eol?: string;
	includes?: string[];
	indent?: string;
	main?: string;
	moduleResolution?: ts.ModuleResolutionKind;
	name?: string;
	out: string;
	outDir?: string;
	rootDir?: string;
	target?: ts.ScriptTarget;
	sendMessage?: (message: any, ...optionalParams: any[]) => void;
	resolveModuleId?: (params: ResolveModuleIdParams) => string;
	resolveModuleImport?: (params: ResolveModuleImportParams) => string;
	verbose?: boolean;
	jsx?: ts.JsxEmit;
}

// declare some constants so we don't have magic integers without explanation
const DTSLEN = '.d.ts'.length;

const filenameToMid: (filename: string) => string = (function () {
	if (pathUtil.sep === '/') {
		return function (filename: string) {
			return filename;
		};
	}
	else {
		const separatorExpression = new RegExp(pathUtil.sep.replace('\\', '\\\\'), 'g');
		return function (filename: string) {
			return filename.replace(separatorExpression, '/');
		};
	}
})();

/**
 * A helper function that takes TypeScript diagnostic errors and returns an error
 * object.
 * @param diagnostics The array of TypeScript Diagnostic objects
 */
function getError(diagnostics: ts.Diagnostic[]) {
	let message = 'Declaration generation failed';

	diagnostics.forEach(function (diagnostic) {
		// not all errors have an associated file: in particular, problems with a
		// the tsconfig.json don't; the messageText is enough to diagnose in those
		// cases.
		if (diagnostic.file) {
			const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

			message +=
				`\n${diagnostic.file.fileName}(${position.line + 1},${position.character + 1}): ` +
				`error TS${diagnostic.code}: ${diagnostic.messageText}`;
		} else {
			message += `\nerror TS${diagnostic.code}: ${diagnostic.messageText}`;
		}
	});

	const error = new Error(message);
	error.name = 'EmitterError';
	return error;
}

function getFilenames(baseDir: string, files: string[]): string[] {
	return files.map(function (filename) {
		const resolvedFilename = pathUtil.resolve(filename);
		if (resolvedFilename.indexOf(baseDir) === 0) {
			return resolvedFilename;
		}

		return pathUtil.resolve(baseDir, filename);
	});
}

function processTree(sourceFile: ts.SourceFile, replacer: (node: ts.Node) => string): string {
	let code = '';
	let cursorPosition = 0;

	function skip(node: ts.Node) {
		cursorPosition = node.end;
	}

	function readThrough(node: ts.Node) {
		code += sourceFile.text.slice(cursorPosition, node.pos);
		cursorPosition = node.pos;
	}

	function visit(node: ts.Node) {
		readThrough(node);

		const replacement = replacer(node);

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

/**
 * Load and parse a TSConfig File
 * @param options The dts-generator options to load config into
 * @param fileName The path to the file
 */
function getTSConfig(options: Options, fileName: string): void {
	// TODO this needs a better design than merging stuff into options.
	// the trouble is what to do when no tsconfig is specified...

	const configText = fs.readFileSync(fileName, { encoding: 'utf8' });
	const result = ts.parseConfigFileTextToJson(fileName, configText);
	if (result.error) {
		throw getError([ result.error ]);
	}
	const configObject = result.config;
	const configParseResult = ts.parseJsonConfigFileContent(configObject, ts.sys, pathUtil.dirname(fileName));
	if (configParseResult.errors && configParseResult.errors.length) {
		throw getError(configParseResult.errors);
	}
	options.target = configParseResult.options.target;
	if (configParseResult.options.outDir) {
		options.outDir = configParseResult.options.outDir;
	}
	if (configParseResult.options.moduleResolution) {
		options.moduleResolution = configParseResult.options.moduleResolution;
	}
	if (configParseResult.options.rootDir) {
		options.rootDir = configParseResult.options.rootDir;
	}
	options.files = configParseResult.fileNames;

	if (configParseResult.options.jsx) {
		options.jsx = configParseResult.options.jsx;
	}
}

function isNodeKindImportDeclaration(value: ts.Node): value is ts.ImportDeclaration {
	return value && value.kind === ts.SyntaxKind.ImportDeclaration;
}

function isNodeKindExternalModuleReference(value: ts.Node): value is ts.ExternalModuleReference {
	return value && value.kind === ts.SyntaxKind.ExternalModuleReference;
}

function isNodeKindStringLiteral(value: ts.Node): value is ts.StringLiteral {
	return value && value.kind === ts.SyntaxKind.StringLiteral;
}

function isNodeKindExportDeclaration(value: ts.Node): value is ts.ExportDeclaration {
	return value && value.kind === ts.SyntaxKind.ExportDeclaration;
}

function isNodeKindExportAssignment(value: ts.Node): value is ts.ExportAssignment {
	return value && value.kind === ts.SyntaxKind.ExportAssignment;
}

function isNodeKindModuleDeclaration(value: ts.Node): value is ts.ModuleDeclaration {
	return value && value.kind === ts.SyntaxKind.ModuleDeclaration;
}

export default function generate(options: Options): Promise<void> {

	const noop = function (message?: any, ...optionalParams: any[]): void {};
	const sendMessage = options.sendMessage || noop;
	const verboseMessage = options.verbose ? sendMessage : noop;

	/* following tsc behaviour, if a project is specified, or if no files are specified then
	 * attempt to load tsconfig.json */
	if (options.project || !options.files || options.files.length === 0) {
		verboseMessage(`project = "${options.project || options.baseDir}"`);

		// if project isn't specified, use baseDir.  If it is and it's a directory,
		// assume we want tsconfig.json in that directory.  If it is a file, though
		// use that as our tsconfig.json.  This allows for projects that have more
		// than one tsconfig.json file.
		let tsconfigFilename: string;
		if (Boolean(options.project)) {
			if (fs.lstatSync(options.project).isDirectory()) {
				tsconfigFilename = pathUtil.join(options.project, 'tsconfig.json');
			} else {
				// project isn't a diretory, it's a file
				tsconfigFilename = options.project;
			}
		} else {
			tsconfigFilename = pathUtil.join(options.baseDir, 'tsconfig.json');
		}

		if (fs.existsSync(tsconfigFilename)) {
			verboseMessage(`  parsing "${tsconfigFilename}"`);
			getTSConfig(options, tsconfigFilename);
		}
		else {
			sendMessage(`No "tsconfig.json" found at "${tsconfigFilename}"!`);
			return new Promise<void>(function (resolve, reject) {
				reject(new SyntaxError('Unable to resolve configuration.'));
			});
		}
	}

	const baseDir = pathUtil.resolve(options.rootDir || options.project || options.baseDir);
	verboseMessage(`baseDir = "${baseDir}"`);
	const eol = options.eol || os.EOL;
	const nonEmptyLineStart = new RegExp(eol + '(?!' + eol + '|$)', 'g');
	const indent = options.indent === undefined ? '\t' : options.indent;
	const target = typeof options.target !== 'undefined' ? options.target : ts.ScriptTarget.Latest;
	verboseMessage(`taget = ${target}`);
	const compilerOptions: ts.CompilerOptions = {
		declaration: true,
		module: ts.ModuleKind.CommonJS,
		target: target
	};
	if (options.outDir) {
		verboseMessage(`outDir = ${options.outDir}`);
		compilerOptions.outDir = options.outDir;
	}
	if (options.rootDir) {
		verboseMessage(`rootDir = ${options.rootDir}`);
		compilerOptions.rootDir = options.rootDir;
	}
	if (options.moduleResolution) {
		verboseMessage(`moduleResolution = ${options.moduleResolution}`);
		compilerOptions.moduleResolution = options.moduleResolution;
	}
	if (options.jsx) {
		compilerOptions.jsx = options.jsx;
	}

	const filenames = getFilenames(baseDir, options.files);
	verboseMessage('filenames:');
	filenames.forEach(name => { verboseMessage('  ' + name); });
	const excludesMap: { [filename: string]: boolean; } = {};

	options.exclude = options.exclude || [ 'node_modules/**/*.d.ts' ];

	options.exclude && options.exclude.forEach(function (filename) {
		glob.sync(filename).forEach(function(globFileName) {
			excludesMap[filenameToMid(pathUtil.resolve(baseDir, globFileName))] = true;
		});
	});
	if (options.exclude) {
		verboseMessage('exclude:');
		options.exclude.forEach(name => { verboseMessage('  ' + name); });
	}

	mkdirp.sync(pathUtil.dirname(options.out));
	/* node.js typings are missing the optional mode in createWriteStream options and therefore
	 * in TS 1.6 the strict object literal checking is throwing, therefore a hammer to the nut */
	const output = fs.createWriteStream(options.out, <any> { mode: parseInt('644', 8) });

	const host = ts.createCompilerHost(compilerOptions);
	const program = ts.createProgram(filenames, compilerOptions, host);

	function writeFile(filename: string, data: string, writeByteOrderMark: boolean) {
		// Compiler is emitting the non-declaration file, which we do not care about
		if (filename.slice(-DTSLEN) !== '.d.ts') {
			return;
		}

		writeDeclaration(ts.createSourceFile(filename, data, target, true), true);
	}

	let declaredExternalModules: string[] = [];

	return new Promise<void>(function (resolve, reject) {
		output.on('close', () => { resolve(undefined); });
		output.on('error', reject);

		if (options.externs) {
			options.externs.forEach(function (path: string) {
				sendMessage(`Writing external dependency ${path}`);
				output.write(`/// <reference path="${path}" />` + eol);
			});
		}

		if (options.types) {
			options.types.forEach(function (type: string) {
				sendMessage(`Writing external @types package dependency ${type}`);
				output.write(`/// <reference types="${type}" />` + eol);
			});
		}

		sendMessage('processing:');
		let mainExportDeclaration = false;
		let mainExportAssignment = false;

		program.getSourceFiles().forEach(function (sourceFile) {
			processTree(sourceFile, function (node) {
				if (isNodeKindModuleDeclaration(node)) {
					const name = node.name;
					if (isNodeKindStringLiteral(name)) {
						declaredExternalModules.push(name.text);
					}
				}
				return null;
			});
		});

		program.getSourceFiles().some(function (sourceFile) {
			// Source file is a default library, or other dependency from another project, that should not be included in
			// our bundled output
			if (pathUtil.normalize(sourceFile.fileName).indexOf(baseDir) !== 0) {
				return;
			}

			if (excludesMap[filenameToMid(pathUtil.normalize(sourceFile.fileName))]) {
				return;
			}

			sendMessage(`  ${sourceFile.fileName}`);

			// Source file is already a declaration file so should does not need to be pre-processed by the emitter
			if (sourceFile.fileName.slice(-DTSLEN) === '.d.ts') {
				writeDeclaration(sourceFile, false);
				return;
			}

			// We can optionally output the main module if there's something to export.
			if (options.main && options.main === (options.name + filenameToMid(sourceFile.fileName.slice(baseDir.length, -3)))) {
				ts.forEachChild(sourceFile, function (node: ts.Node) {
					mainExportDeclaration = mainExportDeclaration || isNodeKindExportDeclaration(node);
					mainExportAssignment = mainExportAssignment || isNodeKindExportAssignment(node);
				});
			}

			const emitOutput = program.emit(sourceFile, writeFile);
			if (emitOutput.emitSkipped || emitOutput.diagnostics.length > 0) {
				reject(getError(
					emitOutput.diagnostics
						.concat(program.getSemanticDiagnostics(sourceFile))
						.concat(program.getSyntacticDiagnostics(sourceFile))
						.concat(program.getDeclarationDiagnostics(sourceFile))
				));

				return true;
			}
		});

		if (options.main && options.name) {
			output.write(`declare module '${options.name}' {` + eol + indent);
			if (compilerOptions.target >= ts.ScriptTarget.ES2015) {
				if (mainExportAssignment) {
					output.write(`export {default} from '${options.main}';` + eol + indent);
				}
				if (mainExportDeclaration) {
					output.write(`export * from '${options.main}';` + eol);
				}
			} else {
				output.write(`import main = require('${options.main}');` + eol + indent);
				output.write('export = main;' + eol);
			}
			output.write('}' + eol);
			sendMessage(`Aliased main module ${options.name} to ${options.main}`);
		}

		sendMessage(`output to "${options.out}"`);
		output.end();
	});

	function writeDeclaration(declarationFile: ts.SourceFile, isOutput: boolean) {
		// resolving is important for dealting with relative outDirs
		const filename = pathUtil.resolve(declarationFile.fileName);

		// use the outDir here, not the baseDir, because the declarationFiles are
		// outputs of the build process; baseDir points instead to the inputs.
		// However we have to account for .d.ts files in our inputs that this code
		// is also used for.  Also if no outDir is used, the compiled code ends up
		// alongside the source, so use baseDir in that case too.
		const outDir = (isOutput && Boolean(options.outDir)) ? pathUtil.resolve(options.outDir) : baseDir;

		const sourceModuleId = options.name ? options.name + filenameToMid(filename.slice(outDir.length, -DTSLEN)) : filenameToMid(filename.slice(outDir.length + 1, -DTSLEN));

		const currentModuleId = filenameToMid(filename.slice(outDir.length + 1, -DTSLEN));
		function resolveModuleImport(moduleId: string): string {
			const isDeclaredExternalModule: boolean = declaredExternalModules.indexOf(moduleId) !== -1;

			if (options.resolveModuleImport) {
				const resolved: string = options.resolveModuleImport({
					importedModuleId: moduleId,
					currentModuleId: currentModuleId,
					isDeclaredExternalModule: isDeclaredExternalModule
				});
				if (resolved) {
					return resolved;
				}
			}

			if (moduleId.charAt(0) === '.') {
				return filenameToMid(pathUtil.join(pathUtil.dirname(sourceModuleId), moduleId));
			}
		}
		/* For some reason, SourceFile.externalModuleIndicator is missing from 1.6+, so having
		 * to use a sledgehammer on the nut */
		if ((<any> declarationFile).externalModuleIndicator) {
			let resolvedModuleId: string = sourceModuleId;
			if (options.resolveModuleId) {
				const resolveModuleIdResult: string = options.resolveModuleId({
					currentModuleId: currentModuleId
				});
				if (resolveModuleIdResult) {
					resolvedModuleId = resolveModuleIdResult;
				}
			}

			output.write('declare module \'' + resolvedModuleId + '\' {' + eol + indent);

			const content = processTree(declarationFile, function (node) {
				if (isNodeKindExternalModuleReference(node)) {
					const expression = node.expression as ts.LiteralExpression;

					const resolved: string = resolveModuleImport(expression.text);
					if (resolved) {
						return ' require(\'' + resolved + '\')';
					}
				}
				else if (node.kind === ts.SyntaxKind.DeclareKeyword) {
					return '';
				}
				else if (
					isNodeKindStringLiteral(node) && node.parent &&
					(isNodeKindExportDeclaration(node.parent) || isNodeKindImportDeclaration(node.parent))
				) {
					const text = node.text;

					const resolved: string = resolveModuleImport(text);
					if (resolved) {
						return ` '${resolved}'`;
					}
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
