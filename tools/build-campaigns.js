const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const contentDir = path.join(root, "content", "campaigns");
const outDir = path.join(root, "campaigns");
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
  return known[key] || key.replace(/[^a-z0-9가-힣]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
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

function renderSidebar(campaigns, currentId) {
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
          <a class="sidebar-link" href="#techniques-used">Techniques Used</a>
          <a class="sidebar-link" href="#software">Software</a>
          <a class="sidebar-link" href="#references">References</a>
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

function renderCampaignPage(campaigns, campaign) {
  const { data, body } = campaign;
  const bodyHtml = data.format === "html" ? body : markdownToHtml(body);
  return `${renderHeader(`${data.name} | Spacebar Campaigns`)}

  <div class="page-shell">
${renderSidebar(campaigns, data.id)}
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

function renderIndex(campaigns) {
  return `${renderHeader("Spacebar Campaigns")}

  <main class="page">
    <div class="breadcrumbs"><a href="./">Home</a> / <span>Campaigns</span></div>
    <h1>Campaigns</h1>
    <p class="summary">
      Spacebar 팀은 기업형 피해 시스템을 모델링한 뒤 각 환경에서 발생 가능한 공격 방식과 침해 흐름을 분석했다.
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
  .map(
    (campaign) => `          <tr>
            <td class="id-cell">${escapeHtml(campaign.data.id)}</td>
            <td><a href="${campaign.slug}">${escapeHtml(campaign.data.name)}</a></td>
            <td>${escapeHtml(campaign.data.description || "")}</td>
            <td>${escapeHtml(campaign.data.owner || "")}</td>
          </tr>`
  )
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
  fs.mkdirSync(outDir, { recursive: true });

  campaigns.forEach((campaign) => {
    fs.writeFileSync(path.join(outDir, campaign.slug), renderCampaignPage(campaigns, campaign));
  });

  fs.writeFileSync(path.join(outDir, "index.html"), renderIndex(campaigns));
}

main();
