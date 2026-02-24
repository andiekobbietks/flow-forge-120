import type { ForgeBlueprint, ForgeEntity, ForgeField, ScaffoldLevel } from "./forge-types";

const BOOTSTRAP_CDN = `<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">`;
const BOOTSTRAP_JS = `<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>`;

// ── DDL Generator ──────────────────────────────────────────────

export function generateDDL(blueprint: ForgeBlueprint): string {
  const level = blueprint.scaffold_level;
  const lines: string[] = [
    `-- LAMPForge Auto-Generated Schema`,
    `-- Scaffold Level: ${level}`,
    `-- Project: ${blueprint.project.name}`,
    `-- Generated: ${new Date().toISOString()}`,
    ``,
    `CREATE DATABASE IF NOT EXISTS \`${blueprint.config.database.name}\`;`,
    `USE \`${blueprint.config.database.name}\`;`,
    ``,
  ];

  for (const entity of blueprint.entities) {
    lines.push(...generateTableDDL(entity, level, blueprint));
    lines.push("");
  }

  // Junction tables for M:M
  if (level === "exemplary" || level === "rad") {
    for (const rel of blueprint.relationships) {
      if (rel.cardinality === "M:M") {
        lines.push(...generateJunctionTable(rel.from, rel.to, level));
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

function generateTableDDL(
  entity: ForgeEntity,
  level: ScaffoldLevel,
  blueprint: ForgeBlueprint
): string[] {
  const lines: string[] = [`CREATE TABLE \`${entity.name}\` (`];
  const fieldLines: string[] = [];

  for (const field of entity.fields) {
    fieldLines.push(`  ${formatField(field, level)}`);
  }

  // Audit columns
  if ((level === "exemplary" || level === "rad") && entity.audit) {
    fieldLines.push(`  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP`);
    fieldLines.push(
      `  \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
    );
    if (level === "rad") {
      fieldLines.push(`  \`deleted_at\` DATETIME DEFAULT NULL`);
    }
  }

  // Foreign keys (competent+)
  if (level !== "exploratory") {
    for (const field of entity.fields) {
      if (field.references) {
        const onDelete = " ON DELETE CASCADE";
        const onUpdate = " ON UPDATE CASCADE";
        fieldLines.push(
          `  FOREIGN KEY (\`${field.name}\`) REFERENCES \`${field.references.entity}\`(\`${field.references.field}\`)${onDelete}${onUpdate}`
        );
      }
    }
  }

  lines.push(fieldLines.join(",\n"));
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

  // Indexes (exemplary/rad)
  if ((level === "exemplary" || level === "rad") && entity.indexes.length > 0) {
    for (const idx of entity.indexes) {
      lines.push(
        `CREATE INDEX \`idx_${entity.name}_${idx}\` ON \`${entity.name}\`(\`${idx}\`);`
      );
    }
  }

  return lines;
}

function formatField(field: ForgeField, level: ScaffoldLevel): string {
  let line = `\`${field.name}\` ${field.type}`;

  if (field.constraint.includes("PRIMARY KEY")) {
    if (level !== "exploratory") {
      line += " AUTO_INCREMENT PRIMARY KEY";
    } else {
      line += " PRIMARY KEY";
    }
  } else {
    if (field.constraint.includes("NOT NULL") || (level !== "exploratory" && !field.nullable)) {
      line += " NOT NULL";
    }
    if (field.constraint.includes("UNIQUE")) {
      line += " UNIQUE";
    }
    if (field.default) {
      line += ` DEFAULT ${field.default}`;
    }
  }

  return line;
}

function generateJunctionTable(from: string, to: string, level: ScaffoldLevel): string[] {
  const tableName = `${from}_${to}`;
  const lines = [
    `CREATE TABLE \`${tableName}\` (`,
    `  \`${from}_id\` INT NOT NULL,`,
    `  \`${to}_id\` INT NOT NULL,`,
  ];
  if (level === "rad") {
    lines.push(`  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,`);
  }
  lines.push(`  PRIMARY KEY (\`${from}_id\`, \`${to}_id\`),`);
  lines.push(
    `  FOREIGN KEY (\`${from}_id\`) REFERENCES \`${from}\`(\`id\`) ON DELETE CASCADE,`
  );
  lines.push(
    `  FOREIGN KEY (\`${to}_id\`) REFERENCES \`${to}\`(\`id\`) ON DELETE CASCADE`
  );
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
  return lines;
}

// ── PHP CRUD Generator ─────────────────────────────────────────

export function generatePHPCrud(entity: ForgeEntity, blueprint: ForgeBlueprint): string {
  const level = blueprint.scaffold_level;
  const name = entity.name;
  const fields = entity.fields.filter((f) => !f.constraint.includes("PRIMARY KEY"));

  switch (level) {
    case "exploratory":
      return generatePHPExploratory(name, fields);
    case "competent":
      return generatePHPCompetent(name, fields, blueprint);
    case "exemplary":
      return generatePHPExemplary(name, fields, blueprint);
    case "rad":
      return generatePHPRad(name, fields, entity, blueprint);
    default:
      return generatePHPCompetent(name, fields, blueprint);
  }
}

function generatePHPExploratory(name: string, fields: ForgeField[]): string {
  const fieldList = fields.map((f) => `'${f.name}'`).join(", ");
  return `<?php
// ${name} CRUD — Exploratory Level
$conn = mysqli_connect('localhost', 'root', '', 'lampforge_db');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  ${fields.map((f) => `$${f.name} = $_POST['${f.name}'];`).join("\n  ")}
  $sql = "INSERT INTO ${name} (${fields.map((f) => f.name).join(", ")}) VALUES (${fields.map((f) => `'$${ f.name}'`).join(", ")})";
  mysqli_query($conn, $sql);
}

$result = mysqli_query($conn, "SELECT * FROM ${name}");
$rows = [];
while ($row = mysqli_fetch_assoc($result)) {
  $rows[] = $row;
}
?>
`;
}

function generatePHPCompetent(
  name: string,
  fields: ForgeField[],
  blueprint: ForgeBlueprint
): string {
  return `<?php
// ${name} CRUD — Competent Level
require_once '../db_connect.php';

// CREATE
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'create') {
  ${fields.map((f) => `$${f.name} = mysqli_real_escape_string($conn, $_POST['${f.name}']);`).join("\n  ")}
  ${fields.map((f) => `if (empty($${f.name})) { die('${f.name} is required'); }`).join("\n  ")}
  $sql = "INSERT INTO ${name} (${fields.map((f) => f.name).join(", ")}) VALUES (${fields.map((f) => `'$${f.name}'`).join(", ")})";
  mysqli_query($conn, $sql);
  header("Location: ${name}.php");
  exit;
}

// READ
$result = mysqli_query($conn, "SELECT * FROM ${name} ORDER BY id DESC");

// DELETE
if (isset($_GET['delete'])) {
  $id = (int)$_GET['delete'];
  mysqli_query($conn, "DELETE FROM ${name} WHERE id = $id");
  header("Location: ${name}.php");
  exit;
}
?>
`;
}

function generatePHPExemplary(
  name: string,
  fields: ForgeField[],
  blueprint: ForgeBlueprint
): string {
  const placeholders = fields.map(() => "?").join(", ");
  const bindTypes = fields.map((f) => (f.type.startsWith("INT") ? "i" : "s")).join("");
  return `<?php
// ${name} CRUD — Exemplary Level (PDO Prepared Statements)
require_once '../db_connect.php';
session_start();

// CSRF Token
if (empty($_SESSION['csrf_token'])) {
  $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

try {
  // CREATE
  if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'create') {
    if (!hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'] ?? '')) {
      die('Invalid CSRF token');
    }
    ${fields.map((f) => `$${f.name} = trim($_POST['${f.name}'] ?? '');`).join("\n    ")}
    ${fields.filter((f) => !f.nullable).map((f) => `if (empty($${f.name})) { throw new Exception('${f.name} is required'); }`).join("\n    ")}
    
    $stmt = $pdo->prepare("INSERT INTO ${name} (${fields.map((f) => f.name).join(", ")}) VALUES (${placeholders})");
    $stmt->execute([${fields.map((f) => `$${f.name}`).join(", ")}]);
    header("Location: ${name}.php?success=created");
    exit;
  }

  // DELETE
  if (isset($_GET['delete'])) {
    $stmt = $pdo->prepare("DELETE FROM ${name} WHERE id = ?");
    $stmt->execute([(int)$_GET['delete']]);
    header("Location: ${name}.php?success=deleted");
    exit;
  }

  // READ
  $stmt = $pdo->query("SELECT * FROM ${name} ORDER BY id DESC");
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

} catch (Exception $e) {
  $error = $e->getMessage();
}
?>
`;
}

function generatePHPRad(
  name: string,
  fields: ForgeField[],
  entity: ForgeEntity,
  blueprint: ForgeBlueprint
): string {
  const placeholders = fields.map(() => "?").join(", ");
  const searchableFields = fields
    .filter((f) => f.type.includes("VARCHAR") || f.type === "TEXT")
    .map((f) => f.name);
  const searchWhere = searchableFields.length > 0
    ? searchableFields.map((f) => `${f} LIKE :search`).join(" OR ")
    : "1=1";

  return `<?php
// ${name} CRUD — RAD 2.0 Level (Production-Grade)
require_once '../db_connect.php';
session_start();

// CSRF Token
if (empty($_SESSION['csrf_token'])) {
  $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// Pagination
$page = max(1, (int)($_GET['page'] ?? 1));
$per_page = 20;
$offset = ($page - 1) * $per_page;

// Search
$search = trim($_GET['search'] ?? '');

try {
  // CREATE
  if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'create') {
    if (!hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'] ?? '')) {
      throw new Exception('Invalid CSRF token');
    }
    ${fields.map((f) => `$${f.name} = trim($_POST['${f.name}'] ?? '');`).join("\n    ")}
    ${fields.filter((f) => !f.nullable).map((f) => `if (empty($${f.name})) { throw new Exception('${f.name} is required'); }`).join("\n    ")}
    
    $stmt = $pdo->prepare("INSERT INTO ${name} (${fields.map((f) => f.name).join(", ")}) VALUES (${placeholders})");
    $stmt->execute([${fields.map((f) => `$${f.name}`).join(", ")}]);
    header("Location: ${name}.php?success=created");
    exit;
  }

  // UPDATE
  if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'update') {
    if (!hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'] ?? '')) {
      throw new Exception('Invalid CSRF token');
    }
    $id = (int)$_POST['id'];
    ${fields.map((f) => `$${f.name} = trim($_POST['${f.name}'] ?? '');`).join("\n    ")}
    
    $stmt = $pdo->prepare("UPDATE ${name} SET ${fields.map((f) => `${f.name} = ?`).join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL");
    $stmt->execute([${fields.map((f) => `$${f.name}`).join(", ")}, $id]);
    header("Location: ${name}.php?success=updated");
    exit;
  }

  // SOFT DELETE
  if (isset($_GET['delete'])) {
    $stmt = $pdo->prepare("UPDATE ${name} SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL");
    $stmt->execute([(int)$_GET['delete']]);
    header("Location: ${name}.php?success=deleted");
    exit;
  }

  // READ with pagination + search
  $countSql = "SELECT COUNT(*) FROM ${name} WHERE deleted_at IS NULL";
  $dataSql = "SELECT * FROM ${name} WHERE deleted_at IS NULL";

  if ($search !== '') {
    $searchParam = "%$search%";
    $countSql .= " AND (${searchWhere})";
    $dataSql .= " AND (${searchWhere})";
  }

  $dataSql .= " ORDER BY id DESC LIMIT :limit OFFSET :offset";

  // Count
  $countStmt = $pdo->prepare($countSql);
  if ($search !== '') { $countStmt->bindValue(':search', $searchParam); }
  $countStmt->execute();
  $total = $countStmt->fetchColumn();
  $total_pages = ceil($total / $per_page);

  // Data
  $dataStmt = $pdo->prepare($dataSql);
  if ($search !== '') { $dataStmt->bindValue(':search', $searchParam); }
  $dataStmt->bindValue(':limit', $per_page, PDO::PARAM_INT);
  $dataStmt->bindValue(':offset', $offset, PDO::PARAM_INT);
  $dataStmt->execute();
  $rows = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

} catch (Exception $e) {
  error_log("[${name}] Error: " . $e->getMessage());
  $error = $e->getMessage();
}
?>
`;
}

// ── HTML Form Generator ─────────────────────────────────────────

export function generateHTMLForm(entity: ForgeEntity, blueprint: ForgeBlueprint): string {
  const level = blueprint.scaffold_level;
  const name = entity.name;
  const title = name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " ");
  const fields = entity.fields.filter((f) => !f.constraint.includes("PRIMARY KEY"));

  switch (level) {
    case "exploratory":
      return generateHTMLExploratory(name, title, fields);
    case "competent":
      return generateHTMLCompetent(name, title, fields);
    case "exemplary":
      return generateHTMLExemplary(name, title, fields);
    case "rad":
      return generateHTMLRad(name, title, fields, entity);
    default:
      return generateHTMLCompetent(name, title, fields);
  }
}

function generateHTMLExploratory(name: string, title: string, fields: ForgeField[]): string {
  return `<!DOCTYPE html>
<html>
<head><title>${title}</title></head>
<body>
<h1>${title}</h1>
<form method="POST" action="${name}.php">
${fields.map((f) => `<label>${f.name}: <input type="text" name="${f.name}"></label><br>`).join("\n")}
<br><input type="submit" value="Add">
</form>
<h2>Records</h2>
<table border="1">
<tr><th>ID</th>${fields.map((f) => `<th>${f.name}</th>`).join("")}</tr>
<?php foreach ($rows as $row): ?>
<tr><td><?= $row['id'] ?></td>${fields.map((f) => `<td><?= $row['${f.name}'] ?></td>`).join("")}</tr>
<?php endforeach; ?>
</table>
</body>
</html>`;
}

function generateHTMLCompetent(name: string, title: string, fields: ForgeField[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — LAMPForge</title>
  ${BOOTSTRAP_CDN}
</head>
<body>
<nav class="navbar navbar-dark bg-dark mb-4">
  <div class="container"><a class="navbar-brand" href="index.html">LAMPForge App</a></div>
</nav>
<div class="container">
  <h1 class="mb-4">${title}</h1>
  
  <div class="card mb-4">
    <div class="card-header">Add ${title}</div>
    <div class="card-body">
      <form method="POST" action="${name}.php">
        <input type="hidden" name="action" value="create">
        ${fields.map((f) => `<div class="mb-3">
          <label class="form-label">${f.name}</label>
          <input type="text" class="form-control" name="${f.name}" required>
        </div>`).join("\n        ")}
        <button type="submit" class="btn btn-primary">Add ${title}</button>
      </form>
    </div>
  </div>

  <div class="card">
    <div class="card-header">All ${title}</div>
    <div class="card-body">
      <table class="table table-striped">
        <thead>
          <tr><th>ID</th>${fields.map((f) => `<th>${f.name}</th>`).join("")}<th>Actions</th></tr>
        </thead>
        <tbody>
          <?php foreach ($rows as $row): ?>
          <tr>
            <td><?= htmlspecialchars($row['id']) ?></td>
            ${fields.map((f) => `<td><?= htmlspecialchars($row['${f.name}']) ?></td>`).join("\n            ")}
            <td><a href="?delete=<?= $row['id'] ?>" class="btn btn-sm btn-danger">Delete</a></td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>
${BOOTSTRAP_JS}
</body>
</html>`;
}

function generateHTMLExemplary(name: string, title: string, fields: ForgeField[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — LAMPForge</title>
  ${BOOTSTRAP_CDN}
</head>
<body>
<nav class="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
  <div class="container">
    <a class="navbar-brand" href="index.html"><strong>LAMPForge</strong> App</a>
  </div>
</nav>
<div class="container">
  <?php if (isset($error)): ?>
    <div class="alert alert-danger"><?= htmlspecialchars($error) ?></div>
  <?php endif; ?>
  <?php if (isset($_GET['success'])): ?>
    <div class="alert alert-success">Record <?= htmlspecialchars($_GET['success']) ?> successfully.</div>
  <?php endif; ?>

  <div class="row">
    <div class="col-md-4">
      <div class="card shadow-lg">
        <div class="card-header bg-primary text-white">Add ${title}</div>
        <div class="card-body">
          <form method="POST">
            <input type="hidden" name="action" value="create">
            <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
            ${fields.map((f) => `<div class="mb-3">
              <label class="form-label">${f.name}</label>
              <div class="input-group">
                <input type="${getInputType(f)}" class="form-control" name="${f.name}" ${!f.nullable ? "required" : ""}>
              </div>
            </div>`).join("\n            ")}
            <button type="submit" class="btn btn-primary w-100">Save ${title}</button>
          </form>
        </div>
      </div>
    </div>
    <div class="col-md-8">
      <div class="card shadow-lg">
        <div class="card-header">All ${title} (<?= count($rows) ?> records)</div>
        <div class="card-body table-responsive">
          <table class="table table-hover">
            <thead class="table-dark">
              <tr><th>ID</th>${fields.map((f) => `<th>${f.name}</th>`).join("")}<th>Actions</th></tr>
            </thead>
            <tbody>
              <?php foreach ($rows as $row): ?>
              <tr>
                <td><?= htmlspecialchars($row['id']) ?></td>
                ${fields.map((f) => `<td><?= htmlspecialchars($row['${f.name}']) ?></td>`).join("\n                ")}
                <td>
                  <a href="?delete=<?= $row['id'] ?>" class="btn btn-sm btn-outline-danger" onclick="return confirm('Are you sure?')">Delete</a>
                </td>
              </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>
${BOOTSTRAP_JS}
</body>
</html>`;
}

function generateHTMLRad(name: string, title: string, fields: ForgeField[], entity: ForgeEntity): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — LAMPForge RAD</title>
  ${BOOTSTRAP_CDN}
  <style>
    :root { --lf-primary: #0d6efd; --lf-accent: #6f42c1; }
    .lf-header { background: linear-gradient(135deg, var(--lf-primary), var(--lf-accent)); }
  </style>
</head>
<body class="bg-light">
<nav class="navbar navbar-expand-lg navbar-dark lf-header mb-4">
  <div class="container">
    <a class="navbar-brand fw-bold" href="index.html">🔥 LAMPForge</a>
    <form class="d-flex ms-auto" method="GET">
      <input class="form-control me-2" type="search" name="search" placeholder="Search ${title}..." value="<?= htmlspecialchars($search ?? '') ?>">
      <button class="btn btn-outline-light" type="submit">Search</button>
    </form>
  </div>
</nav>
<div class="container">
  <?php if (isset($error)): ?>
    <div class="alert alert-danger alert-dismissible fade show"><?= htmlspecialchars($error) ?><button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>
  <?php endif; ?>
  <?php if (isset($_GET['success'])): ?>
    <div class="alert alert-success alert-dismissible fade show">Record <?= htmlspecialchars($_GET['success']) ?> successfully.<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>
  <?php endif; ?>

  <div class="row g-4">
    <div class="col-lg-4">
      <div class="card shadow-lg border-0">
        <div class="card-header bg-primary text-white fw-bold">Add ${title}</div>
        <div class="card-body">
          <form method="POST">
            <input type="hidden" name="action" value="create">
            <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
            ${fields.map((f) => `<div class="mb-3">
              <label class="form-label fw-semibold">${f.name}</label>
              <input type="${getInputType(f)}" class="form-control" name="${f.name}" ${!f.nullable ? "required" : ""}>
              <div class="invalid-feedback">Please provide ${f.name}.</div>
            </div>`).join("\n            ")}
            <button type="submit" class="btn btn-primary w-100">Save</button>
          </form>
        </div>
      </div>
    </div>
    <div class="col-lg-8">
      <div class="card shadow-lg border-0">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span class="fw-bold">${title}</span>
          <span class="badge bg-secondary"><?= $total ?? 0 ?> total</span>
        </div>
        <div class="card-body table-responsive p-0">
          <table class="table table-hover mb-0">
            <thead class="table-dark">
              <tr><th>ID</th>${fields.map((f) => `<th>${f.name}</th>`).join("")}<th>Actions</th></tr>
            </thead>
            <tbody>
              <?php if (empty($rows)): ?>
              <tr><td colspan="${fields.length + 2}" class="text-center text-muted py-4">No records found.</td></tr>
              <?php else: ?>
              <?php foreach ($rows as $row): ?>
              <tr>
                <td><?= htmlspecialchars($row['id']) ?></td>
                ${fields.map((f) => `<td><?= htmlspecialchars($row['${f.name}'] ?? '') ?></td>`).join("\n                ")}
                <td>
                  <a href="?delete=<?= $row['id'] ?>" class="btn btn-sm btn-outline-danger" data-bs-toggle="tooltip" title="Soft delete" onclick="return confirm('Delete this record?')">🗑</a>
                </td>
              </tr>
              <?php endforeach; ?>
              <?php endif; ?>
            </tbody>
          </table>
        </div>
        <?php if (($total_pages ?? 1) > 1): ?>
        <div class="card-footer">
          <nav>
            <ul class="pagination pagination-sm justify-content-center mb-0">
              <?php for ($i = 1; $i <= $total_pages; $i++): ?>
              <li class="page-item <?= $i === $page ? 'active' : '' ?>">
                <a class="page-link" href="?page=<?= $i ?>&search=<?= urlencode($search ?? '') ?>"><?= $i ?></a>
              </li>
              <?php endfor; ?>
            </ul>
          </nav>
        </div>
        <?php endif; ?>
      </div>
    </div>
  </div>
</div>
${BOOTSTRAP_JS}
<script>document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));</script>
</body>
</html>`;
}

function getInputType(field: ForgeField): string {
  const t = field.type.toUpperCase();
  if (t.includes("INT") || t.includes("DECIMAL") || t.includes("FLOAT")) return "number";
  if (t.includes("DATE") && !t.includes("TIME")) return "date";
  if (t.includes("DATETIME") || t.includes("TIMESTAMP")) return "datetime-local";
  if (t.includes("BOOLEAN")) return "checkbox";
  if (t === "TEXT" || t === "LONGTEXT") return "textarea";
  return "text";
}

// ── DB Connect Generator ────────────────────────────────────────

export function generateDBConnect(blueprint: ForgeBlueprint): string {
  const level = blueprint.scaffold_level;
  const db = blueprint.config.database;

  if (level === "exploratory") {
    return `<?php
// Database Connection — Exploratory Level
$conn = mysqli_connect('${db.host}', '${db.user}', '', '${db.name}');
if (!$conn) { die('Connection failed'); }
?>
`;
  }

  if (level === "competent") {
    return `<?php
// Database Connection — Competent Level
$conn = mysqli_connect('${db.host}', '${db.user}', '', '${db.name}');
if (!$conn) {
  die('Connection failed: ' . mysqli_connect_error());
}
mysqli_set_charset($conn, 'utf8mb4');
?>
`;
  }

  // exemplary + rad
  return `<?php
// Database Connection — ${level === "rad" ? "RAD 2.0" : "Exemplary"} Level (PDO)
$host = '${db.host}';
$dbname = '${db.name}';
$user = '${db.user}';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    error_log("Database connection failed: " . $e->getMessage());
    die("Database connection failed. Please check configuration.");
}
?>
`;
}

// ── Index HTML Generator ────────────────────────────────────────

export function generateIndexHTML(blueprint: ForgeBlueprint): string {
  const level = blueprint.scaffold_level;
  const projectName = blueprint.project.name;
  const entities = blueprint.entities;

  if (level === "exploratory") {
    return `<!DOCTYPE html>
<html>
<head><title>${projectName}</title></head>
<body>
<h1>${projectName}</h1>
<p>${blueprint.project.description}</p>
<ul>
${entities.map((e) => `  <li><a href="${e.name}.php">${e.name}</a></li>`).join("\n")}
</ul>
</body>
</html>`;
  }

  const navLinks = entities
    .map((e) => `<li class="nav-item"><a class="nav-link" href="${e.name}.php">${e.name.charAt(0).toUpperCase() + e.name.slice(1).replace(/_/g, " ")}</a></li>`)
    .join("\n          ");

  const isRad = level === "rad";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} — LAMPForge</title>
  ${BOOTSTRAP_CDN}
  ${isRad ? `<style>:root { --lf-primary: #0d6efd; --lf-accent: #6f42c1; } .hero-gradient { background: linear-gradient(135deg, var(--lf-primary), var(--lf-accent)); }</style>` : ""}
</head>
<body>
<nav class="navbar navbar-expand-lg navbar-dark ${isRad ? "hero-gradient" : "bg-dark"}">
  <div class="container">
    <a class="navbar-brand fw-bold" href="#">${isRad ? "🔥 " : ""}${projectName}</a>
    <div class="navbar-nav ms-auto">
      ${navLinks}
    </div>
  </div>
</nav>
<div class="container py-5">
  <div class="text-center mb-5">
    <h1 class="display-5 fw-bold">${projectName}</h1>
    <p class="lead text-muted">${blueprint.project.description}</p>
    <p class="text-muted small">Scaffold Level: <strong>${level}</strong> | Generated by LAMPForge</p>
  </div>
  <div class="row g-4">
    ${entities.map((e) => {
      const eTitle = e.name.charAt(0).toUpperCase() + e.name.slice(1).replace(/_/g, " ");
      return `<div class="col-md-4">
      <div class="card shadow-sm h-100">
        <div class="card-body">
          <h5 class="card-title">${eTitle}</h5>
          <p class="card-text text-muted">${e.fields.length} fields</p>
          <a href="${e.name}.php" class="btn btn-primary">Manage ${eTitle}</a>
        </div>
      </div>
    </div>`;
    }).join("\n    ")}
  </div>
</div>
${BOOTSTRAP_JS}
</body>
</html>`;
}

// ── Master Compiler ─────────────────────────────────────────────

export function generateAllFiles(blueprint: ForgeBlueprint): Record<string, string> {
  const files: Record<string, string> = {};

  // DDL
  files["sql/schema.sql"] = generateDDL(blueprint);

  // DB Connection
  files["php/db_connect.php"] = generateDBConnect(blueprint);

  // Per-entity PHP + HTML
  for (const entity of blueprint.entities) {
    files[`php/${entity.name}.php`] = generatePHPCrud(entity, blueprint);
    files[`html/forms/${entity.name}.html`] = generateHTMLForm(entity, blueprint);
  }

  // Index page
  files["html/forms/index.html"] = generateIndexHTML(blueprint);

  return files;
}
