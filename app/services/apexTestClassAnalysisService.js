//const { checkHardcodedIds, checkSOQLInLoops, checkDMLInLoops } = require("../utils/salesforceServiceHelper");
import { checkHardcodedIds, checkSOQLInLoops, checkDMLInLoops } from "../utils/salesforceServiceHelper.js";

// Method to check if the class has @isTest annotation
const checkIsTestAnnotation = (testClassContent) => {
    return testClassContent.toLowerCase().includes("@istest") ? [] : ["Missing @isTest annotation in class definition"];
}

// Method to check if the class has @testSetup annotation
const checkTestSetupAnnotation = (testClassContent) => {
    return testClassContent.includes("@testSetup") ? [] : ["Missing @testSetup annotation in class definition"];
}

// Method to check if the class has @IsTest(SeeAllData=true) annotation
const checkTestSeeAllDataTrueAnnotation = (testClassContent) => {
    return testClassContent.includes("@IsTest(SeeAllData=true)") ? [] : ["SeeAllData=true annotation is present in class definition"];
}

// Method to check if the class has @runAs annotation is used
const checkTestRunAsMethod = (testClassContent) => {
    return testClassContent.includes("System.runAs") ? [] : ["System.runAs Method is not used in test class"];
}

// Method to prepare a list of methods in a test class
const getMethodsInTestClass = (testClassContent) => {
    const methodRegex = /\s+void\s+(\w+)\s*\([^)]*\)\s*{[^}]*}/g;
    const methods = testClassContent.match(methodRegex) || [];

    const allMethods = methods.map(method => {
        const methodName = method.match(/\s+void\s+(\w+)\s*\(/)[1];
        return { methodName, methodContent: method };
    });
    return allMethods;
}

// Method to check if each method has at least one Test.startTest()
const checkTestStartTestInMethods = (methods) => {
    const issues = [];
    methods.forEach(({ methodName, methodContent }) => {
        if (!methodContent.includes("Test.startTest()")) {
            issues.push(`Method ${methodName} is missing Test.startTest()`);
        }
    });
    return issues;
}

// Method to check if each method has at least one Test.stopTest()
const checkTestStopTestInMethods = (methods) => {
    const issues = [];
    methods.forEach(({ methodName, methodContent }) => {
        if (!methodContent.includes("Test.stopTest()")) {
            issues.push(`Method ${methodName} is missing Test.stopTest()`);
        }
    });
    return issues;
}

// Method to check if each method has at least one Assert function line
const checkAssertInMethods = (methods) => {
    const issues = [];
    methods.forEach(({ methodName, methodContent }) => {
        if (!methodContent.includes("Assert." || "System.assert")) {
            issues.push(`Method ${methodName} is missing Asserts`);
        }
    });
    return issues;
}

// Method to validate test classes
const validateTestClasses = async (responseData, sendUpdate, testClasses) => {
    const issuesInTestClasses = [];
    if (!testClasses) {
        return issuesInTestClasses;
    }
    for (let i = 0; i < testClasses.length; i++) {
        const testClass = testClasses[i];
        const testClassName = testClass.name.split("/")[2];
        const testClassContent = testClass.fileContent;
        const allMethods = getMethodsInTestClass(testClassContent);

        // Collect issues from individual checks
        const issues = [
            ...checkIsTestAnnotation(testClassContent),
            ...checkTestSetupAnnotation(testClassContent),
            ...checkTestSeeAllDataTrueAnnotation(testClassContent),
            ...checkTestRunAsMethod(testClassContent),
            ...checkHardcodedIds(testClassContent),
            ...checkSOQLInLoops(testClassContent),
            ...checkDMLInLoops(testClassContent),
            ...checkTestStartTestInMethods(allMethods),
            ...checkTestStopTestInMethods(allMethods),
            ...checkAssertInMethods(allMethods)
        ];

        // Add issues to the result list
        if (issues.length > 0) {
            issuesInTestClasses.push({ className: testClassName, issues: issues });
        }
    }
    //console.log("issuesInTestClasses:", JSON.stringify(issuesInTestClasses, null, 2));
    responseData.issuesInTestClasses = issuesInTestClasses;
    //sendUpdate(responseData); // Send update for each class
    return issuesInTestClasses;
}

//module.exports = { validateTestClasses };
export default validateTestClasses;