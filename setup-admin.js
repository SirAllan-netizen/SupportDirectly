const fs = require("fs");
const path = require("path");
const readline = require("readline");

const ROOT = __dirname;
const ENV = path.join(ROOT, ".env");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log("\nGive-Directly local admin setup");
console.log("Choose a password with at least 12 characters. This is for your local admin login.\n");

rl.question("New admin password: ", (password) => {
  password = String(password || "").trim();
  if (password.length < 12) {
    console.error("\nPassword must be at least 12 characters. Run npm run setup-admin again.\n");
    rl.close();
    process.exitCode = 1;
    return;
  }
  const safe = password.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  fs.writeFileSync(ENV, `# Local development only. Do not commit this file.\nADMIN_PASSWORD="${safe}"\n`);
  console.log("\nSaved local admin password to .env.");
  console.log("Next run: npm start");
  console.log("Then open: http://localhost:3000/admin.html\n");
  rl.close();
});
