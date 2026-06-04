<p align="center">
  <img src="assets/spacebarLogo.png" alt="Spacebar Logo" width="120">
</p>

# Spacebar MITRE ATT&CK Campaigns

Spacebar 팀의 MITRE ATT&CK Campaign 형식 정리 페이지입니다.

각 팀원은 자신이 모델링한 기업형 피해 환경을 바탕으로 공격 흐름을 분석하고, 해당 행위를 MITRE ATT&CK Technique에 매핑하여 캠페인 페이지로 작성합니다. 이 페이지들은 이후 BAS 공격 모듈 설계, ELK 탐지 포인트 정리, 침해사고 대응 플레이북 작성에 활용됩니다.

공개 페이지:

```text
https://spacebar-mitre-attack-campaigns.vercel.app/campaigns/
```

## 처음 작성하는 팀원을 위한 요약

처음 기여하는 팀원은 아래 순서만 따라 하면 됩니다.

1. 내 담당 캠페인 파일을 수정합니다.
   - 예: `content/campaigns/SB-03.md`
2. 새 로그 상세가 있으면 내 캠페인 로그 폴더에 Markdown 파일을 만듭니다.
   - 예: `content/campaign-logs/SB-03/WL-003.md`
3. 만든 로그를 캠페인 본문에 연결합니다.
   - 예: `content/campaigns/SB-03.md` 안에 `[[WL-003]]` 추가
4. 로컬 확인이 필요하면 `npm run build` 후 `/campaigns/` 페이지를 확인합니다.
5. `main` 브랜치에 push하면 GitHub Actions가 HTML을 다시 만들고, Vercel이 배포합니다.

핵심은 하나입니다.

```text
팀원이 수정하는 원본: content/
자동으로 만들어지는 결과물: campaigns/, logs/
```

## 폴더 구조

```text
spacebar-mitre-attack-campaigns/
|
|-- content/                         # 팀원이 직접 수정하는 원본 Markdown
|   |
|   |-- campaign-template.md         # Campaign Page 작성 템플릿
|   |
|   |-- campaigns/                   # Campaign Page 1 원본
|   |   |-- SB-01.md                 # SB-01 캠페인 본문
|   |   `-- SB-XX.md                 # 각자 담당 캠페인 파일
|   |
|   |-- campaign-logs/               # 캠페인별 로그 상세 원본
|   |   |-- TEMPLATE.md              # 새 로그 상세 페이지 작성용 복사 템플릿
|   |   |
|   |   |-- SB-01/                   # SB-01에서 사용하는 로그 상세
|   |   |   |-- LL-001.md
|   |   |   |-- LL-002.md
|   |   |   |-- DBL-001.md
|   |   |   `-- AWSL-001.md
|   |   |
|   |   `-- SB-XX/                   # 팀원별 캠페인 로그 폴더
|   |       `-- LOG-ID.md            # 예: WL-001.md, DBL-001.md
|   |
|   |-- log-catalog/                 # 공통 Log Catalog 원본
|   |   `-- LL-001.md
|   |
|   |-- workflows/                   # Blue Team Workflow 원본
|   |   |-- TEMPLATE.md
|   |   |-- WF-REMOTE-001.md
|   |   `-- WF-SCAN-001.md
|   |
|   `-- detections/                  # 선택 사항: Campaign Detection Map 원본
|       `-- SB-XX.md
|
|-- campaigns/                       # 빌드 결과물: 직접 수정하지 않음
|   |-- index.html                   # Campaign 목록 페이지
|   `-- SB-01/
|       |-- index.html               # SB-01 캠페인 페이지
|       |-- detection-map/
|       |   `-- index.html           # SB-01 Detection Map 페이지
|       `-- logs/
|           |-- index.html           # SB-01 Campaign Logs 목록
|           |-- LL-001/
|           |   `-- index.html       # LL-001 상세 페이지
|           `-- DBL-001/
|               `-- index.html       # DBL-001 상세 페이지
|
|-- logs/                            # 빌드 결과물: 공통 Log Catalog 페이지
|   |-- index.html
|   `-- LL-001/
|       `-- index.html
|
|-- workflows/                       # 빌드 결과물: Blue Team Workflow 페이지
|   |-- index.html
|   `-- WF-REMOTE-001/
|       `-- index.html
|
|-- assets/                          # 공통 CSS, 이미지
|-- tools/                           # Markdown을 HTML로 변환하는 빌드 스크립트
|-- README.md
`-- CONTRIBUTING.md
```

중요:

- 팀원은 기본적으로 `content/` 아래 원본 Markdown만 수정합니다. `content/`가 원본(source of truth)입니다.
- `campaigns/`, `logs/`는 GitHub Actions가 생성하는 빌드 결과물입니다. 직접 수정하지 않습니다.
- 직접 만든 HTML 디자인을 쓰고 싶어도 `campaigns/`에 HTML을 바로 올리지 말고, `content/campaigns/SB-XX.md` 안에 `format: html` 방식으로 넣습니다.
- Blue Team Workflow는 `workflows/`에 HTML을 바로 올리지 말고 `content/workflows/WF-XXX.md`에 작성합니다.
- 캠페인 로그 상세 페이지는 파일을 만드는 것과 캠페인에 연결하는 것이 별도입니다. `content/campaign-logs/SB-XX/LOG-ID.md`를 만든 뒤, `content/campaigns/SB-XX.md`에서 `[[LOG-ID]]`로 참조해야 공개 페이지에 생성됩니다.
- `main` 브랜치에 push하면 GitHub Actions가 HTML을 생성해 커밋하고, Vercel은 생성된 정적 파일을 배포합니다.
- 팀원별 로그 상세 페이지는 `content/campaign-logs/SB-XX/LOG-ID.md`에 작성합니다.

## 가장 중요한 작성 규칙

이 레포에는 원본 문서와 빌드 결과물이 같이 들어 있습니다. 헷갈릴 때는 아래 기준만 기억하면 됩니다.

| 구분 | 위치 | 직접 수정 여부 | 설명 |
| --- | --- | --- | --- |
| Campaign 원본 | `content/campaigns/SB-XX.md` | 수정함 | 팀원이 작성하는 Campaign Page 1 원본 |
| Campaign Log 원본 | `content/campaign-logs/SB-XX/LOG-ID.md` | 수정함 | 캠페인별 로그 상세 원본 |
| Global Log Catalog 원본 | `content/log-catalog/LOG-ID.md` | 수정함 | 전체 공통 로그 카탈로그 원본 |
| Blue Team Workflow 원본 | `content/workflows/WF-XXX.md` | 수정함 | 행위 기반 IR Workflow 원본 |
| Detection Map 원본 | `content/detections/SB-XX.md` | 필요할 때 수정함 | 캠페인별 탐지 매핑 페이지 원본 |
| Campaign HTML | `campaigns/**/index.html` | 수정하지 않음 | `npm run build` 또는 GitHub Actions가 생성 |
| Log HTML | `logs/**/index.html` | 수정하지 않음 | `npm run build` 또는 GitHub Actions가 생성 |
| Workflow HTML | `workflows/**/index.html` | 수정하지 않음 | `npm run build` 또는 GitHub Actions가 생성 |

즉, 팀원이 손으로 고치는 파일은 거의 항상 `content/` 아래 파일입니다.

```text
수정할 곳: content/
수정하지 않을 곳: campaigns/, logs/
```

`campaigns/`, `logs/` 아래 HTML을 직접 수정해도 다음 빌드 때 덮어써질 수 있고, 캠페인 목록/왼쪽 메뉴/로그 연결 구조가 깨질 수 있습니다.

## 공개 URL 구조

```text
/campaigns/                       # Campaign 목록
/campaigns/SB-01/                 # SB-01 Campaign Page 1
/campaigns/SB-01/detection-map/   # SB-01 Detection Map
/campaigns/SB-01/logs/            # SB-01에서 쓰는 로그 묶음
/campaigns/SB-01/logs/LL-001/     # SB-01 기준 로그 상세
/logs/                            # Log Catalog 목록
/logs/LL-001/                     # 로그 상세 페이지
/workflows/                       # Blue Team Workflow 목록
/workflows/WF-REMOTE-001/         # Workflow 상세 페이지
```

## Blue Team Workflow 작성

행위 기반 IR Workflow는 아래 위치에 Markdown으로 작성합니다.

```text
content/workflows/WF-XXX.md
```

새 Workflow를 만들 때는 `content/workflows/TEMPLATE.md`를 복사해서 사용합니다.
파일 맨 위에는 아래 frontmatter가 필요합니다.

```markdown
---
id: WF-REMOTE-001
name: "내부망 원격 실행 분석"
description: "SSH, WinRM, PowerShell 등으로 내부 서버에 접속하거나 원격 명령을 실행한 정황을 분석한다."
techniques: "T1021.004, T1021.006, T1059.001, T1078"
---
```

빌드하면 아래 URL로 생성됩니다.

```text
/workflows/
/workflows/WF-REMOTE-001/
```

## 캠페인별 로그 상세 페이지 작성

각 팀원은 자기 캠페인 폴더 아래에 로그 상세 Markdown을 추가하면 됩니다.

```text
content/campaign-logs/SB-XX/LOG-ID.md
```

예시:

```text
content/campaign-logs/SB-01/LL-001.md
content/campaign-logs/SB-01/DBL-001.md
```

파일 맨 위에는 아래 frontmatter가 필요합니다.

```markdown
---
id: WL-003
name: "Windows Security 4769 Kerberos Service Ticket Request"
description: "Kerberoasting 행위와 관련된 서비스 티켓 요청 로그를 정리한다."
techniques: "T1558.003"
---
```

`id`는 파일명과 맞추는 것을 권장합니다. 예를 들어 `WL-003.md`라면 `id: WL-003`처럼 작성합니다.

주의: 이 파일을 만들기만 해서는 공개 페이지에 나오지 않습니다. 캠페인 본문에서 `[[LOG-ID]]`로 연결해야 합니다.

파일을 만들 때는 `content/campaign-logs/TEMPLATE.md`를 복사해서 사용합니다. 로그 상세 페이지는 아래 7개 항목만 채우면 됩니다.

```text
공격 행위 요약
로그 발생 위치
수집 방식
실제 관측 로그 예시
주요 필드
커버하는 Techniques Used
탐지 포인트
```

`주요 필드`는 `필드 / 의미 / 예시` 3개 컬럼으로 작성합니다. `예시`에는 실제 관측 로그에서 확인한 값이나 그 형태를 넣습니다.

캠페인 페이지에서 로그를 연결하려면 `content/campaigns/SB-XX.md` 안에 로그 ID를 `[[LOG-ID]]` 형식으로 적습니다. 보통 아래 두 위치 중 하나에 넣습니다.

1. `## Campaign Logs` 표
2. `## Techniques Used` 표의 `Primary Logs` 컬럼

예시 1: `## Campaign Logs` 표에 연결

```markdown
## Campaign Logs

| Log ID | Purpose |
| --- | --- |
| [[WL-001]] | Sysmon Event ID 1 기반 프로세스 생성 로그로, 초기 실행과 도메인 정찰 행위를 확인한다. |
| [[WL-002]] | Sysmon Event ID 3 기반 네트워크 연결 로그로, 비정상 아웃바운드 연결과 C2 연결 시도를 확인한다. |
| [[WL-003]] | Windows Security Event ID 4769 기반 Kerberos 서비스 티켓 요청 로그로, Kerberoasting 행위를 확인한다. |
```

예시 2: `Techniques Used` 표의 `Primary Logs` 컬럼에 연결

```markdown
| ID | Name | Use | Primary Logs |
| --- | --- | --- | --- |
| T1021.004 | Remote Services: SSH | Jenkins에서 확보한 배포 credential로 App 서버에 SSH 접속했다. | [[LL-001]] |
```

빌드하면 참조된 로그만 아래 페이지로 생성되고 링크됩니다.

```text
/campaigns/SB-XX/logs/
/campaigns/SB-XX/logs/LOG-ID/
```

예를 들어 `content/campaign-logs/SB-03/WL-003.md`를 만들었더라도 `content/campaigns/SB-03.md`에 `[[WL-003]]`가 없으면 아래 URL은 생성되지 않습니다.

```text
/campaigns/SB-03/logs/WL-003/
```

이 구조는 작성 중인 로그가 실수로 공개 페이지에 노출되는 것을 막기 위한 것입니다.

## Campaign Log와 Global Log Catalog 차이

로그 문서는 두 종류가 있습니다.

| 구분 | 위치 | 공개 URL | 사용 기준 |
| --- | --- | --- | --- |
| Campaign Log | `content/campaign-logs/SB-XX/LOG-ID.md` | `/campaigns/SB-XX/logs/LOG-ID/` | 특정 캠페인에서 실제로 사용한 로그 |
| Global Log Catalog | `content/log-catalog/LOG-ID.md` | `/logs/LOG-ID/` | 여러 캠페인에서 공통으로 참고할 수 있는 로그 사전 |

대부분의 팀원 작업은 `Campaign Log`에 해당합니다. 어떤 위치에 작성해야 할지 헷갈리면 먼저 `content/campaign-logs/SB-XX/` 아래에 작성합니다.

## 팀원별 수정 파일

| ID | 담당자 | Campaign Page | Campaign Logs |
| --- | --- | --- | --- |
| SB-01 | 임준서 | `content/campaigns/SB-01.md` | `content/campaign-logs/SB-01/` |
| SB-03 | 신가현 | `content/campaigns/SB-03.md` | `content/campaign-logs/SB-03/` |
| SB-04 | 서현재 | `content/campaigns/SB-04.md` | `content/campaign-logs/SB-04/` |
| SB-05 | 강지윤 | `content/campaigns/SB-05.md` | `content/campaign-logs/SB-05/` |
| SB-06 | 오한결 | `content/campaigns/SB-06.md` | `content/campaign-logs/SB-06/` |

## 작성 방식 1: Markdown으로 작성하기

가장 기본 방식입니다. `content/campaigns/SB-XX.md` 파일 맨 위에 아래처럼 정보를 적고, 그 아래는 Markdown으로 작성하면 됩니다.

```markdown
---
id: SB-XX
name: "캠페인 이름"
owner: "작성자 이름"
description: "캠페인 목록에 표시될 짧은 설명"
---

# 캠페인 이름

## Overview

여기에 캠페인 설명을 작성합니다.

## Groups

| ID | Name | Description |
| --- | --- | --- |
| G-SB-XXX | 그룹명 | 그룹 설명 |

## Techniques Used

| ID | Name | Use | Primary Logs |
| --- | --- | --- | --- |
| TXXXX | Technique Name | 이 캠페인에서 해당 Technique이 어떻게 사용되었는지 작성 | [[LOG-ID]] 또는 작성 예정 |

## Software

| ID | Name | Description |
| --- | --- | --- |
| S-SB-XXX | 도구명 | 도구 설명 |

## References

- 참고 자료
```

이 방식은 글 위주로 정리할 때 편합니다.

## 작성 방식 2: HTML 본문으로 커스텀하기

팀원이 이미 HTML로 캠페인 페이지를 만들어왔거나, 복잡한 표와 블록을 직접 제어하고 싶다면 이 방식을 사용하면 됩니다.

중요한 점은 파일 확장자는 여전히 `.md`를 사용한다는 것입니다. 즉, HTML 커스텀을 하더라도 `campaigns/` 아래에 HTML 파일을 직접 올리는 방식이 아니라, `content/campaigns/SB-XX.md` 안에 HTML 본문을 넣는 방식입니다.

`format: html`은 파일 맨 위의 `---` 설정 영역에 넣습니다.

예시:

```markdown
---
id: SB-XX
name: "캠페인 이름"
owner: "작성자 이름"
description: "캠페인 목록에 표시될 짧은 설명"
format: html
---

<h1>캠페인 이름</h1>

<p class="summary">
  여기에 HTML로 캠페인 설명을 작성합니다.
</p>

<h2 id="techniques-used">Techniques Used</h2>
<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th>Domain</th>
        <th>ID</th>
        <th>Name</th>
        <th>Use</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Enterprise</td>
        <td class="id-cell">TXXXX</td>
        <td>Technique Name</td>
        <td>캠페인에서 해당 Technique이 어떻게 사용되었는지 작성합니다.</td>
      </tr>
    </tbody>
  </table>
</div>
```

이 방식도 공통 헤더, 왼쪽 캠페인 메뉴, 공통 CSS가 자동으로 적용됩니다.

즉, HTML 커스텀이 필요한 팀원도 `campaigns/SB-XX/index.html`을 직접 만들지 말고, 아래처럼 작성합니다.

```text
content/campaigns/SB-XX.md
  frontmatter에 format: html 추가
  본문에 원하는 HTML 작성
```

이렇게 해야 캠페인 목록, 왼쪽 메뉴, 로그 링크, 공통 CSS가 유지됩니다.

## Detection Map 작성

Detection Map은 선택 사항입니다. 캠페인별 탐지 매핑 페이지를 따로 만들고 싶을 때 사용합니다.

```text
content/detections/SB-XX.md
```

파일 맨 위에는 캠페인 ID를 연결합니다.

```markdown
---
id: SB-XX-detection
campaign: SB-XX
name: "SB-XX Detection Map"
description: "SB-XX 캠페인에서 수집한 로그와 탐지 포인트를 정리한다."
---
```

빌드 후 아래 URL로 생성됩니다.

```text
/campaigns/SB-XX/detection-map/
```

## HTML 파일을 직접 올리면 안 되나요?

기술적으로는 `campaigns/` 아래에 HTML 파일을 직접 넣을 수 있지만, 이 프로젝트에서는 기본적으로 하지 않습니다.

이유는 아래와 같습니다.

- 다음 빌드 때 덮어써질 수 있습니다.
- 캠페인 목록에 자동으로 추가되지 않습니다.
- 왼쪽 캠페인 메뉴가 자동으로 붙지 않습니다.
- 로그 상세 페이지 연결이 자동으로 관리되지 않습니다.
- 공통 스타일과 구조가 깨질 수 있습니다.
- 나중에 팀 페이지를 통합 관리하기 어렵습니다.

따라서 HTML로 예쁘게 커스텀하고 싶어도 아래 방식으로 작성합니다.

```text
content/campaigns/SB-XX.md
  frontmatter에 format: html 추가
  본문에 HTML 작성
```

정말 예외적으로 독립 HTML을 올려야 한다면 팀원들과 먼저 합의한 뒤 올립니다. 기본 규칙은 `content/` 아래 원본을 수정하는 것입니다.

## 생성된 HTML 폴더를 삭제하면 안 되나요?

삭제하지 않는 것을 권장합니다.

이 레포는 Vercel이 `campaigns/`, `logs/` 아래의 정적 HTML을 그대로 배포하는 구조입니다. 그래서 최종 공개 페이지에는 생성된 HTML 파일이 필요합니다.

다만 사람이 직접 관리해야 하는 파일은 아닙니다. 팀원은 `content/`만 수정하고, `campaigns/`, `logs/`는 빌드 결과물로 둡니다.

## 로컬에서 미리보기

처음 한 번만 의존성을 설치합니다.

```bash
npm install
```

수정 후 HTML을 생성합니다.

```bash
npm run build
```

로컬 서버를 실행합니다.

```bash
python3 -m http.server 8091
```

브라우저에서 아래 주소를 열면 됩니다.

```text
http://127.0.0.1:8091/campaigns/
```

## 수정 후 push 방법

자기 파일을 수정한 뒤 아래 순서로 올리면 됩니다.

```bash
git status
git add content/campaigns/SB-XX.md content/campaign-logs/SB-XX/
git commit -m "Update SB-XX campaign"
git push origin main
```

`main`에 push되면 GitHub Actions가 `campaigns/`, `logs/` HTML을 생성해 자동 커밋하고, Vercel이 그 정적 파일을 배포합니다.

동작 흐름은 아래와 같습니다.

```text
content/*.md 수정
  -> main 브랜치에 push
  -> GitHub Actions에서 npm run build 실행
  -> campaigns/, logs/ HTML 자동 생성
  -> spacebar-bot이 Build site 커밋 생성
  -> Vercel이 정적 HTML 배포
```

push 후 확인할 것:

1. GitHub Actions가 성공했는지 확인합니다.
2. `spacebar-bot`의 `Build site` 커밋이 새로 생겼는지 확인합니다.
3. Vercel 공개 페이지에서 내 캠페인과 로그 링크가 보이는지 확인합니다.

만약 `content/campaign-logs/SB-XX/LOG-ID.md`를 만들었는데 `/campaigns/SB-XX/logs/LOG-ID/`가 404라면, 대부분 `content/campaigns/SB-XX.md`에 `[[LOG-ID]]` 연결을 빠뜨린 경우입니다.

## 공개 페이지 작성 주의사항

이 레포는 public입니다. 포트폴리오로 보여줄 수 있는 수준의 내용만 작성합니다.

- 실제 비밀번호, SSH private key, API token, 세션 값은 절대 올리지 않습니다.
- 실제 개인 정보나 고객 정보는 올리지 않습니다.
- 실제 내부망 IP, 개인 장비 정보, 민감한 경로는 필요하면 가명화합니다.
- PoC 상세 명령어, 공격 자동화 코드, BAS 구현 세부사항은 private 레포나 별도 문서에 둡니다.
- Techniques Used는 “공격 절차서”가 아니라 “캠페인 분석 보고서”처럼 작성합니다.

## 이 캠페인 페이지를 왜 작성하나요?

이 문서는 단순 발표용 페이지가 아닙니다.

각 캠페인 페이지는 아래 작업의 기준 문서가 됩니다.

- 어떤 기업형 피해 환경을 만들었는지 설명
- 어떤 공격 흐름을 재현할지 정리
- 어떤 MITRE ATT&CK Technique을 사용할지 선정
- BAS 공격 모듈을 어떤 단위로 만들지 결정
- ELK에서 어떤 로그와 아티팩트를 봐야 하는지 정리
- DF/IR 보고서와 대응 플레이북 작성 기준으로 활용

즉, 캠페인 페이지는 “우리 환경에서 어떤 공격을 수행하고, 무엇을 탐지하고, 무엇을 대응할 것인가”를 정리하는 기준표입니다.

## 안내

이 프로젝트는 MITRE ATT&CK을 참고한 교육 및 프로젝트 산출물입니다. MITRE와 공식적으로 관련되거나 후원받은 프로젝트가 아닙니다.
