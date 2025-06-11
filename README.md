# Salesforce Org Assessment AI Tool

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Environment Variables](#environment-variables)
- [Code Modularization](#code-modularization)
- [Getting Started](#getting-started)
- [Contributing](#contributing)
- [License](#license)

## Overview
Salesforce Org Assessment AI Tool is a tool designed to analyze and optimize Salesforce automations, including Flows, Process Builders, and Workflow Rules. This tool helps identify redundant automations and provides insights to improve the efficiency of your Salesforce instance.

## Authentication
To interact with Salesforce, the application uses OAuth 2.0 for authentication. The authentication process involves the following steps:

1. **Create a Connected App in Salesforce**: 
   - Navigate to Setup in Salesforce.
   - Search for "App Manager" and click "New Connected App".
   - Fill in the required details and enable OAuth settings.
   - Add the necessary OAuth scopes and save the Connected App.

## Environment Variables
To configure the application, you need to set up a `.env` file in the root directory of your project. The `.env` file should contain the following environment variables:

```plaintext
SALESFORCE_CLIENT_ID=your_salesforce_client_id
SALESFORCE_CLIENT_SECRET=your_salesforce_client_secret
SALESFORCE_CALLBACK_URL=http://localhost:3000/auth/callback
```

Replace the placeholder values with your actual Salesforce credentials and callback URL.

## Code Modularization
The codebase is organized into different modules to ensure maintainability and scalability. The main modules are:

1. **Server Module**:
   - The `server.js` file initializes the Express application and defines the routes for fetching and analyzing Salesforce automations.
   - Example routes include:
     - `/fetch/flows`: Fetches Flows and Process Builders from Salesforce.
     - `/fetch/workflow-rules`: Fetches Workflow Rules from Salesforce.
     - `/analyze/redundant-automations`: Analyzes redundant automations in Salesforce.

2. **Salesforce Module**:
   - The `salesforce/` directory contains files related to Salesforce interactions.
   - `metadata.js`: Contains functions to fetch metadata such as Flows and Workflow Rules from Salesforce.
   - `analyzeAutomations.js`: Contains functions to analyze redundant automations in Salesforce.

3. **Utils Module**:
   - The `utils/` directory contains utility functions used across the application.
   - `helpers.js`: Contains helper functions such as date formatting and safe JSON parsing.
   - `logger.js`: Contains functions to log messages to a file for debugging and monitoring purposes.

## Getting Started
To get started with the Salesforce Org Assessment AI Tool, follow these steps:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/salesforce-org-assessment-ai-tool.git
   cd salesforce-org-assessment-ai-tool
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   - Create a `.env` file in the root directory and add the necessary environment variables as described in the Environment Variables section.

4. **Start the Server**:
   ```bash
   npm start
   ```

5. **Access the Application**:
   - Open your browser and navigate to `http://localhost:3000` to access the application.

5. **Analyze the customizations**:
   - Open your browser and navigate to `http://localhost:3000/analyze/customizations` to access the application.

## Assessment Checks
Below are the checks the tool assess in the org's metadata.

1. **Apex Test Class**: 
   - All test methods has Test.startTest() and Test.stopTest() methods.
   - Test classes Should not have seealldata = true.
   - There is atleast one assert statement for each test method.
   - RunAs method is used in all test classes.
   - There is a TestSetup method used in test classes.
   - There should not be any hardcoded ids.
   - There should not be any SOQL inside loops.
   - There should not be any DML statements inside loops.

2. **Apex Class**: 
   - There should not be any hardcoded ids.
   - There should not be any SOQL inside loops.
   - There should not be any DML statements inside loops.

3. **Apex Triggers**: 
   - There should not be any hardcoded ids.
   - There should not be any SOQL inside loops.
   - There should not be any DML statements inside loops.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request with your changes.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.