/*const { querySalesforce, retrieveMetadata, insertScannerResults } = require("../utils/salesforceAPI");
//const { retrieveMetadata } = require("../utils/salesforceAPI");
const { generateIssuePdf } = require("../utils/pdfGenerator");

const { validateApexTriggers } = require("./apexTriggerAnalysisService");
const { validateApexClasses } = require("./apexClassAnalysisService");
const { validateTestClasses } = require("./apexTestClassAnalysisService");

const { analyzeFlows } = require("./flowAnalysisService");

const issueRegistry = require("../config/issueRegistry");*/
//const { getFieldUpdatesFromApexClasses } = require("../utils/apexClassAnalysisService");

import { querySalesforce, retrieveMetadata, insertScannerResults } from "../utils/salesforceAPI.js";
//import { retrieveMetadata } from "../utils/salesforceAPI.js";
import generateIssuePdf from "../utils/pdfGenerator.js";

import validateApexTriggers from "./apexTriggerAnalysisService.js";
import validateApexClasses from "./apexClassAnalysisService.js";
import validateTestClasses from "./apexTestClassAnalysisService.js";

import analyzeFlows from "./flowAnalysisService.js";
import issueRegistry from "../config/issueRegistry.js";

// Fetch Flows & Process Builders
const getMetadataComponentDependency = async () => {
  const query = "SELECT id, MetadataComponentId, MetadataComponentName, MetadataComponentType, RefMetadataComponentId, RefMetadataComponentName, RefMetadataComponentNamespace, RefMetadataComponentType FROM MetadataComponentDependency where MetadataComponentType != 'Layout' and RefMetadataComponentType = 'CustomField' limit 100";
  return await querySalesforce(query);
};

// Fetch Salesforce Metadata
const getSalesforceMetadata = async (req, responseData, sendUpdate) => {
  const allMetadataItems = await retrieveMetadata(req, responseData, sendUpdate);
  let allMetadataItemsByType = [];
  allMetadataItems.forEach((metadataItem) => {
    allMetadataItemsByType = allMetadataItems.reduce((acc, metadataItem) => {
      let metadataType = metadataItem.name.split("/")[1];
      if (metadataType === "classes") {
        metadataItem.fileContent = removeCommentsFromApex(metadataItem.fileContent);
        metadataType = isTestClass(metadataItem.fileContent) ? "testClasses" : "classes";
      } else if (metadataType === "triggers") {
        metadataItem.fileContent = removeCommentsFromApex(metadataItem.fileContent);
      }
      if (!acc[metadataType]) {
        acc[metadataType] = [];
      }
      acc[metadataType].push(metadataItem);
      return acc;
    }, {});
  });

  //Validate the issues in apex triggers, apex classes and test classes
  console.log("Analyzing Apex Triggers");
  const { issuesInApexTriggers, fieldUpdatesInApexTriggers } = await validateApexTriggers(responseData, sendUpdate, allMetadataItemsByType.triggers);

  console.log("Analyzing Apex Classes");
  const { issuesInApexClasses, fieldUpdatesInApexClasses } = await validateApexClasses(responseData, sendUpdate, allMetadataItemsByType.classes);

  //console.log("Analyzing Apex Test Classes");
  //const issuesInTestClasses = await validateTestClasses(responseData, sendUpdate, allMetadataItemsByType.testClasses);

  // Validate the issues in flows
  console.log("Analyzing flows");
  const { issuesInFlows, fieldUpdatesInFlows } = await analyzeFlows(responseData, sendUpdate, allMetadataItemsByType.flows);

  const allFieldUpdates = fieldUpdatesInApexTriggers.concat(fieldUpdatesInApexClasses, fieldUpdatesInFlows);
  const allIssues = issuesInApexTriggers.concat(issuesInApexClasses, issuesInFlows);

  const allFieldUpdatesFormatted = transformFieldUpdates(allFieldUpdates);
  responseData.allFieldUpdates = allFieldUpdatesFormatted;

  const allIssuesByType = transformIssuesByType(allIssues);
  responseData.allIssues = allIssuesByType;

  sendUpdate(responseData);

  //create a composite payload to create records in salesforce.
  const compositePayload = createCompositePayload(allIssues);
  insertScannerResults(compositePayload);

  //generate the PDF report
  //console.log("Generating PDF report");
  //generateIssuePdf(allIssuesByType, allFieldUpdatesFormatted);

  return { allMetadataItemsByType, allFieldUpdates };
};

//method to remove comments from apex class
const removeCommentsFromApex = (fileContent) => {
  return fileContent.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "");
}

//method to check if the class starts with @isTest
const isTestClass = (classBody) => {
  return classBody.toLowerCase().includes("@istest");
}

//method to create a composite payload to create records in salesforce.
const createCompositePayload = (allIssues) => {
  const issuesMap = {};
  allIssues.forEach((item) => {
    const componentName = item.triggerName || item.className || item.flowName;
    item.issues.forEach((issue) => {
      // create a map with key as the component name and value as the set of issue code
      if (!issuesMap[componentName]) {
        issuesMap[componentName] = [];
      }
      if (!issuesMap[componentName].includes(issue)) {
        issuesMap[componentName].push(issue);
      }
    });
  });
  console.log("issuesMap:", JSON.stringify(issuesMap, null, 2));
  const compositePayload = {
    records: [
      {
        attributes: { type: 'OrgScannerRun__c', referenceId: 'runRef1' },
        OrgScannerResults__r: {
          "records": 
            allIssues.map((item, i) => ({
              attributes: { type: 'OrgScannerResult__c', referenceId: `resultRef${i + 1}` },
              Component_Name__c: item.triggerName || item.className || item.flowName,
              Issue_Codes__c: issuesMap[item.triggerName || item.className || item.flowName].join(";"),
            })),
        },
      },
    ],
  };
  console.log("compositePayload:", JSON.stringify(compositePayload, null, 2));
  return compositePayload;
}

//method to transform issues by type
const transformIssuesByType = (allIssues) => {
  const issuesMap = {};
  allIssues.forEach((item) => {
    const name = item.triggerName || item.className || item.flowName;
    if (!name) return;
    item.issues.forEach((issue) => {
      if (!issuesMap[issue]) {
        //get the issue priority, category and description from the issue code
        const meta = issueRegistry[issue];
        const issuePriority = meta.priority;
        const issueDescription = meta.description;
        const issueCategory = meta.category;
        issuesMap[issue] = {
          code: issue,
          priority: issuePriority,
          description: issueDescription,
          category: issueCategory,
          components: []
        };
      }
      if (!issuesMap[issue].components.includes(name)) {
        issuesMap[issue].components.push(name);
      }
    });
  });
  return issuesMap;
}

//method to transform field updates by object and field names
const transformFieldUpdates = (allFieldUpdates) => {
  const result = {};

  allFieldUpdates.forEach(item => {
    const { objectName, fieldName, metadataName } = item;

    if (!result[objectName]) {
      result[objectName] = {};
    }

    if (!result[objectName][fieldName]) {
      result[objectName][fieldName] = {
        metadataNames: new Set()
      };
    }
    if (metadataName !== null) {
      result[objectName][fieldName].metadataNames.add(metadataName);
    }
  });

  // Convert sets to arrays and filter out entries with <= 1 metadataName
  const filteredResult = {};

  for (const objectKey in result) {
    if (objectKey === "Unknown") continue;
    for (const fieldKey in result[objectKey]) {
      const metadataSet = result[objectKey][fieldKey].metadataNames;
      if (metadataSet.size > 1) {
        if (!filteredResult[objectKey]) filteredResult[objectKey] = {};
        filteredResult[objectKey][fieldKey] = {
          metadataNames: Array.from(metadataSet),
        };
      }
    }
  }

  return filteredResult;
}

//module.exports = { getSalesforceMetadata };
export default getSalesforceMetadata;