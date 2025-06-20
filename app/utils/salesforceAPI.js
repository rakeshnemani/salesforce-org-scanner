import axios from "axios";
import fs from "fs";
import { parseStringPromise } from "xml2js";
import AdmZip from "adm-zip";

// Load tokens
//const tokens = JSON.parse(fs.readFileSync("tokens.json", "utf-8"));
//const ACCESS_TOKEN = tokens.access_token;
//const INSTANCE_URL = tokens.instance_url;

let ACCESS_TOKEN="";
let INSTANCE_URL="";

let SALESFORCE_METADATA_URL = "";
let SALESFORCE_API_URL = "";
let SALESFORCE_REST_API_URL = "";

// Generic function to query Salesforce
const querySalesforce = async (query) => {
  try {
    const response = await axios.get(`${SALESFORCE_API_URL}?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });
    return response.data.records;
  } catch (error) {
    console.error("Salesforce API Error:", error.response?.data || error.message);
    return [];
  }
};

const generatePackageXML = () => {
  const packageXML = `<?xml version="1.0" encoding="UTF-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns="http://soap.sforce.com/2006/04/metadata">
      <soapenv:Header>
        <SessionHeader>
          <sessionId>${ACCESS_TOKEN}</sessionId>
        </SessionHeader>
      </soapenv:Header>
      <soapenv:Body>
        <retrieve>
          <retrieveRequest>
            <apiVersion>60.0</apiVersion>
            <unpackaged>
              <types>
                <members>*</members>
                <name>ApexClass</name>
              </types>
              <types>
                <members>*</members>
                <name>ApexTrigger</name>
              </types>
              <types>
                <members>*</members>
                <name>Flow</name>
              </types>
              <types>
                  <members>*</members>
                  <name>Workflow</name>
              </types>
            </unpackaged>
          </retrieveRequest>
        </retrieve>
      </soapenv:Body>
    </soapenv:Envelope>`;
  return packageXML;
};

const generateCheckRequestStatusXML = (retrieveId) => {
  const checkRequestStatusXML = `<?xml version="1.0" encoding="UTF-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns="http://soap.sforce.com/2006/04/metadata">
      <soapenv:Header>
        <SessionHeader>
          <sessionId>${ACCESS_TOKEN}</sessionId>
        </SessionHeader>
      </soapenv:Header>
      <soapenv:Body>
        <checkRetrieveStatus>
          <asyncProcessId>${retrieveId}</asyncProcessId>
        </checkRetrieveStatus>
      </soapenv:Body>
    </soapenv:Envelope>`;
  return checkRequestStatusXML;
};

const retrieveMetadata = async (req, responseData, sendUpdate) => {
  if (!req.session.tokens) {
    throw new Error("In Salesforce API. Not authenticated.");
  }
  ACCESS_TOKEN = req.session.tokens.access_token;
  INSTANCE_URL = req.session.tokens.instance_url;

  SALESFORCE_METADATA_URL = `${INSTANCE_URL}/services/Soap/m/60.0`;
  SALESFORCE_API_URL = `${INSTANCE_URL}/services/data/v60.0/tooling/query`;
  SALESFORCE_REST_API_URL = `${INSTANCE_URL}/services/data/v60.0/composite`;
  try {
    // Step 1: Request Metadata Retrieval
    const packageXML = generatePackageXML();
    const retrieveResponse = await axios.post(
      SALESFORCE_METADATA_URL, packageXML,
      {
        headers: {
          "Content-Type": "text/xml",
          "SOAPAction": "''"
        }
      }
    );

    // Parse the XML response
    const xmlData = retrieveResponse.data;
    const parsedData = await parseStringPromise(xmlData, {
      explicitArray: false, // Avoids arrays for single elements
      trim: true, // Removes whitespace
    });

    // Extract id and state from the parsed object
    const result = parsedData['soapenv:Envelope']['soapenv:Body'].retrieveResponse.result;
    const retrieveId = result.id;
    const status = result.state;
    console.log("status:", status);
    console.log("Metadata Retrieve ID:", retrieveId);

    responseData.metadataRetrieveId = retrieveId;
    responseData.metadataRetrieveStatus = status;
    sendUpdate(responseData);

    // Step 2: Poll for Metadata Retrieval Completion
    let metadataZip;
    let checkRetrieveStatus = "Pending";
    while (["Pending", "InProgress", "Queued"].includes(checkRetrieveStatus)) {
      console.log("Polling for Metadata Retrieval Completion...");
      await new Promise(resolve => setTimeout(resolve, 15000)); // Wait before polling
      const checkResponse = await axios.post(
        SALESFORCE_METADATA_URL, generateCheckRequestStatusXML(retrieveId), {
        headers: {
          "Content-Type": "text/xml",
          "SOAPAction": "''"
        }
      });

      // Parse the XML response
      const checkResponseXMLData = checkResponse.data;
      const checkResponseParsedData = await parseStringPromise(checkResponseXMLData, {
        explicitArray: false, // Avoids arrays for single elements
        trim: true, // Removes whitespace
      });

      // Extract id and state from the parsed object
      const checkResponseResult = checkResponseParsedData['soapenv:Envelope']['soapenv:Body'].checkRetrieveStatusResponse.result;
      const checkRetrieveStatus = checkResponseResult.status;
      console.log("checkRetrieveStatus:", checkRetrieveStatus);
      responseData.metadataRetrieveStatus = checkRetrieveStatus;
      sendUpdate(responseData);

      // Extract id and state from the parsed object
      if (checkRetrieveStatus === "Succeeded") {
        metadataZip = checkResponseResult.zipFile;
        break;
      }
    }

    if (!metadataZip) throw new Error("Failed to retrieve metadata zip file");

    // Step 3: Extract and Parse Flow Metadata
    console.log("Metadata Zip File Received");
    const zip = new AdmZip(Buffer.from(metadataZip, "base64"));
    const zipEntries = zip.getEntries();

    const metadataEntries = zipEntries
      .filter(entry => !entry.entryName.endsWith("-meta.xml"))
      .filter(entry => !entry.entryName.endsWith("package.xml"))
      .map(entry => {
        //console.log("entry.entryName:", entry.entryName);
        const fileContent = entry.getData().toString("utf8");
        return { name: entry.entryName, fileContent: fileContent };
      }
      )
      .filter(metadata => metadata); // Remove null values if any
    //responseData.metadataEntries = metadataEntries;
    //sendUpdate(responseData);
    return metadataEntries;

  } catch (error) {
    console.error("Salesforce Metadata API Error:", error.response?.data || error.message);
    return [];
  }
};

const insertScannerResults = async (scannerResultsCompositePayload) => {
  try {
    const response = await axios.post(`${SALESFORCE_REST_API_URL}/tree/OrgScannerRun__c`, scannerResultsCompositePayload, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    console.log('Parent + children inserted:', response.data);
    return response.data;
  } catch (error) {
    console.error("Salesforce API Error when iserting the records:", error.response?.data || error.message);
    return null;
  }
};


//module.exports = { querySalesforce, retrieveMetadata, insertScannerResults };
export { querySalesforce, retrieveMetadata, insertScannerResults };