const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const contentDir = path.join(root, "content", "campaigns");
const detectionDir = path.join(root, "content", "detections");
const logCatalogDir = path.join(root, "content", "log-catalog");
const outDir = path.join(root, "campaigns");
const logsOutDir = path.join(root, "logs");
const assetHref = "../assets/campaign.css";
const logoSrc = "../assets/spacebarLogo.png";

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
        slug: file.replace(/\.md$/, ".html"),
        ...parsed,
      };
    });
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

function renderSidebar(campaigns, currentId, options = {}) {
  const { detectionSlug, logIndexHref = "../logs/" } = options;
  return `
    <aside class="campaign-sidebar" aria-label="Campaign navigation">
      <div class="sidebar-block">
        <div class="sidebar-title">Campaigns</div>
        <nav class="sidebar-links">
          ${campaigns
            .map((campaign) => {
              const active = campaign.data.id === currentId ? " active" : "";
              return `<a class="sidebar-link${active}" href="${campaign.slug}"><span>${escapeHtml(campaign.data.id)}</span>${escapeHtml(campaign.data.name)}</a>`;
            })
            .join("\n          ")}
        </nav>
      </div>
      <div class="sidebar-block sidebar-sections">
        <div class="sidebar-title">On This Page</div>
        <nav class="sidebar-links">
          ${detectionSlug ? `<a class="sidebar-link" href="${detectionSlug}">Detection Map</a>` : ""}
          <a class="sidebar-link" href="#techniques-used">Techniques Used</a>
          <a class="sidebar-link" href="#software">Software</a>
          <a class="sidebar-link" href="#references">References</a>
          <a class="sidebar-link" href="${logIndexHref}">Log Catalog</a>
        </nav>
      </div>
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
      <a class="brand" href="./"><img class="brand-logo" src="${logo}" alt="Spacebar"><span>Spacebar Campaigns</span></a>
    </div>
  </header>`;
}

function renderCampaignPage(campaigns, campaign, detectionByCampaign = new Map()) {
  const { data, body } = campaign;
  const bodyHtml = wrapCampaignHero(data.format === "html" ? body : markdownToHtml(body));
  const detectionSlug = detectionByCampaign.get(data.id)?.slug;
  return `${renderHeader(`${data.name} | Spacebar Campaigns`)}

  <div class="page-shell">
${renderSidebar(campaigns, data.id, { detectionSlug })}
    <main class="page campaign-content">
      <div class="breadcrumbs"><a href="./">Home</a> / <a href="./">Campaigns</a> / <span>${escapeHtml(data.name)}</span></div>
${bodyHtml}
      <footer class="footer">
        Spacebar Project. This page is not affiliated with MITRE ATT&amp;CK.
      </footer>
    </main>
  </div>
  <script>
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
  const bodyHtml = data.format === "html" ? body : markdownToHtml(body);
  const campaign = campaigns.find((item) => item.data.id === data.campaign);
  const campaignName = campaign ? campaign.data.name : data.campaign;
  return `${renderHeader(`${data.name} | Spacebar Detection Map`)}

  <div class="page-shell">
${renderSidebar(campaigns, data.campaign, { logIndexHref: "../logs/" })}
    <main class="page campaign-content">
      <div class="breadcrumbs"><a href="./">Home</a> / <a href="./">Campaigns</a> / <a href="${data.campaign}.html">${escapeHtml(campaignName)}</a> / <span>Detection Map</span></div>
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

function renderLogSidebar(logs, currentId, detections = []) {
  return `
    <aside class="campaign-sidebar" aria-label="Log catalog navigation">
      <div class="sidebar-block">
        <div class="sidebar-title">Log Catalog</div>
        <nav class="sidebar-links">
          <a class="sidebar-link" href="./">Index</a>
          ${logs
            .map((log) => {
              const active = log.data.id === currentId ? " active" : "";
              return `<a class="sidebar-link${active}" href="${log.slug}"><span>${escapeHtml(log.data.id)}</span>${escapeHtml(log.data.name)}</a>`;
            })
            .join("\n          ")}
        </nav>
      </div>
      <div class="sidebar-block">
        <div class="sidebar-title">Campaigns</div>
        <nav class="sidebar-links">
          <a class="sidebar-link" href="../campaigns/">Campaign Index</a>
          ${detections
            .map(
              (detection) =>
                `<a class="sidebar-link" href="../campaigns/${detection.slug}"><span>${escapeHtml(detection.data.campaign)}</span>${escapeHtml(detection.data.name)}</a>`
            )
            .join("\n          ")}
        </nav>
      </div>
    </aside>`;
}

function renderLogPage(logs, log, detections = []) {
  const { data, body } = log;
  const bodyHtml = data.format === "html" ? body : markdownToHtml(body);
  return `${renderHeader(`${data.id} ${data.name} | Spacebar Log Catalog`, "../assets/campaign.css", "../assets/spacebarLogo.png")}

  <div class="page-shell">
${renderLogSidebar(logs, data.id, detections)}
    <main class="page campaign-content">
      <div class="breadcrumbs"><a href="../campaigns/">Home</a> / <a href="./">Log Catalog</a> / <span>${escapeHtml(data.id)}</span></div>
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
  return `${renderHeader("Spacebar Log Catalog", "../assets/campaign.css", "../assets/spacebarLogo.png")}

  <main class="page">
    <div class="breadcrumbs"><a href="../campaigns/">Home</a> / <span>Log Catalog</span></div>
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

function renderIndex(campaigns, detectionByCampaign = new Map()) {
  return `${renderHeader("Spacebar Campaigns")}

  <main class="page">
    <div class="breadcrumbs"><a href="./">Home</a> / <span>Campaigns</span></div>
    <h1>Campaigns</h1>
    <p class="summary">
      Spacebar 팀은 기업형 피해 시스템을 모델링하고, 각 환경에서 발생 가능한 공격 방식과 침해 흐름을 분석했다.
      각 캠페인은 공통 목표와 대상 시스템을 기준으로 공격자의 TTPs를 정리하고, 이를 MITRE ATT&amp;CK Campaign 페이지 형식에 맞춰 구성한 결과물이다.
    </p>

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
    const detection = detectionByCampaign.get(campaign.data.id);
    const ownerCell = detection
      ? `${escapeHtml(campaign.data.owner || "")}<br><a href="${detection.slug}">Detection Map</a>`
      : escapeHtml(campaign.data.owner || "");
    return `          <tr>
            <td class="id-cell">${escapeHtml(campaign.data.id)}</td>
            <td><a href="${campaign.slug}">${escapeHtml(campaign.data.name)}</a></td>
            <td>${escapeHtml(campaign.data.description || "")}</td>
            <td>${ownerCell}</td>
          </tr>`;
  })
  .join("\n")}
        </tbody>
      </table>
    </div>
  </main>
</body>
</html>
`;
}

function main() {
  const campaigns = readCampaigns();
  const detections = readContentCollection(detectionDir, /^SB-\d+\.md$/, (file) =>
    file.replace(/\.md$/, "-detection-map.html")
  );
  const detectionByCampaign = new Map(detections.map((detection) => [detection.data.campaign, detection]));
  const logs = readContentCollection(logCatalogDir, /^[A-Z]+-\d+\.md$/, (file) =>
    file.replace(/\.md$/, ".html")
  );
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(logsOutDir, { recursive: true });

  campaigns.forEach((campaign) => {
    fs.writeFileSync(path.join(outDir, campaign.slug), renderCampaignPage(campaigns, campaign, detectionByCampaign));
  });

  detections.forEach((detection) => {
    fs.writeFileSync(path.join(outDir, detection.slug), renderDetectionPage(campaigns, detection));
  });

  logs.forEach((log) => {
    fs.writeFileSync(path.join(logsOutDir, log.slug), renderLogPage(logs, log, detections));
  });

  fs.writeFileSync(path.join(outDir, "index.html"), renderIndex(campaigns, detectionByCampaign));
  fs.writeFileSync(path.join(logsOutDir, "index.html"), renderLogIndex(logs));
}

main();
