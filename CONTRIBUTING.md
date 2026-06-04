# 캠페인 페이지 수정 가이드

## 기본 원칙

1. 자기 담당 파일만 수정합니다.
2. 원본 파일은 `content/` 아래 Markdown입니다. `content/`가 source of truth입니다.
3. `campaigns/`, `logs/`는 빌드 결과물이므로 직접 수정하지 않습니다.
4. 수정 후 로컬 확인이 필요하면 `npm run build`를 실행합니다.
5. 실제 credential, token, private key, 개인정보는 public 레포에 올리지 않습니다.
6. 캠페인별 로그 상세는 `content/campaign-logs/SB-XX/` 아래 Markdown으로 작성합니다.
7. HTML 커스텀이 필요하면 `campaigns/`에 HTML을 직접 올리지 말고, `content/campaigns/SB-XX.md`에 `format: html`을 사용합니다.

## 원본과 빌드 결과물 구분

| 구분 | 위치 | 직접 수정 여부 |
| --- | --- | --- |
| Campaign 원본 | `content/campaigns/SB-XX.md` | 수정함 |
| Campaign Log 원본 | `content/campaign-logs/SB-XX/LOG-ID.md` | 수정함 |
| Global Log Catalog 원본 | `content/log-catalog/LOG-ID.md` | 수정함 |
| Detection Map 원본 | `content/detections/SB-XX.md` | 필요할 때 수정함 |
| 생성된 Campaign 페이지 | `campaigns/**/index.html` | 수정하지 않음 |
| 생성된 Log 페이지 | `logs/**/index.html` | 수정하지 않음 |

`campaigns/`, `logs/` 아래 HTML 파일은 `npm run build` 또는 GitHub Actions가 만드는 결과물입니다. 직접 수정해도 다음 빌드 때 덮어써질 수 있습니다.

## 담당 파일

| 담당자 | Campaign Page | Campaign Logs |
| --- | --- | --- |
| 임준서 | `content/campaigns/SB-01.md` | `content/campaign-logs/SB-01/` |
| 신가현 | `content/campaigns/SB-03.md` | `content/campaign-logs/SB-03/` |
| 서현재 | `content/campaigns/SB-04.md` | `content/campaign-logs/SB-04/` |
| 강지윤 | `content/campaigns/SB-05.md` | `content/campaign-logs/SB-05/` |
| 오한결 | `content/campaigns/SB-06.md` | `content/campaign-logs/SB-06/` |

## URL 구조

```text
/campaigns/                       # Campaign 목록
/campaigns/SB-01/                 # Campaign Page 1
/campaigns/SB-01/detection-map/   # Campaign Detection Map
/campaigns/SB-01/logs/            # Campaign에서 쓰는 로그 묶음
/campaigns/SB-01/logs/LL-001/     # Campaign 기준 로그 상세
/logs/                            # Log Catalog 목록
/logs/LL-001/                     # 로그 상세 페이지
```

## 캠페인별 로그 상세 페이지

팀원별 로그 상세 페이지는 아래 위치에 만듭니다.

```text
content/campaign-logs/SB-XX/LOG-ID.md
```

예를 들어 SB-XX 담당자가 `WL-001` 로그를 만들면:

```text
content/campaign-logs/SB-XX/WL-001.md
```

새 로그를 만들 때는 `content/campaign-logs/TEMPLATE.md`를 복사해서 사용합니다. 필수 소주제는 아래 7개입니다.

```text
공격 행위 요약
로그 발생 위치
수집 방식
실제 관측 로그 예시
주요 필드
커버하는 Techniques Used
탐지 포인트
```

`주요 필드`는 아래처럼 `예시` 컬럼까지 작성합니다.

```markdown
| 필드 | 의미 | 예시 |
| --- | --- | --- |
| `@timestamp` | 이벤트 발생 시간 | `2026-05-16T19:41:44Z` |
| `source.ip` | 출발지 IP | `10.0.0.10` |
| `user.name` | 행위 계정 | `deploy` |
| `message` | 원본 로그 | `Accepted publickey for deploy` |
```

중요: 로그 Markdown 파일을 만들기만 해서는 공개 페이지에 나오지 않습니다.

캠페인 페이지에서 로그 상세 페이지를 연결하려면 `content/campaigns/SB-XX.md` 안에 로그 ID를 `[[LOG-ID]]` 형식으로 적습니다. 보통 아래 두 위치 중 하나에 넣습니다.

1. `## Campaign Logs` 표
2. `## Techniques Used` 표의 `Primary Logs` 컬럼

예시 1: `## Campaign Logs` 표에 연결

```markdown
## Campaign Logs

| Log ID | Purpose |
| --- | --- |
| [[WL-001]] | Sysmon Event ID 1 기반 프로세스 생성 로그 |
| [[WL-002]] | Sysmon Event ID 3 기반 네트워크 연결 로그 |
| [[WL-003]] | Windows Security Event ID 4769 기반 Kerberos 서비스 티켓 요청 로그 |
```

예시 2: `Techniques Used` 표의 `Primary Logs` 컬럼에 연결

```markdown
| ID | Name | Use | Primary Logs |
| --- | --- | --- | --- |
| T1021.004 | Remote Services: SSH | 공격자가 SSH로 App 서버에 접속했다. | [[LL-001]] |
```

빌드 후 참조된 로그만 아래 URL로 자동 생성됩니다.

```text
/campaigns/SB-XX/logs/
/campaigns/SB-XX/logs/LOG-ID/
```

예를 들어 `content/campaign-logs/SB-03/WL-003.md`를 만들었더라도 `content/campaigns/SB-03.md`에 `[[WL-003]]`가 없으면 `/campaigns/SB-03/logs/WL-003/` 페이지는 생성되지 않습니다.

## Campaign Log와 Global Log Catalog 차이

| 구분 | 위치 | 사용 기준 |
| --- | --- | --- |
| Campaign Log | `content/campaign-logs/SB-XX/LOG-ID.md` | 특정 캠페인에서 실제로 사용한 로그 |
| Global Log Catalog | `content/log-catalog/LOG-ID.md` | 여러 캠페인에서 공통으로 참고할 수 있는 로그 사전 |

대부분의 팀원 작업은 Campaign Log입니다. 헷갈리면 먼저 `content/campaign-logs/SB-XX/` 아래에 작성합니다.

## Markdown으로 작성하는 경우

파일 맨 위는 아래 형식을 유지합니다.

```markdown
---
id: SB-XX
name: "캠페인 이름"
owner: "작성자 이름"
description: "캠페인 목록에 표시될 짧은 설명"
---
```

그 아래는 Markdown으로 작성합니다.

## HTML로 작성하는 경우

HTML을 직접 넣고 싶으면 파일 맨 위 설정 영역에 `format: html`을 추가합니다.

이때도 파일은 `content/campaigns/SB-XX.md`에 둡니다. `campaigns/` 아래 HTML 파일을 직접 만들거나 수정하는 방식이 아닙니다.

```markdown
---
id: SB-XX
name: "캠페인 이름"
owner: "작성자 이름"
description: "캠페인 목록에 표시될 짧은 설명"
format: html
---
```

그리고 그 아래에 HTML 본문을 작성합니다.

```html
<h1>캠페인 이름</h1>
<p class="summary">캠페인 설명</p>
```

`format: html`을 넣으면 Markdown 변환을 하지 않고, 작성한 HTML 본문을 그대로 공통 레이아웃 안에 넣습니다.

HTML로 커스텀하고 싶어도 `campaigns/SB-XX/index.html`을 직접 수정하지 않습니다. 아래 방식으로 작성합니다.

```text
content/campaigns/SB-XX.md
  frontmatter에 format: html 추가
  본문에 HTML 작성
```

이렇게 해야 캠페인 목록, 왼쪽 메뉴, 로그 링크, 공통 CSS, Vercel 배포 구조가 유지됩니다.

## Detection Map 작성

캠페인별 탐지 매핑 페이지가 필요하면 아래 파일을 작성합니다.

```text
content/detections/SB-XX.md
```

파일 맨 위에는 연결할 캠페인 ID를 적습니다.

```markdown
---
id: SB-XX-detection
campaign: SB-XX
name: "SB-XX Detection Map"
description: "SB-XX 캠페인에서 수집한 로그와 탐지 포인트를 정리한다."
---
```

빌드 후 `/campaigns/SB-XX/detection-map/` 페이지로 생성됩니다.

## HTML 파일을 직접 올리는 경우

기술적으로는 `campaigns/` 아래에 HTML 파일을 직접 넣을 수 있지만, 이 프로젝트에서는 기본적으로 하지 않습니다.

직접 올린 HTML은 다음 문제가 생길 수 있습니다.

- 다음 빌드 때 덮어써질 수 있습니다.
- 캠페인 목록에 자동으로 추가되지 않습니다.
- 왼쪽 캠페인 메뉴가 자동으로 붙지 않습니다.
- 로그 상세 페이지 연결이 자동으로 관리되지 않습니다.
- 공통 CSS와 화면 구조가 깨질 수 있습니다.

HTML 커스텀이 필요하면 독립 HTML 파일을 올리지 말고, `content/campaigns/SB-XX.md`에 `format: html`을 넣고 본문을 HTML로 작성합니다.

## 생성된 HTML 폴더를 삭제하면 안 되나요?

삭제하지 않습니다.

Vercel은 `campaigns/`, `logs/` 아래 생성된 정적 HTML을 배포합니다. 그래서 폴더 자체는 필요합니다. 다만 팀원이 직접 고치는 대상이 아닐 뿐입니다.

## 수정 후 확인

```bash
npm run build
python3 -m http.server 8091
```

브라우저에서 확인:

```text
http://127.0.0.1:8091/campaigns/
```

## push 방법

```bash
git add content/campaigns/SB-XX.md
git add content/campaign-logs/SB-XX/
git commit -m "Update SB-XX campaign"
git push origin main
```

push 후 GitHub Actions가 HTML을 생성해 자동 커밋하고, Vercel이 생성된 정적 파일을 배포합니다.

push 후 확인:

- [ ] GitHub Actions가 성공했는가?
- [ ] `spacebar-bot`의 `Build site` 커밋이 새로 생겼는가?
- [ ] 공개 페이지에서 내 캠페인 페이지가 열리는가?
- [ ] 새 로그를 만들었다면 `/campaigns/SB-XX/logs/LOG-ID/`가 열리는가?

새 로그 URL이 404라면 먼저 `content/campaigns/SB-XX.md`에 `[[LOG-ID]]` 참조가 있는지 확인합니다.

## 작성 전 체크리스트

- [ ] 내 담당 `content/campaigns/SB-XX.md` 파일을 수정했는가?
- [ ] 로그 상세가 있다면 `content/campaign-logs/SB-XX/LOG-ID.md`에 작성했는가?
- [ ] `content/campaigns/SB-XX.md`에서 `[[LOG-ID]]` 형식으로 로그를 연결했는가?
- [ ] `format: html`이 필요한 경우 frontmatter에 넣었는가?
- [ ] `campaigns/`, `logs/` 아래 생성된 HTML을 직접 수정하지 않았는가?
- [ ] 로컬 확인이 필요하면 `npm run build`를 실행했는가?
- [ ] 공개하면 안 되는 비밀번호, 토큰, SSH key, 개인정보가 없는가?
- [ ] Techniques Used가 MITRE ATT&CK 형식에 맞게 작성되었는가?
- [ ] 공격 실습 절차서가 아니라 캠페인 분석 페이지처럼 작성되었는가?
- [ ] 로컬 페이지에서 표와 링크가 깨지지 않는지 확인했는가?
