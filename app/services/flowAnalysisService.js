const { parseStringPromise } = require("xml2js");

const extractFieldUpdatesFromFlows = async (responseData, sendUpdate, allFlows) => {
    const fieldUpdatesInFlows = [];
    const issuesInFlows = [];

    for (const flow of allFlows) {
        try {
            const flowName = flow.name.split("/")[2];
            const flowXmlContent = flow.fileContent;
            if (typeof flowXmlContent !== "string" || !flowXmlContent.trim().startsWith("<?xml")) {
                console.error("Invalid XML input detected. Skipping.", flowName);
                continue;
            }

            const flowJson = await parseStringPromise(flowXmlContent);

            if (!flowJson.Flow) {
                continue;
            }
            if (flowJson.Flow.status?.[0] === "Active") {
                const objectName = flowJson.Flow.processMetadataValues?.find(p => p.name === "ObjectType")?.value?.stringValue ||
                    flowJson.Flow.start?.[0]?.object?.[0] ||
                    flowJson.Flow.variables?.find(v => v.name === "myVariable_current")?.objectType?.[0] ||
                    "Unknown";

                const processType = flowJson.Flow.processType?.[0] || "Unknown";
                const triggerType = flowJson.Flow.start?.[0]?.triggerType?.[0] || "Unknown";

                if (flowJson.Flow.assignments) {
                    flowJson.Flow.assignments.forEach(assignment => {
                        assignment.assignmentItems?.forEach(item => {
                            fieldUpdatesInFlows.push({
                                objectName,
                                fieldName: item.assignToReference[0].replace("$Record.", ""),
                                source: "Flow",
                                metadataName: flowName,
                                processType,
                                triggerType
                            });
                        });
                    });
                }

                if (flowJson.Flow.recordUpdates) {
                    flowJson.Flow.recordUpdates.forEach(update => {
                        update.inputAssignments?.forEach(item => {
                            fieldUpdatesInFlows.push({
                                objectName: update.object?.[0] || objectName,
                                fieldName: item.field[0],
                                source: "Flow",
                                flowName: flowName,
                                processType,
                                triggerType
                            });
                        });
                    });
                }

                issuesInFlow = [];
                if (flowJson.Flow.recordUpdates) {
                    //validateTriggeringRecordUpdates(flowJson.Flow.recordUpdates, objectName, fieldUpdatesInFlows, flowName, processType, triggerType);
                    issuesInFlow = validateTriggeringRecordUpdates(responseData, sendUpdate, flowJson.Flow.recordUpdates, flowName, triggerType);
                    if (issuesInFlow.length > 0) {
                        issuesInFlows.push({
                            flowName: flowName,
                            issues: issuesInFlow
                        });
                    }
                }
                //responseData.issuesInFlows = issuesInFlows;
                //sendUpdate(responseData); // Send update for each flow

            }
        } catch (error) {
            console.error("Error parsing Flow XML:", error);
        }
    }
    //responseData.fieldUpdatesInFlows = fieldUpdatesInFlows;
    //sendUpdate(responseData); // Send update for each flow
    return { issuesInFlows, fieldUpdatesInFlows };
};

const validateTriggeringRecordUpdates = (responseData, sendUpdate, recordUpdates, flowName, triggerType) => {
    issues = [];
    recordUpdates.forEach(update => {
        if (update.inputReference?.[0] === "$Record" && triggerType === "RecordAfterSave") {
            /*fieldsList = '';
            update.inputAssignments?.forEach(item => {
                fieldsList += item.field[0] + ", ";
            });
            fieldsList = fieldsList.replace(/, $/, ""); // Remove the last comma and space*/
            //issues.push("Updating the Triggering Record in After Save Flow. " + fieldsList);
            issues.push("Issue-1002");
        }
    });

    const recordUpdatesWithRecordReference = recordUpdates.filter(update => update.inputReference?.[0] === "$Record" && triggerType === "RecordAfterSave");
    if (recordUpdatesWithRecordReference.length > 1) {
        //issues.push("Updating the Triggering Record in After Save Flow with multiple update elements.");
        issues.push("Issue-1003");
    }
    return issues;
}


const analyzeFlows = async (responseData, sendUpdate, allFlows) => {
    const { issuesInFlows, fieldUpdatesInFlows } = await extractFieldUpdatesFromFlows(responseData, sendUpdate, allFlows);
    return { issuesInFlows, fieldUpdatesInFlows };
}

module.exports = { analyzeFlows };
