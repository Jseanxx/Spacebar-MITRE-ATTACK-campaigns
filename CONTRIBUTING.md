# 캠페인 페이지 수정 가이드

## 기본 원칙

1. 자기 담당 파일만 수정합니다.
2. 원본 파일은 `content/` 아래 Markdown입니다.
3. `campaigns/`, `logs/`는 빌드 결과물이므로 직접 수정하지 않습니다.
4. 수정 후 로컬 확인이 필요하면 `npm run build`를 실행합니다.
5. 실제 credential, token, private key, 개인정보는 public 레포에 올리지 않습니다.
6. 캠페인별 로그 상세는 `content/campaign-logs/SB-XX/` 아래 Markdown으로 작성합니다.

## 담당 파일

| 담당자 | Campaign Page 1 | Detection Map |
| --- | --- | --- |
| 임준서 | `content/campaigns/SB-01.md` | `content/detections/SB-01.md` |
| 김정현 | `content/campaigns/SB-02.md` | 필요 시 추가 |
| 신가현 | `content/campaigns/SB-03.md` | 필요 시 추가 |
| 서현재 | `content/campaigns/SB-04.md` | 필요 시 추가 |
| 강지윤 | `content/campaigns/SB-05.md` | 필요 시 추가 |
| 오한결 | `content/campaigns/SB-06.md` | `content/detections/SB-06.md` |

## URL 구조

```text
/campaigns/                       # Campaign 목록
/campaigns/SB-01/                 # Campaign Page 1
/campaigns/SB-01/detection-map/   # Campaign Page 2
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

예를 들어 SB-02 담당자가 `WL-001` 로그를 만들면:

```text
content/campaign-logs/SB-02/WL-001.md
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

캠페인 페이지의 Techniques Used 표에서 로그 상세 페이지를 연결하려면 `Primary Logs` 컬럼에 로그 ID를 `[[LOG-ID]]` 형식으로 적습니다.

```markdown
| ID | Name | Use | Primary Logs |
| --- | --- | --- | --- |
| T1021.004 | Remote Services: SSH | 공격자가 SSH로 App 서버에 접속했다. | [[LL-001]] |
```

빌드 후 아래 URL이 자동 생성됩니다.

```text
/campaigns/SB-XX/logs/
/campaigns/SB-XX/logs/LOG-ID/
```

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

## 작성 전 체크리스트

- [ ] 내 담당 `content/campaigns/SB-XX.md` 파일을 수정했는가?
- [ ] 로그 상세가 있다면 `content/campaign-logs/SB-XX/LOG-ID.md`에 작성했는가?
- [ ] Primary Logs 컬럼에 `[[LOG-ID]]` 형식으로 연결했는가?
- [ ] `format: html`이 필요한 경우 frontmatter에 넣었는가?
- [ ] 로컬 확인이 필요하면 `npm run build`를 실행했는가?
- [ ] 공개하면 안 되는 비밀번호, 토큰, SSH key, 개인정보가 없는가?
- [ ] Techniques Used가 MITRE ATT&CK 형식에 맞게 작성되었는가?
- [ ] 공격 실습 절차서가 아니라 캠페인 분석 페이지처럼 작성되었는가?
- [ ] 로컬 페이지에서 표와 링크가 깨지지 않는지 확인했는가?
