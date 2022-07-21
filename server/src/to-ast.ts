import { DiagnosticSeverity } from "vscode-languageserver";
import { CstChildrenDictionary, IToken, CstNode, ICstVisitor, CstNodeLocation } from "chevrotain";
import { BaseStructurizrVisitor } from "./parser";
import { WithLocation, StructurizrBool, structurizrBools, StructurizrError, StructurizrFile } from "./types";
import { workspace } from "vscode";

// This pass generate AST from CST.
// It will report errors for things that is valid in CST but not in AST.
// Additional error reporting should check AST instead of CST, so they are not included here
class ToASTVisitor extends BaseStructurizrVisitor implements ICstVisitor<StructurizrError[], any> {
    constructor() {
		super();
		this.validateVisitor();
	}

    structurizr(ctx: CstChildrenDictionary, errors: StructurizrError[]) : StructurizrFile {
        // ???
        return { workspace: {}};
    }
}

const toASTVisitor = new ToASTVisitor();

export const structurizrToAST = (structurizr: CstNode | CstNode[]) => {
    let errors: StructurizrError[] = [];
    const ast = toASTVisitor.visit(structurizr, errors) as StructurizrFile;
    return { ast, errors };
};