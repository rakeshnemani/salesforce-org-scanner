const issueRegistry = {
    //flow issues
    "Issue-1001": { priority: "High", category: "Flow Issue", description: "Flow has no entry condition." },
    "Issue-1002": { priority: "High", category: "Flow Issue", description: "Updating the Triggering Record in After Save Flow." },
    "Issue-1003": { priority: "High", category: "Flow Issue", description: "Updating the Triggering Record in After Save Flow with multiple update elements." },

    //Apex issues
    "Issue-2001": { priority: "High", category: "Apex Issue", description: "Hardcoded Salesforce Ids are present in the code." },
    "Issue-2002": { priority: "High", category: "Apex Issue", description: "DML operation found inside a loop." },
    "Issue-2003": { priority: "High", category: "Apex Issue", description: "SOQL query found inside a loop." },

    //Apex Test Class issues
    "Issue-3001": { priority: "Low", category: "Apex Test Class Issue", description: "Test class is missing @isTest annotation." },
    "Issue-3002": { priority: "Low", category: "Apex Test Class Issue", description: "Test class is missing @testSetup annotation." },
    "Issue-3003": { priority: "High", category: "Apex Test Class Issue", description: "@IsTest(SeeAllData=true) annotation is present in class definition." },
    "Issue-3004": { priority: "Low", category: "Apex Test Class Issue", description: "System.runAs Method is not used in test class." },
    "Issue-3005": { priority: "Low", category: "Apex Test Class Issue", description: "Test.startTest() is missing in test method." },
    "Issue-3006": { priority: "Low", category: "Apex Test Class Issue", description: "Test.stopTest() is missing in test method." },
    "Issue-3007": { priority: "Medium", category: "Apex Test Class Issue", description: "Assert function is missing in test method." }
};

export default issueRegistry;