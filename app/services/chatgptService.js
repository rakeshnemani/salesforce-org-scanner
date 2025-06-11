const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzeFieldUpdatesWithChatGPT(responseData, sendUpdate, fieldUpdates) {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are an AI trained to analyze Salesforce Flow metadata and identify field updates, associated objects, and entry conditions." },
      { role: "user", content: `Analyze the following field updates and return a structured JSON response: ${JSON.stringify(fieldUpdates)}` }
    ]
  });
  console.log("ChatGPT Response:", response.choices[0].message.content);
  const chatGPTContent = response.choices[0].message.content.replace(/```json|```/g, "").trim(); // Remove code block markers
  const chatGPTAnalysis = JSON.parse(chatGPTContent);
  responseData.chatGPTAnalysis = chatGPTAnalysis;
  sendUpdate(responseData);
  return chatGPTAnalysis;
}

module.exports = { analyzeFieldUpdatesWithChatGPT };