Resolving module ids
===============

Callbacks can be provided as options for the dts-generator so the generated module ids can be customized.

## Example without callbacks

For example, without specifying the callback the generated `d.ts` output would be:
```ts
declare module 'currentModuleId' {
	import { something1 } from 'importedModuleId1';
	import { something2 } from 'importedModuleId2';
}
```

If you would like to customize the generated `'currentModuleId'`, `'importedModuleId1'` or `'importedModuleId2'` module ids according to your own logic, you can specify callbacks implementing your logic.

## Usage

The callbacks can be specified as the following:

```ts
let options = {
	// other options...
	resolveModuleId: (params: ResolveModuleIdParams): string => {
 		// implementation which returns a string or null.
	},
	resolveModuleImport: (params: ResolveModuleImportParams): string => {
 		// implementation which returns a string or null.
	}
}
```

You can define both callbacks or only one of them if needed.

The `resolveModuleId` will be invoked for each generated `declare module` statement. It will receive a parameter typed `ResolveModuleIdParams`:
```ts
interface ResolveModuleIdParams {
	/** The identifier of the module being declared in the generated d.ts */
	currentModuleId: string;
}
```

The `resolveModuleId` callback should return a string, and in that case that string will be used as a module id in the `declare module` statement. The callback may return a falsy value, for example null. In case of a falsy return value the module id in the generated `declare module` will be that would be written originally without specifying this callback.


The `resolveModuleImport` will be invoked for each generated `import` statement. It will receive a parameter typed `ResolveModuleImportParams`:

```ts
interface ResolveModuleImportParams {
	/** The identifier of the module currently being imported in the generated d.ts */
	importedModuleId: string;

	/** The identifier of the enclosing module currently being declared in the generated d.ts */
	currentModuleId: string;

	/** True if the imported module id is declared as a module in the input files. */
	isDeclaredExternalModule: boolean;
}
```

The `resolveModuleImport` callback should return a string, and in that case that string will be used as a module id in the `import` statement. The callback may return a falsy value, for example null. In case of a falsy return value the module id in the generated `import` will be that would be written originally without specifying this callback.

## Example with the callbacks

A simple example could be that:
 * replaces `'currentModuleId'` to `'replacedModuleId'` in the declaration,
 * replaces `'importedModuleId1'` to `'replacedImport1'` in all imports,
 * leaves other imported module ids untouched.

```ts
let options = {
	resolveModuleId: (params) => {
		// params.currentModuleId: 'currentModuleId' in the example.
 		if (params.currentModuleId === 'currentModuleId') {
			return 'replacedModuleId';
		}
		else {
			return null; // leave other module ids untouched
		}
	},

	resolveModuleImport: (params) => {
		// params.importedModuleId: 'importedModuleId1' for the first and 'importedModuleId2' for the second invocation in the example.
		// params.currentModuleId: 'currentModuleId' in the example.
		// params.isDeclaredExternalModule: false in the example.
 		if (params.importedModuleId === 'importedModuleId1') {
			return 'replacedImport1';
		}
		else {
			return null; // leave other module ids untouched
		}
	}
};
generate(options); // invokde dts-generator
```

In this case, the generated `d.ts` output for our example will be:
```ts
declare module 'replacedModuleId' {
	import { something1 } from 'replacedImport1';
	import { something2 } from 'referencedModuleId2';
}
```
