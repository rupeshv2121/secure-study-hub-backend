const fs = require('fs');
const path = require('path');

const envPath = "E:\\Project\\secure-study-hub\\secure-study-hub-backend\\.env";
const jsonPath = "E:\\Project\\secure-study-hub\\secure-study-hub-aa9843d73688.json";

if (!fs.existsSync(jsonPath)) {
    console.error('Service account JSON not found at', jsonPath);
    process.exit(1);
}

const raw = fs.readFileSync(jsonPath, 'utf8');
let obj;
try {
    obj = JSON.parse(raw);
} catch (e) {
    console.error('Invalid JSON in', jsonPath);
    process.exit(1);
}

const jsonString = JSON.stringify(obj);

let env = fs.readFileSync(envPath, 'utf8');
// Remove accidental PowerShell lines or previous GOOGLE_SERVICE_ACCOUNT_JSON entries
env = env.replace(/\r?\n\$json[\s\S]*$/m, '');
env = env.split('\n').filter(line => !line.startsWith('GOOGLE_SERVICE_ACCOUNT_JSON=')).join('\n');

// Append variable wrapped in single quotes so inner double-quotes are preserved
env = env + '\n' + `GOOGLE_SERVICE_ACCOUNT_JSON='${jsonString}'\n`;
fs.writeFileSync(envPath, env, 'utf8');
console.log('Updated .env with GOOGLE_SERVICE_ACCOUNT_JSON');
