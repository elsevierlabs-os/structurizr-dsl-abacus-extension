/* eslint-disable @typescript-eslint/naming-convention */

import { CstParser } from "chevrotain";
import { allTokens } from "./lexer";

class StructurizrParser extends CstParser {

    public structurizr = this.RULE("structurizr", () => {
        // this.SUBRULE();
    });

    constructor() {
        // see https://sap.github.io/chevrotain/docs/tutorial/step4_fault_tolerance.html for the error recovery heuristics
		super(allTokens, { recoveryEnabled: true, nodeLocationTracking: "full" });
		this.performSelfAnalysis();
    }
}

export const structurizrParser = new StructurizrParser();
export const BaseStructurizrVisitor = structurizrParser.getBaseCstVisitorConstructorWithDefaults();