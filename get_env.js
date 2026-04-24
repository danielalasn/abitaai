require('dotenv').config();
console.log("Token from env:", process.env.ANTHROPIC_API_KEY ? "Found" : "Missing");
