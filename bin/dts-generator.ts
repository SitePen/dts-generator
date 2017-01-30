import generate from '../index';

export default function main(argv: string[]): Promise<number | void> {
	const kwArgs: {
		[key: string]: any;
		baseDir?: string;
		exclude?: string[];
		externs?: string[];
		types?: string[];
		files: string[];
		project?: string;
		sendMessage?: (message: any, ...optionalParams: any[]) => void;
		verbose?: boolean;
	} = {
		files: [],
		sendMessage: console.log.bind(console)
	};

	for (let i = 0; i < argv.length; ++i) {
		const arg = argv[i];

		if (arg.charAt(0) === '-') {
			const key = argv[i].replace(/^-+/, '');
			const value = argv[i + 1];
			++i;

			if (key === 'exclude') {
				if (!kwArgs.exclude) {
					kwArgs.exclude = [];
				}

				kwArgs.exclude.push(value);
			}
			else if (key === 'extern') {
				if (!kwArgs.externs) {
					kwArgs.externs = [];
				}

				kwArgs.externs.push(value);
			}
			else if (key === 'types') {
				if (!kwArgs.types) {
					kwArgs.types = [];
				}

				kwArgs.types.push(value);
			}
			else if (key === 'verbose') {
				kwArgs.verbose = true;
				/* decrement counter, because vebose does not take a value */
				--i;
			}
			else {
				kwArgs[key] = value;
			}
		}
		else {
			kwArgs.files.push(argv[i]);
		}
	}

	[ 'out' ].forEach(function (key) {
		if (!kwArgs[key]) {
			console.error(`Missing required argument "${key}"`);
			process.exit(1);
		}
	});

	if (!kwArgs.baseDir && !kwArgs.project) {
		console.error(`Missing required argument of "baseDir" or "project"`);
		process.exit(1);
	}

	if (!kwArgs.project && kwArgs.files.length === 0) {
		console.error('Missing files');
		process.exit(1);
	}

	console.log('Starting');

	return generate(<any> kwArgs).then(function () {
		console.log('Done!');
	});
};
