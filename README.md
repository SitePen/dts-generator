.d.ts generator
===============

Generates a single .d.ts bundle containing external module declarations generated from TypeScript files.

## What does this mean?

If you have a project with lots of individual TypeScript files that are designed to be consumed as external modules,
the TypeScript compiler doesn’t allow you to actually create a single bundle out of them. This package leverages the
TypeScript language services in TypeScript 1.4+ to generate a single .d.ts file containing multiple
`declare module 'foo'` declarations. This allows you to distribute a single .d.ts file along with your compiled
JavaScript that users can simply reference from the TypeScript compiler using a `/// <reference path />` comment.

.d.ts generator will also correctly merge non-external-module files, and any already-existing .d.ts files.

## Usage

1. Run setup.sh and follow the instructions to build.

2. Generate your d.ts bundle:

   Programmatically:

   ```js
require('dts-generator').generate({
	name: 'package-name',
	baseDir: '/path/to/package-directory',
	out: 'package-name.d.ts'
});
```

   Command-line:

   ```bash
node bin/dts-generator.js --name package-name --baseDir /path/to/package-directory --out package-name.d.ts
```

3. Reference your generated d.ts bundle from somewhere in your consumer module and import away!:

   ```ts
/// <reference path="typings/package-name.d.ts" />

import Foo = require('package-name/Foo');

// ...
```

## Options

* `baseDir: string`: The base directory for the package being bundled. Any dependencies discovered outside this
  directory will be excluded from the bundle.
* `excludes?: string[]`: A list of files, relative to `baseDir`, that should be excluded from the bundle.
* `eol?: string`: The end-of-line character that should be used when outputting code. Defaults to `os.EOL`.
* `indent?: string`: The character(s) that should be used to indent the declarations in the output. Defaults to `\t`.
* `name: string`: The name of the package. Used to determine the correct exported package name for modules.
* `out: string`: The filename where the generated bundle will be created.
* `target?: ts.ScriptTarget`: The target environment for generated code. Defaults to `ts.ScriptTarget.Latest`.

## Known issues

* dts-generator uses APIs that are exposed by TypeScript but are not part of the language services’ own declarations
  file, so some compiler warnings are emitted when building it at the moment
* You need to jump through hoops, run setup.sh and use a pre-release version of TypeScript at the moment
* The API should allow a list of files to be sent instead of a single directory
* Output bundle code formatting is not perfect yet

## Thanks

@fdecampredon for the idea to dump output from the compiler emitter back into the compiler parser instead of trying to
figure out how to influence the code emitter.

## Licensing

© 2015 SitePen, Inc. New BSD License.
