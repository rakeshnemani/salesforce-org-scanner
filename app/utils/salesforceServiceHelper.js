//Method to check if there is any hardcoded salesforce id in the class
const checkHardcodedIds = (fileContent) => {
    const hardcodedIdRegex = /\'[a-zA-Z0-9]{15}|[a-zA-Z0-9]{18}\'/g;
    const hardcodedIds = fileContent.match(hardcodedIdRegex) || [];
    return hardcodedIds.length > 0 ? ["Hardcoded Salesforce Ids are present in the class"] : [];
}

// Method to check if SOQL queries exist inside loops
const checkSOQLInLoops = (fileContent) => {
    const soqlInLoopIssues = [];

    // Regex to detect for/while loops
    const loopRegex = /\b(for|while)\s*\(.*\)\s*\{[\s\S]*?\}/g;
    const matches = fileContent.match(loopRegex) || [];

    matches.forEach(loop => {
        // Check if a SOQL query exists inside the loop
        if (/\[[\s\S]*?SELECT[\s\S]*?FROM[\s\S]*?\]/i.test(loop)) {
            soqlInLoopIssues.push("SOQL query found inside a loop.");
        }
    });
    return soqlInLoopIssues;
}

// Method to check if DML statements exist inside loops
const checkDMLInLoops = (fileContent) => {
    const dmlInLoopIssues = [];

    // Regex to detect for/while loops
    const loopRegex = /\b(for|while)\s*\(.*\)\s*\{[\s\S]*?\}/g;
    const matches = fileContent.match(loopRegex) || [];

    matches.forEach(loop => {
        // Check if a DML statement exists inside the loop
        if (/\b(insert|upsert|update|delete|undelete|merge)\s+[\s\S]+?;/i.test(loop)) {
            dmlInLoopIssues.push("DML operation found inside a loop.");
        }
    });

    return dmlInLoopIssues;
}

//Method to check the fields updates in classes
const extractFieldUpdatesFromApex = (fileContent) => {
    const fieldUpdates = [];

    // Regex to match field assignments excluding SOQL queries
    const fieldAssignmentRegex = /([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*=\s*[^=].*;/g;

    // Regex to detect SOQL queries
    const soqlRegex = /\[[\s\S]*?SELECT[\s\S]*?FROM[\s\S]*?\]/gi;

    // Extract SOQL queries to exclude them
    const soqlMatches = fileContent.match(soqlRegex) || [];

    // Extract field updates
    let match;
    while ((match = fieldAssignmentRegex.exec(fileContent)) !== null) {
        const [fullMatch, objectName, fieldName] = match;

        // Ignore if the match is inside a SOQL statement
        if (soqlMatches.some(soql => soql.includes(fullMatch))) {
            continue;
        }
        // Identify object name based on variable declarations
        const objectMatch = /([a-zA-Z0-9_]+)\s*=\s*new\s+([a-zA-Z0-9_]+)\s*\(/.exec(fileContent);
        const resolvedObjectName = objectMatch && objectMatch[2] ? objectMatch[2] : "Unknown";
        fieldUpdates.push({ objectName: resolvedObjectName, fieldName, source: "Apex" });
    }
    return fieldUpdates;
};

// Method to analyze an Apex class for various issues and extract field updates
const analyzeApex = (fileContent) => {
    const analysisIssues = [];
    const analysisFieldUpdates = [];

    // Check for hardcoded Salesforce IDs
    const hardcodedIdRegex = /\b[a-z0-9]\w{4}0\w{12}|[a-z0-9]\w{4}0\w{9}\b/i;
    const hardcodedIds = fileContent.match(hardcodedIdRegex) || [];
    if (hardcodedIds.length > 0) {
        //analysisIssues.push("Hardcoded Salesforce Ids are present in the class");
        analysisIssues.push("Issue-2001");
    }

    // Regex to detect for/while loops
    const loopRegex = /\b(for|while)\s*\((.*?)\)\s*\{([\s\S]*?)\}/g;
    let match;

    const aliasToObjectMap = [];

    while ((match = loopRegex.exec(fileContent)) !== null) {
        const loopHeader = match[2];
        const loopBody = match[3];

        // Detect alias and object type from loop header (e.g., for(Lead objLead:scope))
        const loopAliasMatch = /([a-zA-Z_][\w]*)\s+([a-zA-Z_][\w]*)\s*:\s*[\w\.\[\]]*/.exec(loopHeader);
        if (loopAliasMatch) {
            const objectType = loopAliasMatch[1];
            const alias = loopAliasMatch[2];
            aliasToObjectMap.push({ alias, objectType, scopeIndex: match.index });
        }

        // Only check for SOQL inside the loop body, not the loop header
        if (!/\[\s*SELECT[\s\S]*?FROM[\s\S]*?\]/i.test(loopHeader) && /\[\s*SELECT[\s\S]*?FROM[\s\S]*?\]/i.test(loopBody)) {
            //analysisIssues.push("SOQL query found inside a loop.");
            analysisIssues.push("Issue-2003");
        }

        // Improved DML detection inside loops
        const dmlRegex = /\b(insert|upsert|update|delete|undelete|merge)\s+(\w+)\s*;/gi;
        if (dmlRegex.test(loopBody)) {
            //analysisIssues.push("DML operation found inside a loop.");
            analysisIssues.push("Issue-2002");
        }
    }

    // Extract field updates
    const fieldAssignmentRegex = /([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*=\s*[^=].*?;/g;
    const soqlRegex = /\[\s*SELECT[\s\S]*?FROM[\s\S]*?\]/gi;
    const soqlMatches = fileContent.match(soqlRegex) || [];

    // Match object alias assignment from SOQL (e.g., Account acc1 = [SELECT...])
    const objectAliasRegex = /(?<!new\s)(\w+)\s+(\w+)\s*=\s*\[\s*SELECT/gi;

    // Match object instantiation (e.g., Account acc2 = new Account(...);)
    const objectInstantiationRegex = /(\w+)\s+(\w+)\s*=\s*new\s+(\w+)\s*\(/gi;

    // Match alias assignment from Trigger.new (e.g., Account acc = Trigger.new[0];)
    const triggerAliasRegex = /(\w+)\s+(\w+)\s*=\s*Trigger\.new\[\d*\]/gi;

    // Match alias assignment from Trigger.new without type (e.g., objLead = Trigger.new[0];)
    const untypedTriggerAliasRegex = /(\w+)\s*=\s*Trigger\.new\[\d*\]/gi;

    while ((match = objectAliasRegex.exec(fileContent)) !== null) {
        const objectType = match[1];
        const alias = match[2];
        aliasToObjectMap.push({ alias, objectType, scopeIndex: match.index });
    }

    while ((match = objectInstantiationRegex.exec(fileContent)) !== null) {
        const alias = match[2];
        const objectType = match[3];
        aliasToObjectMap.push({ alias, objectType, scopeIndex: match.index });
    }

    while ((match = triggerAliasRegex.exec(fileContent)) !== null) {
        const objectType = match[1];
        const alias = match[2];
        aliasToObjectMap.push({ alias, objectType, scopeIndex: match.index });
    }

    while ((match = untypedTriggerAliasRegex.exec(fileContent)) !== null) {
        const alias = match[1];
        // No fallback
    }

    while ((match = fieldAssignmentRegex.exec(fileContent)) !== null) {
        const [fullMatch, objectName, fieldName] = match;
        if (soqlMatches.some(soql => soql.includes(fullMatch))) {
            continue;
        }
        const alias = match[1];
        const matchIndex = match.index;
        const scopedAlias = aliasToObjectMap.filter(entry => entry.alias === alias && entry.scopeIndex <= matchIndex).sort((a, b) => b.scopeIndex - a.scopeIndex)[0];
        const resolvedObjectName = scopedAlias ? scopedAlias.objectType : "Unknown";
        analysisFieldUpdates.push({ objectName: resolvedObjectName, fieldName, source: "Apex" });
    }

    return { analysisIssues, analysisFieldUpdates };
};

module.exports = { checkHardcodedIds, checkSOQLInLoops, checkDMLInLoops, extractFieldUpdatesFromApex, analyzeApex };