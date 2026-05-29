const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const contentDir = path.join(root, "content", "campaigns");
const detectionDir = path.join(root, "content", "detections");
const evidenceDir = path.join(root, "content", "evidence");
const logCatalogDir = path.join(root, "content", "log-catalog");
const campaignLogDir = path.join(root, "content", "campaign-logs");
const workflowDir = path.join(root, "content", "workflows");
const outDir = path.join(root, "campaigns");
const logsOutDir = path.join(root, "logs");
const workflowsOutDir = path.join(root, "workflows");
const assetHref = "/assets/campaign.css";
const logoSrc = "/assets/spacebarLogo.png";
const workflowOrder = [
  "WF-RECON-001",
  "WF-INITIAL-001",
  "WF-CICD-001",
  "WF-CRED-001",
  "WF-REMOTE-001",
  "WF-CMD-001",
  "WF-DISCOVERY-001",
  "WF-K8S-001",
  "WF-CLOUD-001",
  "WF-PRIVESC-001",
  "WF-PERSIST-001",
  "WF-SUPPLY-001",
  "WF-AD-001",
  "WF-LOLBIN-001",
  "WF-DATA-001",
  "WF-STAGING-001",
  "WF-EXFIL-001",
];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseFrontmatter(source, file) {
  source = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!source.startsWith("---\n")) {
    throw new Error(`${file} is missing frontmatter.`);
  }

  const end = source.indexOf("\n---", 4);
  if (end === -1) {
    throw new Error(`${file} frontmatter is not closed.`);
  }

  const raw = source.slice(4, end).trim();
  const body = source.slice(end + 4).trim();
  const data = {};

  raw.split(/\n/).forEach((line) => {
    if (!line.trim() || line.trim().startsWith("#")) return;
    const idx = line.indexOf(":");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  });

  if (!data.id || !data.name) {
    throw new Error(`${file} must include id and name.`);
  }

  return { data, body };
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderInline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function createLogLookup(logs) {
  return new Map(logs.map((log) => [log.data.id, log]));
}

function replaceLogShortcodes(source, campaignId, logs, format = "markdown") {
  const lookup = createLogLookup(logs);
  return source.replace(/\[\[([A-Z0-9-]+)\]\]/g, (_match, id) => {
    if (!lookup.has(id)) {
      return format === "html"
        ? `<span class="tag">${escapeHtml(id)} missing</span>`
        : `${id} missing`;
    }

    const href = `/campaigns/${campaignId}/logs/${id}/`;
    return format === "html" ? `<a href="${href}">${escapeHtml(id)}</a>` : `[${id}](${href})`;
  });
}

function renderMetadataGrid(rows) {
  const body = rows
    .map(([label, value]) => {
      const normalizedLabel = label.endsWith(":") ? label : `${label}:`;
      return [
        `<div class="meta-label">${renderInline(normalizedLabel)}</div>`,
        `<div class="meta-value">${renderInline(value)}</div>`,
      ].join("\n");
    })
    .join("\n");

  return `<div class="meta-grid" aria-label="Campaign metadata">\n${body}\n</div>`;
}

function normalizeInternalLinks(html, campaignId = null) {
  const logHref = (id) => (campaignId ? `/campaigns/${campaignId}/logs/${id}/` : `/logs/${id}/`);
  return html
    .replace(/href="(?:\.\.\/)?logs\/([A-Z]+-\d+)\.html"/g, (_, id) => `href="${logHref(id)}"`)
    .replace(/href="\/logs\/([A-Z]+-\d+)\/"/g, (_, id) => `href="${logHref(id)}"`)
    .replace(/href="(?:\.\.\/)?campaigns\/(SB-\d+)\.html"/g, 'href="/campaigns/$1/"')
    .replace(/href="(?:\.\.\/)?campaigns\/(SB-\d+)-detection-map\.html"/g, 'href="/campaigns/$1/detection-map/"')
    .replace(/href="(?:\.\.\/)?campaigns\/(SB-\d+)-evidence\.html"/g, 'href="/campaigns/$1/evidence/"')
    .replace(/href="(SB-\d+)\.html"/g, 'href="/campaigns/$1/"')
    .replace(/href="(SB-\d+)-detection-map\.html"/g, 'href="/campaigns/$1/detection-map/"')
    .replace(/href="(SB-\d+)-evidence\.html"/g, 'href="/campaigns/$1/evidence/"');
}

function headingId(text) {
  const known = {
    overview: "overview",
    groups: "groups",
    "techniques used": "techniques-used",
    software: "software",
    references: "references",
    "detection plan": "detection",
    "observed infrastructure": "infrastructure",
  };
  const key = text.trim().toLowerCase();
  return known[key] || key.replace(/[^a-z0-9\uAC00-\uD7A3]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

const tacticOrder = [
  "Reconnaissance",
  "Resource Development",
  "Initial Access",
  "Execution",
  "Persistence",
  "Privilege Escalation",
  "Defense Evasion",
  "Credential Access",
  "Discovery",
  "Lateral Movement",
  "Collection",
  "Command and Control",
  "Exfiltration",
  "Impact",
];

const techniqueTactics = {
  T1592: "Reconnaissance",
  T1552: "Credential Access",
  "T1552.001": "Credential Access",
  "T1552.004": "Credential Access",
  T1078: "Initial Access",
  T1190: "Initial Access",
  T1213: "Collection",
  "T1213.006": "Collection",
  T1021: "Lateral Movement",
  "T1021.004": "Lateral Movement",
  T1083: "Discovery",
  T1074: "Collection",
  "T1074.001": "Collection",
  T1048: "Exfiltration",
  "T1048.002": "Exfiltration",
  "T1059.004": "Execution",
  "T1059.006": "Execution",
  T1005: "Collection",
  T1105: "Command and Control",
  T1110: "Credential Access",
  T1098: "Persistence",
  T1562: "Defense Evasion",
  T1595: "Reconnaissance",
  T1041: "Exfiltration",
};

function attackTechniqueHref(id) {
  const parts = id.split(".");
  return `https://attack.mitre.org/techniques/${parts.join("/")}/`;
}

function extractTechniqueRows(markdown) {
  const lines = markdown.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim().toLowerCase() === "## techniques used");
  if (headingIndex === -1) return [];

  for (let i = headingIndex + 1; i < lines.length - 1; i += 1) {
    const current = lines[i].trim();
    const next = lines[i + 1].trim();
    if (/^\|.+\|$/.test(current) && /^\|?[\s:\-|]+\|?$/.test(next)) {
      const headers = splitTableRow(current).map((header) => header.trim().toLowerCase());
      const rows = [];
      i += 2;
      while (i < lines.length && /^\|.+\|$/.test(lines[i].trim())) {
        const cells = splitTableRow(lines[i]);
        const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
        rows.push({
          name: row.name || row.technique || "",
          id: row.id || "",
          use: row.use || row["use in demo"] || row["use in campaign"] || "",
          logs: row["primary logs"] || "",
        });
        i += 1;
      }
      return rows.filter((row) => row.id && row.name);
    }
  }

  return [];
}

function renderMatrixPanel(techniques, campaignId) {
  const byTactic = new Map(tacticOrder.map((tactic) => [tactic, []]));
  techniques.forEach((technique) => {
    const tactic = techniqueTactics[technique.id] || "Collection";
    if (!byTactic.has(tactic)) byTactic.set(tactic, []);
    byTactic.get(tactic).push(technique);
  });

  return `<section id="matrix" class="view-panel">
  <h2>Matrix View</h2>
  <div class="matrix-scroll">
    <section class="attack-matrix" aria-label="${escapeHtml(campaignId)} ATT&CK matrix">
${tacticOrder
  .map((tactic) => {
    const cards = byTactic.get(tactic) || [];
    const body = cards.length
      ? cards
          .map(
            (technique) => `        <div class="technique-card used"><strong><a href="${attackTechniqueHref(
              technique.id
            )}" target="_blank" rel="noopener noreferrer"><code>${escapeHtml(technique.id)}</code></a> ${escapeHtml(
              technique.name
            )}</strong><span>${escapeHtml(technique.use)}</span></div>`
          )
          .join("\n")
      : `        <div class="technique-card"><strong>No ${escapeHtml(campaignId)} Technique</strong><span>현재 캠페인에서 이 tactic에 매핑된 Technique 없음</span></div>`;
    return `      <div class="tactic">
        <div class="tactic-header">${escapeHtml(tactic)}</div>
${body}
      </div>`;
  })
  .join("\n")}
    </section>
  </div>
</section>`;
}

function renderCampaignLogsPanel(campaign, logs) {
  return `<section id="campaign-logs" class="view-panel">
  <h2>${escapeHtml(campaign.data.id)} Campaign Logs</h2>
  <p class="summary">이 캠페인에서 현재 검증하거나 작성 중인 로그 상세 페이지를 한눈에 확인한다.</p>
  <div class="cards">
${logs
  .map(
    (log) => `    <article class="card">
      <h3><a href="/campaigns/${campaign.data.id}/logs/${log.data.id}/">${escapeHtml(log.data.id)} ${escapeHtml(
      log.data.name
    )}</a></h3>
      <p>${escapeHtml(log.data.description || "")}</p>
      <div class="tag-row">
        ${(log.data.techniques || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => `<span class="tag">${escapeHtml(item)}</span>`)
          .join("\n        ")}
      </div>
    </article>`
  )
  .join("\n")}
  </div>
</section>`;
}

function enhanceCampaignViews(html, campaign, logs) {
  if (!logs.length || html.includes('class="view-switch"')) return html;
  const techniques = extractTechniqueRows(campaign.body);
  if (!techniques.length) return html;

  const h2Pattern = /<h2 id="techniques-used">Techniques Used<\/h2>\s*<div class="table-wrap wide-table">[\s\S]*?<\/tbody><\/table><\/div>/;
  const match = html.match(h2Pattern);
  if (!match) return html;

  const tableSection = `<section id="table" class="view-panel active">
${match[0]}
</section>`;
  const switchHtml = `<div class="view-switch" role="tablist" aria-label="${escapeHtml(campaign.data.id)} campaign views">
  <button class="active" type="button" data-view="table">Table View</button>
  <button type="button" data-view="matrix">Matrix View</button>
  <button type="button" data-view="campaign-logs">Campaign Logs</button>
</div>`;
  return html.replace(match[0], `${switchHtml}\n${tableSection}\n${renderMatrixPanel(techniques, campaign.data.id)}\n${renderCampaignLogsPanel(campaign, logs)}`);
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const out = [];
  let paragraph = [];
  let list = null;
  let code = null;

  function flushParagraph() {
    if (paragraph.length) {
      out.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  }

  function closeList() {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (code) {
      if (trimmed.startsWith("```")) {
        out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = null;
      } else {
        code.push(line);
      }
      continue;
    }

    if (trimmed.startsWith("```")) {
      flushParagraph();
      closeList();
      code = [];
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    if (trimmed.startsWith("<")) {
      flushParagraph();
      closeList();
      out.push(line);
      continue;
    }

    if (/^\|.+\|$/.test(trimmed) && i + 1 < lines.length && /^\|?[\s:\-|]+\|?$/.test(lines[i + 1].trim())) {
      flushParagraph();
      closeList();
      const headers = splitTableRow(trimmed);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|.+\|$/.test(lines[i].trim())) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      i -= 1;
      if (
        headers.length === 2 &&
        headers[0].trim().toLowerCase() === "field" &&
        headers[1].trim().toLowerCase() === "value"
      ) {
        out.push(renderMetadataGrid(rows));
        continue;
      }
      out.push('<div class="table-wrap wide-table">');
      out.push("<table>");
      out.push(`<thead><tr>${headers.map((h) => `<th>${renderInline(h)}</th>`).join("")}</tr></thead>`);
      out.push("<tbody>");
      rows.forEach((row) => {
        out.push(`<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`);
      });
      out.push("</tbody></table></div>");
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      closeList();
      const text = trimmed.slice(4);
      out.push(`<h3 id="${headingId(text)}">${renderInline(text)}</h3>`);
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      closeList();
      const text = trimmed.slice(3);
      out.push(`<h2 id="${headingId(text)}">${renderInline(text)}</h2>`);
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushParagraph();
      closeList();
      out.push(`<h1>${renderInline(trimmed.slice(2))}</h1>`);
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    const unordered = trimmed.match(/^[-*]\s+(.+)$/);

    if (ordered || unordered) {
      flushParagraph();
      const type = ordered ? "ol" : "ul";
      if (list !== type) {
        closeList();
        list = type;
        out.push(`<${type}>`);
      }
      out.push(`<li>${renderInline((ordered || unordered)[1])}</li>`);
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  closeList();
  if (code) {
    out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  }

  return out.join("\n");
}

function findClosingDiv(html, start) {
  const token = /<\/?div\b[^>]*>/gi;
  token.lastIndex = start;
  let depth = 0;
  let match;

  while ((match = token.exec(html))) {
    if (match[0].startsWith("</")) {
      depth -= 1;
      if (depth === 0) return token.lastIndex;
    } else {
      depth += 1;
    }
  }

  return -1;
}

function wrapCampaignHero(html) {
  const h1Start = html.indexOf("<h1");
  const metaStart = html.indexOf('<div class="meta-grid"');
  if (h1Start === -1 || metaStart === -1 || metaStart < h1Start) return html;

  const h1End = html.indexOf("</h1>", h1Start);
  if (h1End === -1) return html;

  const metaEnd = findClosingDiv(html, metaStart);
  if (metaEnd === -1) return html;

  const before = html.slice(0, h1Start);
  const heading = html.slice(h1Start, h1End + 5);
  const description = html.slice(h1End + 5, metaStart).trim();
  const metadata = html.slice(metaStart, metaEnd);
  const after = html.slice(metaEnd);

  return `${before}<div class="campaign-hero">
  <div class="campaign-description">
${heading}
${description}
  </div>
${metadata}
</div>${after}`;
}

function readCampaigns() {
  return fs
    .readdirSync(contentDir)
    .filter((file) => /^SB-\d+\.md$/.test(file))
    .sort()
    .map((file) => {
      const source = fs.readFileSync(path.join(contentDir, file), "utf8");
      const parsed = parseFrontmatter(source, file);
      return {
        file,
        slug: file.replace(/\.md$/, "/"),
        ...parsed,
      };
    });
}

function writeSitePage(baseDir, slug, html) {
  const pageDir = path.join(baseDir, slug);
  fs.mkdirSync(pageDir, { recursive: true });
  fs.writeFileSync(path.join(pageDir, "index.html"), html);
}

function cleanGeneratedDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function readContentCollection(dir, pattern, slugFactory) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => pattern.test(file))
    .sort()
    .map((file) => {
      const source = fs.readFileSync(path.join(dir, file), "utf8");
      const parsed = parseFrontmatter(source, file);
      return {
        file,
        slug: slugFactory(file, parsed.data),
        ...parsed,
      };
    });
}

function readCampaignLogCollections(campaigns) {
  const byCampaign = new Map(campaigns.map((campaign) => [campaign.data.id, []]));
  if (!fs.existsSync(campaignLogDir)) return byCampaign;

  fs.readdirSync(campaignLogDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && byCampaign.has(entry.name))
    .forEach((entry) => {
      const campaignId = entry.name;
      const dir = path.join(campaignLogDir, campaignId);
      const logs = fs
        .readdirSync(dir)
        .filter((file) => /^[A-Z0-9-]+\.md$/.test(file))
        .sort()
        .map((file) => {
          const source = fs.readFileSync(path.join(dir, file), "utf8");
          const parsed = parseFrontmatter(source, file);
          return {
            campaignId,
            file,
            slug: file.replace(/\.md$/, "/"),
            ...parsed,
          };
        });
      byCampaign.set(campaignId, logs);
    });

  return byCampaign;
}

function getReferencedCampaignLogs(campaign, logs) {
  if (!campaign || !logs?.length) return [];
  const ids = [...campaign.body.matchAll(/\[\[([A-Z0-9-]+)\]\]/g)].map((match) => match[1]);
  const uniqueIds = [...new Set(ids)];
  const lookup = createLogLookup(logs);
  return uniqueIds.map((id) => lookup.get(id)).filter(Boolean);
}

function getLegacyCampaignLogs(source, logs) {
  if (!source) return [];
  return logs.filter((log) => source.body.includes(log.data.id));
}

function mergeCampaignLogSources(campaign, detection) {
  return {
    body: [campaign?.body || "", detection?.body || ""].join("\n"),
  };
}

function renderSidebar(campaigns, currentId, options = {}) {
  const { logIndexHref = "/logs/", campaignLogsHref } = options;
  const logLinks =
    campaignLogsHref || logIndexHref
      ? `      <div class="sidebar-block sidebar-sections">
        <div class="sidebar-title">Logs</div>
        <nav class="sidebar-links">
          ${campaignLogsHref ? `<a class="sidebar-link" href="${campaignLogsHref}">Campaign Logs</a>` : ""}
          <a class="sidebar-link" href="${logIndexHref}">Global Log Catalog</a>
        </nav>
      </div>`
      : "";
  return `
    <aside class="campaign-sidebar" aria-label="Campaign navigation">
      <div class="sidebar-block">
        <div class="sidebar-title">Campaigns</div>
        <nav class="sidebar-links">
          ${campaigns
            .map((campaign) => {
              const active = campaign.data.id === currentId ? " active" : "";
              return `<a class="sidebar-link${active}" href="/campaigns/${campaign.slug}"><span>${escapeHtml(campaign.data.id)}</span>${escapeHtml(campaign.data.name)}</a>`;
            })
            .join("\n          ")}
        </nav>
      </div>
${logLinks}
    </aside>`;
}

function renderHeader(title, cssHref = assetHref, logo = logoSrc) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${cssHref}">
</head>
<body>
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="/campaigns/"><img class="brand-logo" src="${logo}" alt="Spacebar"><span>Spacebar Campaigns</span></a>
      <nav class="nav" aria-label="Primary navigation">
        <a href="/campaigns/">Campaigns</a>
        <a href="/workflows/">Blue Team Playbooks</a>
        <a href="/logs/">Log Catalog</a>
      </nav>
    </div>
  </header>`;
}

function renderCampaignPage(campaigns, campaign, campaignLogsByCampaign = new Map()) {
  const { data, body } = campaign;
  const logs = campaignLogsByCampaign.get(data.id) || [];
  const resolvedBody = replaceLogShortcodes(body, data.id, logs, data.format === "html" ? "html" : "markdown");
  let bodyHtml = normalizeInternalLinks(wrapCampaignHero(data.format === "html" ? resolvedBody : markdownToHtml(resolvedBody)), data.id);
  bodyHtml = enhanceCampaignViews(bodyHtml, campaign, logs);
  const campaignLogsHref = campaignLogsByCampaign.get(data.id)?.length ? `/campaigns/${data.id}/logs/` : null;
  return `${renderHeader(`${data.name} | Spacebar Campaigns`)}

  <div class="page-shell">
${renderSidebar(campaigns, data.id, { campaignLogsHref })}
    <main class="page campaign-content">
      <div class="breadcrumbs"><a href="/campaigns/">Home</a> / <a href="/campaigns/">Campaigns</a> / <span>${escapeHtml(data.name)}</span></div>
${bodyHtml}
      <footer class="footer">
        Spacebar Project. This page is not affiliated with MITRE ATT&amp;CK.
      </footer>
    </main>
  </div>
  <script>
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.view;
        const switcher = button.closest(".view-switch");
        if (switcher) {
          switcher.querySelectorAll("[data-view]").forEach((item) => item.classList.toggle("active", item === button));
        }
        document.querySelectorAll(".view-panel").forEach((panel) => panel.classList.toggle("active", panel.id === target));
      });
    });

    const techFilter = document.querySelector("#techFilter");
    const techRows = document.querySelectorAll("#techTable tbody tr");

    if (techFilter) {
      techFilter.addEventListener("input", () => {
        const query = techFilter.value.trim().toLowerCase();
        techRows.forEach((row) => {
          row.hidden = query !== "" && !row.textContent.toLowerCase().includes(query);
        });
      });
    }
  </script>
</body>
</html>
`;
}

function renderDetectionPage(campaigns, detection) {
  const { data, body } = detection;
  const bodyHtml = normalizeInternalLinks(data.format === "html" ? body : markdownToHtml(body), data.campaign);
  const campaign = campaigns.find((item) => item.data.id === data.campaign);
  const campaignName = campaign ? campaign.data.name : data.campaign;
  return `${renderHeader(`${data.name} | Spacebar Detection Map`)}

  <div class="page-shell">
${renderSidebar(campaigns, data.campaign, { logIndexHref: "/logs/", campaignLogsHref: `/campaigns/${data.campaign}/logs/` })}
    <main class="page campaign-content">
      <div class="breadcrumbs"><a href="/campaigns/">Home</a> / <a href="/campaigns/">Campaigns</a> / <a href="/campaigns/${data.campaign}/">${escapeHtml(campaignName)}</a> / <span>Detection Map</span></div>
${bodyHtml}
      <footer class="footer">
        Spacebar Project. This detection map is an educational analysis artifact.
      </footer>
    </main>
  </div>
</body>
</html>
`;
}

function renderEvidencePage(campaigns, evidence) {
  const { data, body } = evidence;
  const bodyHtml = normalizeInternalLinks(data.format === "html" ? body : markdownToHtml(body), data.campaign);
  const campaign = campaigns.find((item) => item.data.id === data.campaign);
  const campaignName = campaign ? campaign.data.name : data.campaign;
  return `${renderHeader(`${data.name} | Spacebar Detection Evidence`)}

  <div class="page-shell">
${renderSidebar(campaigns, data.campaign, { logIndexHref: "/logs/", campaignLogsHref: `/campaigns/${data.campaign}/logs/` })}
    <main class="page campaign-content">
      <div class="breadcrumbs"><a href="/campaigns/">Home</a> / <a href="/campaigns/">Campaigns</a> / <a href="/campaigns/${data.campaign}/">${escapeHtml(campaignName)}</a> / <span>Detection Evidence</span></div>
${bodyHtml}
      <footer class="footer">
        Spacebar Project. This evidence page records reproducible investigation pivots and observed artifacts.
      </footer>
    </main>
  </div>
</body>
</html>
`;
}

function renderCampaignLogSidebar(campaign, logs, currentId = null) {
  return `
    <aside class="campaign-sidebar" aria-label="Campaign log navigation">
      <div class="sidebar-block">
        <div class="sidebar-title">${escapeHtml(campaign.data.id)} Logs</div>
        <nav class="sidebar-links">
          <a class="sidebar-link" href="/campaigns/${campaign.data.id}/">Campaign Page</a>
          <a class="sidebar-link${currentId ? "" : " active"}" href="/campaigns/${campaign.data.id}/logs/">Campaign Logs</a>
          ${logs
            .map((log) => {
              const active = log.data.id === currentId ? " active" : "";
              return `<a class="sidebar-link${active}" href="/campaigns/${campaign.data.id}/logs/${log.data.id}/"><span>${escapeHtml(log.data.id)}</span>${escapeHtml(log.data.name)}</a>`;
            })
            .join("\n          ")}
        </nav>
      </div>
      <div class="sidebar-block">
        <div class="sidebar-title">Global Catalog</div>
        <nav class="sidebar-links">
          <a class="sidebar-link" href="/logs/">All Logs</a>
        </nav>
      </div>
    </aside>`;
}

function renderCampaignLogIndex(campaign, logs) {
  return `${renderHeader(`${campaign.data.id} Logs | Spacebar Campaigns`)}

  <div class="page-shell">
${renderCampaignLogSidebar(campaign, logs)}
    <main class="page campaign-content">
      <div class="breadcrumbs"><a href="/campaigns/">Home</a> / <a href="/campaigns/${campaign.data.id}/">${escapeHtml(campaign.data.name)}</a> / <span>Campaign Logs</span></div>
      <h1>${escapeHtml(campaign.data.id)} Campaign Logs</h1>
      <p class="summary">
        이 페이지는 ${escapeHtml(campaign.data.name)}에서 실제로 참조하는 로그만 모아 보여준다.
        전체 팀 공통 로그 목록은 Global Log Catalog에서 확인한다.
      </p>
      <div class="cards">
${logs
  .map(
    (log) => `        <article class="card">
          <h3><a href="/campaigns/${campaign.data.id}/logs/${log.data.id}/">${escapeHtml(log.data.id)} ${escapeHtml(log.data.name)}</a></h3>
          <p>${escapeHtml(log.data.description || "")}</p>
          <div class="tag-row">
            ${(log.data.techniques || "")
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
              .map((item) => `<span class="tag">${escapeHtml(item)}</span>`)
              .join("\n            ")}
          </div>
        </article>`
  )
  .join("\n")}
      </div>
    </main>
  </div>
</body>
</html>
`;
}

function renderCampaignLogPage(campaign, logs, log) {
  const { data, body } = log;
  const bodyHtml = normalizeInternalLinks(data.format === "html" ? body : markdownToHtml(body), campaign.data.id);
  return `${renderHeader(`${campaign.data.id} ${data.id} ${data.name} | Spacebar Campaign Logs`)}

  <div class="page-shell">
${renderCampaignLogSidebar(campaign, logs, data.id)}
    <main class="page campaign-content">
      <div class="breadcrumbs"><a href="/campaigns/">Home</a> / <a href="/campaigns/${campaign.data.id}/">${escapeHtml(campaign.data.name)}</a> / <a href="/campaigns/${campaign.data.id}/logs/">Campaign Logs</a> / <span>${escapeHtml(data.id)}</span></div>
${bodyHtml}
      <footer class="footer">
        Spacebar Project. This campaign log page is scoped to ${escapeHtml(campaign.data.id)}.
      </footer>
    </main>
  </div>
</body>
</html>
`;
}

function renderLogSidebar(logs, currentId, detections = []) {
  return `
    <aside class="campaign-sidebar" aria-label="Log catalog navigation">
      <div class="sidebar-block">
        <div class="sidebar-title">Log Catalog</div>
        <nav class="sidebar-links">
          <a class="sidebar-link" href="/logs/">Index</a>
          ${logs
            .map((log) => {
              const active = log.data.id === currentId ? " active" : "";
              return `<a class="sidebar-link${active}" href="/logs/${log.slug}"><span>${escapeHtml(log.data.id)}</span>${escapeHtml(log.data.name)}</a>`;
            })
            .join("\n          ")}
        </nav>
      </div>
      <div class="sidebar-block">
        <div class="sidebar-title">Campaigns</div>
        <nav class="sidebar-links">
          <a class="sidebar-link" href="/campaigns/">Campaign Index</a>
          ${detections
            .map(
              (detection) =>
                `<a class="sidebar-link" href="/campaigns/${detection.slug}"><span>${escapeHtml(detection.data.campaign)}</span>${escapeHtml(detection.data.name)}</a>`
            )
            .join("\n          ")}
        </nav>
      </div>
    </aside>`;
}

function renderLogPage(logs, log, detections = []) {
  const { data, body } = log;
  const bodyHtml = normalizeInternalLinks(data.format === "html" ? body : markdownToHtml(body));
  return `${renderHeader(`${data.id} ${data.name} | Spacebar Log Catalog`)}

  <div class="page-shell">
${renderLogSidebar(logs, data.id, detections)}
    <main class="page campaign-content">
      <div class="breadcrumbs"><a href="/campaigns/">Home</a> / <a href="/logs/">Log Catalog</a> / <span>${escapeHtml(data.id)}</span></div>
${bodyHtml}
      <footer class="footer">
        Spacebar Project. Log IDs are project-defined analysis identifiers, not MITRE ATT&amp;CK IDs.
      </footer>
    </main>
  </div>
</body>
</html>
`;
}

function renderLogIndex(logs) {
  return `${renderHeader("Spacebar Log Catalog")}

  <main class="page">
    <div class="breadcrumbs"><a href="/campaigns/">Home</a> / <span>Log Catalog</span></div>
    <h1>Log Catalog</h1>
    <p class="summary">
      각 로그 문서는 원본 위치, 수집 방식, 로그 포맷, 주요 필드 의미, 커버 가능한 Technique을 분리해 정리한다.
      Campaign Detection Map은 이 Log ID를 참조하고, Log Catalog는 어떤 Technique과 연결되는지 역매핑한다.
    </p>
    <div class="cards">
${logs
  .map(
    (log) => `      <article class="card">
        <h3><a href="${log.slug}">${escapeHtml(log.data.id)} ${escapeHtml(log.data.name)}</a></h3>
        <p>${escapeHtml(log.data.description || "")}</p>
        <div class="tag-row">
          ${(log.data.techniques || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item) => `<span class="tag">${escapeHtml(item)}</span>`)
            .join("\n          ")}
        </div>
      </article>`
  )
  .join("\n")}
    </div>
  </main>
</body>
</html>
`;
}

function renderWorkflowPage(workflow) {
  const { data, body } = workflow;
  const bodyHtml = normalizeInternalLinks(data.format === "html" ? body : markdownToHtml(body));
  return `${renderHeader(`${data.id} ${data.name} | Spacebar Blue Team Playbooks`)}

  <main class="page">
    <div class="breadcrumbs"><a href="/campaigns/">Home</a> / <a href="/workflows/">Blue Team Playbooks</a> / <span>${escapeHtml(data.id)}</span></div>
${bodyHtml}
    <footer class="footer">
      Spacebar Project. This workflow is an educational blue team playbook artifact.
    </footer>
  </main>
</body>
</html>
`;
}

function renderWorkflowIndex(workflows) {
  return `${renderHeader("Spacebar Blue Team Playbooks")}

  <main class="page">
    <div class="breadcrumbs"><a href="/campaigns/">Home</a> / <span>Blue Team Playbooks</span></div>
    <h1>Blue Team Playbooks</h1>
    <p class="summary">
      Technique 하나가 아니라, 실제 관제와 침해사고 대응에서 반복적으로 마주치는 행위 단위로 분석 흐름을 정리한다.
      각 Workflow는 먼저 볼 로그, 빠른 쿼리, 분석 순서, LLM Prompt Template, 대응 요약을 포함한다.
    </p>
    <div class="cards">
${workflows
  .map(
    (workflow) => `      <article class="card">
        <h3><a href="/workflows/${workflow.slug}">${escapeHtml(workflow.data.id)} ${escapeHtml(workflow.data.name)}</a></h3>
        <p>${escapeHtml(workflow.data.description || "")}</p>
        <div class="tag-row">
          ${(workflow.data.techniques || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item) => `<span class="tag">${escapeHtml(item)}</span>`)
            .join("\n          ")}
        </div>
      </article>`
  )
  .join("\n")}
    </div>
  </main>
</body>
</html>
`;
}

function renderWorkflowCards(workflows) {
  if (!workflows.length) {
    return `        <article class="card">
          <h3>작성된 Workflow 없음</h3>
          <p><code>content/workflows/</code> 아래에 Markdown 파일을 추가하면 자동으로 표시된다.</p>
        </article>`;
  }

  return workflows
    .map(
      (workflow) => `        <article class="card">
          <h3><a href="/workflows/${workflow.slug}">${escapeHtml(workflow.data.id)} ${escapeHtml(workflow.data.name)}</a></h3>
          <p>${escapeHtml(workflow.data.description || "")}</p>
          <div class="tag-row">
            ${(workflow.data.techniques || "")
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
              .map((item) => `<span class="tag">${escapeHtml(item)}</span>`)
              .join("\n            ")}
          </div>
        </article>`
    )
    .join("\n");
}

function renderIndex(campaigns, detectionByCampaign = new Map(), logs = [], workflows = []) {
  return `${renderHeader("Spacebar Campaigns")}

  <main class="page">
    <div class="breadcrumbs"><a href="./">Home</a> / <span>Campaigns</span></div>
    <h1>Campaigns</h1>
    <p class="summary">
      Spacebar 팀은 기업형 피해 시스템을 모델링하고, 각 환경에서 발생 가능한 공격 방식과 침해 흐름을 분석했다.
      각 캠페인은 공통 목표와 대상 시스템을 기준으로 공격자의 TTPs를 정리하고, 이를 MITRE ATT&amp;CK Campaign 페이지 형식에 맞춰 구성한 결과물이다.
    </p>

    <div class="view-switch" aria-label="Campaign index views">
      <button class="active" type="button" data-view="index-campaigns">Campaign List</button>
      <button type="button" data-view="index-workflows">Blue Team Playbooks</button>
      <button type="button" data-view="index-logs">Log Catalog</button>
    </div>

    <section class="view-panel active" id="index-campaigns">
      <h2>Campaign List</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Description</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
${campaigns
  .map((campaign) => {
    return `          <tr>
            <td class="id-cell">${escapeHtml(campaign.data.id)}</td>
            <td><a href="${campaign.slug}">${escapeHtml(campaign.data.name)}</a></td>
            <td>${escapeHtml(campaign.data.description || "")}</td>
            <td>${escapeHtml(campaign.data.owner || "")}</td>
          </tr>`;
  })
  .join("\n")}
          </tbody>
        </table>
      </div>
    </section>

    <section class="view-panel" id="index-workflows">
      <h2>Blue Team Playbooks</h2>
      <p class="summary">
        Technique별 프롬프트가 아니라, 내부망 원격 실행, 내부망 스캔, credential 접근, 데이터 staging 같은
        반복 공격 행위별 IR Workflow를 정리한다.
      </p>
      <div class="cards">
${renderWorkflowCards(workflows)}
      </div>
    </section>

    <section class="view-panel" id="index-logs">
      <h2>Log Catalog</h2>
      <p class="summary">
        로그별 저장 위치, 수집 방식, 주요 필드, 연결 Technique을 분리해 정리한 공통 로그 사전이다.
      </p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Description</th>
              <th>Techniques</th>
            </tr>
          </thead>
          <tbody>
${logs
  .map((log) => {
    return `          <tr>
            <td class="id-cell"><a href="/logs/${log.slug}">${escapeHtml(log.data.id)}</a></td>
            <td>${escapeHtml(log.data.name || "")}</td>
            <td>${escapeHtml(log.data.description || "")}</td>
            <td>${escapeHtml(log.data.techniques || "")}</td>
          </tr>`;
  })
  .join("\n")}
          </tbody>
        </table>
      </div>
    </section>
  </main>
  <script>
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.view;
        const switcher = button.closest(".view-switch");
        if (switcher) {
          switcher.querySelectorAll("[data-view]").forEach((item) => item.classList.toggle("active", item === button));
        }
        document.querySelectorAll(".view-panel").forEach((panel) => panel.classList.toggle("active", panel.id === target));
      });
    });
  </script>
</body>
</html>
`;
}

function main() {
  const campaigns = readCampaigns();
  const detections = readContentCollection(detectionDir, /^SB-\d+\.md$/, (file) =>
    file.replace(/\.md$/, "/detection-map/")
  );
  const evidences = readContentCollection(evidenceDir, /^SB-\d+\.md$/, (file) =>
    file.replace(/\.md$/, "/evidence/")
  );
  const detectionByCampaign = new Map(detections.map((detection) => [detection.data.campaign, detection]));
  const logs = readContentCollection(logCatalogDir, /^[A-Z]+-\d+\.md$/, (file) =>
    file.replace(/\.md$/, "/")
  );
  const workflows = readContentCollection(workflowDir, /^WF-[A-Z0-9-]+\.md$/, (file) =>
    file.replace(/\.md$/, "/")
  ).sort((a, b) => {
    const aIndex = workflowOrder.indexOf(a.data.id);
    const bIndex = workflowOrder.indexOf(b.data.id);
    const aOrder = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const bOrder = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    return aOrder - bOrder || a.data.id.localeCompare(b.data.id);
  });
  const allCampaignLogsByCampaign = readCampaignLogCollections(campaigns);
  const campaignLogsByCampaign = new Map(
    campaigns.map((campaign) => {
      const campaignSpecificLogs = allCampaignLogsByCampaign.get(campaign.data.id) || [];
      if (campaignSpecificLogs.length) {
        return [campaign.data.id, getReferencedCampaignLogs(campaign, campaignSpecificLogs)];
      }

      const detection = detectionByCampaign.get(campaign.data.id);
      return [campaign.data.id, getLegacyCampaignLogs(mergeCampaignLogSources(campaign, detection), logs)];
    })
  );
  cleanGeneratedDir(outDir);
  cleanGeneratedDir(logsOutDir);
  cleanGeneratedDir(workflowsOutDir);

  campaigns.forEach((campaign) => {
    writeSitePage(outDir, campaign.slug, renderCampaignPage(campaigns, campaign, campaignLogsByCampaign));
  });

  detections.forEach((detection) => {
    writeSitePage(outDir, detection.slug, renderDetectionPage(campaigns, detection));
  });

  evidences.forEach((evidence) => {
    writeSitePage(outDir, evidence.slug, renderEvidencePage(campaigns, evidence));
  });

  logs.forEach((log) => {
    writeSitePage(logsOutDir, log.slug, renderLogPage(logs, log, detections));
  });

  workflows.forEach((workflow) => {
    writeSitePage(workflowsOutDir, workflow.slug, renderWorkflowPage(workflow));
  });

  campaigns.forEach((campaign) => {
    const campaignLogs = campaignLogsByCampaign.get(campaign.data.id) || [];
    if (!campaignLogs.length) return;

    const campaignLogsBase = path.join(outDir, campaign.data.id, "logs");
    fs.mkdirSync(campaignLogsBase, { recursive: true });
    fs.writeFileSync(path.join(campaignLogsBase, "index.html"), renderCampaignLogIndex(campaign, campaignLogs));
    campaignLogs.forEach((log) => {
      writeSitePage(campaignLogsBase, `${log.data.id}/`, renderCampaignLogPage(campaign, campaignLogs, log));
    });
  });

  fs.writeFileSync(path.join(outDir, "index.html"), renderIndex(campaigns, detectionByCampaign, logs, workflows));
  fs.writeFileSync(path.join(logsOutDir, "index.html"), renderLogIndex(logs));
  fs.writeFileSync(path.join(workflowsOutDir, "index.html"), renderWorkflowIndex(workflows));
}

main();
