const { analyzeApex } = require("../utils/salesforceServiceHelper");

//Method to validate apex classes
const validateApexTriggers = async (responseData, sendUpdate, apexTriggers) => {
    const issuesInApexTriggers = [];
    const fieldUpdatesInApexTriggers = [];

    if (!apexTriggers) {
        return issuesInApexTriggers;
    }
    apexTriggers.forEach(async (apexTrigger) => {
        const apexTriggerName = apexTrigger.name.split("/")[2];
        const apexTriggerContent = apexTrigger.fileContent;

        // Collect issues from individual checks
        const { analysisIssues, analysisFieldUpdates } = analyzeApex(apexTriggerContent);

        // Add issues to the result list
        if (analysisIssues.length > 0) {
            issuesInApexTriggers.push({ triggerName: apexTriggerName, issues: analysisIssues });
        }
        if (analysisFieldUpdates.length > 0) {
            analysisFieldUpdates.forEach(element => {
                fieldUpdatesInApexTriggers.push({ metadataName: apexTriggerName, objectName: element.objectName, fieldName: element.fieldName, source: "Apex Trigger" });
            });
            //fieldUpdatesInApexTriggers.push({ className: apexTriggerName, fieldUpdates: analysisFieldUpdates });
        }
    });
    //responseData.issuesInApexTriggers = issuesInApexTriggers;
    //responseData.fieldUpdatesInApexTriggers = fieldUpdatesInApexTriggers;
    //sendUpdate(responseData); // Send update for each class

    return { issuesInApexTriggers, fieldUpdatesInApexTriggers };
}

module.exports = { validateApexTriggers };