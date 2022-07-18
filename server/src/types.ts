import { CstNodeLocation } from "chevrotain"
import { DiagnosticSeverity } from "vscode-languageserver";

export interface WithLocation<T> {
	data: T,
	location: CstNodeLocation,
}

export interface StructurizrBool {
	kind: "bool",
	value: boolean
}

export const structurizrBools = new Set(["true", "false"]);

export interface StructurizrWorkspace {

}

export interface StructurizrFile {
	workspace: StructurizrWorkspace;
}

export interface StructurizrErrorRelatedInfo {
	message: string,
	location: CstNodeLocation,
}

export interface StructurizrError {
	message: string,
	location: CstNodeLocation,
	severity: DiagnosticSeverity,
	relatedInfo?: StructurizrErrorRelatedInfo[],
}