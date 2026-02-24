import type { Project } from "@stackblitz/sdk";

/**
 * Builds a StackBlitz Project object from a file map.
 * The embedded project runs a simple Node.js static server
 * that serves generated HTML and routes PHP through php-wasm.
 */
export function buildProject(files: Record<string, string>): Project {
  const embeddedPackageJson = JSON.stringify(
    {
      name: "lampforge-project",
      version: "1.0.0",
      description: "LAMPForge Generated LAMP Application",
      scripts: {
        start: "node server.js",
      },
      dependencies: {
        express: "^4.18.2",
      },
    },
    null,
    2
  );

  const serverJs = `const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

// Serve static HTML files
app.use(express.static(path.join(__dirname, 'html')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve SQL files as plain text
app.get('/sql/:file', (req, res) => {
  const filePath = path.join(__dirname, 'sql', req.params.file);
  if (fs.existsSync(filePath)) {
    res.type('text/plain').send(fs.readFileSync(filePath, 'utf8'));
  } else {
    res.status(404).send('File not found');
  }
});

// Serve PHP files as plain text (php-wasm integration point)
app.get('/php/:file', (req, res) => {
  const filePath = path.join(__dirname, 'php', req.params.file);
  if (fs.existsSync(filePath)) {
    res.type('text/plain').send(fs.readFileSync(filePath, 'utf8'));
  } else {
    res.status(404).send('File not found');
  }
});

// Index route
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'html', 'forms', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('<h1>LAMPForge Project</h1><p>Add entities to the canvas to generate your application.</p>');
  }
});

app.listen(PORT, () => {
  console.log(\`LAMPForge server running on port \${PORT}\`);
});
`;

  return {
    title: "LAMPForge Project",
    description: "Generated from architectural canvas",
    template: "node",
    files: {
      "package.json": embeddedPackageJson,
      "server.js": serverJs,
      ...files,
    },
  };
}

/**
 * Generates the default starter files when the canvas is empty.
 */
export function getDefaultFiles(): Record<string, string> {
  return {
    "sql/schema.sql": `-- LAMPForge Auto-Generated Schema
-- Generated from architectural canvas

-- Add entities to the canvas to generate SQL here
`,
    "php/db_connect.php": `<?php
// LAMPForge Database Connection
$host = 'localhost';
$dbname = 'lampforge_db';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}
?>
`,
    "html/forms/index.html": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LAMPForge App</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<nav class="navbar navbar-dark bg-dark mb-4">
  <div class="container"><a class="navbar-brand" href="#">LAMPForge App</a></div>
</nav>
<div class="container">
    <h1>LAMPForge Generated Application</h1>
    <p class="text-muted">Add entities to the canvas to generate your application.</p>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
`,
  };
}
