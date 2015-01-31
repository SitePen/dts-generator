declare module 'typescript' {
	export function emitFiles(resolver: EmitResolver, host: any, targetSourceFile?: SourceFile): EmitResult;

	interface TypeChecker {
		getEmitResolver(): EmitResolver;
	}
}
