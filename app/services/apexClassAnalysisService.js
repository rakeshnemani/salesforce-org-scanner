//const { analyzeApex } = require("../utils/salesforceServiceHelper");
import { analyzeApex } from "../utils/salesforceServiceHelper.js";

//Method to validate apex classes
const validateApexClasses = async (responseData, sendUpdate, apexClasses) => {
    const issuesInApexClasses = [];
    const fieldUpdatesInApexClasses = [];
    if (!apexClasses) {
        return issuesInApexClasses;
    }
    apexClasses.forEach(async (apexClass) => {
        const apexClassName = apexClass.name.split("/")[2];
        const apexClassContent = apexClass.fileContent;

        // Collect issues from individual checks
        const { analysisIssues, analysisFieldUpdates } = analyzeApex(apexClassContent);
        //add issues to the result list
        if (analysisIssues.length > 0) {
            issuesInApexClasses.push({ className: apexClassName, issues: analysisIssues });
        }
        if (analysisFieldUpdates.length > 0) {
            analysisFieldUpdates.forEach(element => {
                fieldUpdatesInApexClasses.push({ metadataName: apexClassName, objectName: element.objectName, fieldName: element.fieldName, source: "Apex Class" });
            });
            //fieldUpdatesInApexClasses.push({ className: apexClassName, fieldUpdates: analysisFieldUpdates });
        }
    });
    //responseData.issuesInApexClasses = issuesInApexClasses;
    //responseData.fieldUpdatesInApexClasses = fieldUpdatesInApexClasses;
    //sendUpdate(responseData); // Send update for each class

    return { issuesInApexClasses, fieldUpdatesInApexClasses };
}

/*//Method to get field updates from apex classes
const getFieldUpdatesFromApexClasses = async (responseData, sendUpdate, apexClasses) => {
    let fieldUpdatesInApexClasses = [];
    apexClasses.forEach((apexClass) => {
        const apexClassName = apexClass.name.split("/")[2];
        const apexClassContent = apexClass.fileContent
        const fieldUpdates = extractFieldUpdatesFromApex(apexClassContent);
        fieldUpdatesInApexClasses = fieldUpdatesInApexClasses.concat(fieldUpdates.map(update => ({
            ...update,
            className: apexClassName
        })));
    });
    responseData.fieldUpdatesInApexClasses = fieldUpdatesInApexClasses;
    sendUpdate(responseData);
    return fieldUpdatesInApexClasses;
}*/

//module.exports = { validateApexClasses };
export default validateApexClasses;