const fs = require("node:fs");
const path = require("node:path");

const outputFile = path.join(process.cwd(), "dist-github-pages", ".nojekyll");
fs.writeFileSync(
  outputFile,
  "# Preserve Expo paths beginning with an underscore on GitHub Pages.\n",
  "utf8",
);
console.log("Arquivo .nojekyll criado para GitHub Pages.");
