import { StructurizrLexer } from "./lexer";
import * as lsp from "vscode-languageserver";
import { TextDocument } from 'vscode-languageserver-textdocument';
import { structurizrParser } from "./parser";
import { EOF } from "chevrotain";
import { structurizrToAST } from "./to-ast";
import { StructurizrError } from "./types";
import { processCheckers } from "./checkers";

export const checkStructurizr = (content: TextDocument): lsp.Diagnostic[] => {
	let errors: lsp.Diagnostic[] = [];
	const text = content.getText();

	// STEP 1. TOKENIZE THE FILE USING A LEXER
	const lexingResult = StructurizrLexer.tokenize(text);
	if (lexingResult.errors.length > 0) {
		errors = errors.concat(lexingResult.errors.map(e => ({
			severity: lsp.DiagnosticSeverity.Error,
			message: e.message,
			range: {
				start: { line: e.line ?? 0 - 1, character: e.column ?? 0 - 1 },
				end: content.positionAt(content.offsetAt({ line: e.line ?? 0 - 1, character: e.column ?? 0 - 1 }) + e.length)
			}
		})));
	}

	// STEP 2. RUN TOKENS THROUGH THE PARSER
	// The error tokens is just ignored so we can find more errors in parsing stage
/* 	structurizrParser.input = lexingResult.tokens;
	const parsingResult = structurizrParser.structurizr();
	if (structurizrParser.errors.length > 0) {
		errors = errors.concat(structurizrParser.errors.map(e => ({
			severity: lsp.DiagnosticSeverity.Error,
			message: e.message,
			range: e.token.tokenType === EOF ? {
				start: content.positionAt(text.length),
				end: content.positionAt(text.length),
			} : {
					start: { line: e.token.startLine - 1, character: e.token.startColumn - 1 },
					end: { line: e.token.endLine - 1, character: e.token.endColumn },
				}
		})
		));
	} else {
		const astResult = structurizrToAST(parsingResult);
		errors = errors.concat(astResult.errors.map(e => transformStructurizrError(e, content.uri)));
		const checkerErrors = processCheckers(astResult.ast);
		errors = errors.concat(checkerErrors.map(e => transformStructurizrError(e, content.uri)));
	} */
	return errors;
};

// const transformStructurizrError = (e: StructurizrError, uri: string): lsp.Diagnostic => ({
// 	severity: e.severity,
// 	message: e.message,
// 	range: {
// 		start: { line: e.location.startLine ?? 0 - 1, character: e.location.startColumn ?? 0 - 1 },
// 		end: { line: e.location.endLine ?? 0 - 1, character: e.location.endColumn ?? 0},
// 	},
// 	relatedInformation: e.relatedInfo ? e.relatedInfo.map(info => ({
// 		message: info.message,
// 		location: {
// 			uri: uri,
// 			range: {
// 				start: { line: info.location.startLine ?? 0 - 1, character: info.location.startColumn ?? 0 - 1 },
// 				end: { line: info.location.endLine ?? 0 - 1, character: info.location.endColumn },
// 			}
// 		},
// 	})) : undefined
// });