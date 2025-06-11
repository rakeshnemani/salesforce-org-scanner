// pdfGenerator.js
const puppeteer = require('puppeteer');
const fs = require('fs');
const handlebars = require('handlebars');
const path = require('path');

function getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[-T:]/g, '').slice(0, 14);
}

async function generateIssuePdf(issues, fieldUpdates, filename = `OrgAssessment_${getTimestamp()}.pdf`) {
    // Load HTML template
    const templateHtml = fs.readFileSync(path.join(__dirname, '../templates', 'issue-report.html'), 'utf8');
    const template = handlebars.compile(templateHtml);

    const finalHtml = template({ issues, fieldUpdates });

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: 'load' });
    const outputDir = path.join(__dirname, '../generatedPDFReports');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, filename);
    await page.pdf({ path: outputPath, format: 'A4' });
    await browser.close();

    console.log(`PDF generated at ${filename}`);
}

module.exports = { generateIssuePdf };
