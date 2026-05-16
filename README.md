# Spacebar MITRE ATT&CK Campaigns

Spacebar 팀의 MITRE ATT&CK Campaign 형식 정리 페이지입니다.

각 팀원은 자신이 모델링한 기업형 피해 환경을 바탕으로 공격 흐름을 분석하고, 해당 행위를 MITRE ATT&CK Technique에 매핑하여 캠페인 페이지로 작성합니다. 이 페이지들은 이후 BAS 공격 모듈 설계, ELK 탐지 포인트 정리, 침해사고 대응 플레이북 작성에 활용됩니다.

공개 페이지:

```text
https://spacebar-mitre-attack-campaigns.vercel.app/campaigns/
```

## 폴더 구조

```text
content/
  campaigns/            # Campaign Page 1 원본
    SB-01.md
    SB-02.md
  detections/           # Campaign Page 2 / Detection Map 원본
    SB-01.md
  log-catalog/          # 로그 분류 원본
    LL-001.md
  campaign-logs/        # 캠페인별 로그 상세 원본
    SB-01/
      LL-001.md
      DBL-001.md
    TEMPLATE.md

campaigns/              # 빌드 결과물
  index.html
  SB-01/
    index.html
    detection-map/
      index.html
    logs/
      index.html
      LL-001/
        index.html

logs/                   # 빌드 결과물
  index.html
  LL-001/
    index.html

assets/                 # 공통 스타일/이미지
tools/                  # md/html 원본을 공개 HTML로 변환하는 스크립트
```

중요:

- 팀원은 기본적으로 `content/` 아래 원본 Markdown만 수정합니다.
- `campaigns/`, `logs/`는 GitHub Actions가 생성하는 빌드 결과물이므로 직접 수정하지 않습니다.
- `main` 브랜치에 push하면 GitHub Actions가 HTML을 생성해 커밋하고, Vercel은 생성된 정적 파일을 배포합니다.
- 팀원별 로그 상세 페이지는 `content/campaign-logs/SB-XX/LOG-ID.md`에 작성합니다.

## 공개 URL 구조

```text
/campaigns/                       # Campaign 목록
/campaigns/SB-01/                 # SB-01 Campaign Page 1
/campaigns/SB-01/detection-map/   # SB-01 Campaign Page 2
/campaigns/SB-01/logs/            # SB-01에서 쓰는 로그 묶음
/campaigns/SB-01/logs/LL-001/     # SB-01 기준 로그 상세
/logs/                            # Log Catalog 목록
/logs/LL-001/                     # 로그 상세 페이지
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

캠페인 페이지의 Techniques Used 표에서 로그를 연결하려면 `Primary Logs` 컬럼에 로그 ID를 `[[LOG-ID]]` 형식으로 적습니다.

```markdown
| ID | Name | Use | Primary Logs |
| --- | --- | --- | --- |
| T1021.004 | Remote Services: SSH | Jenkins에서 확보한 배포 credential로 App 서버에 SSH 접속했다. | [[LL-001]] |
```

빌드하면 자동으로 아래 페이지가 생성되고 링크됩니다.

```text
/campaigns/SB-XX/logs/
/campaigns/SB-XX/logs/LOG-ID/
```

## 팀원별 수정 파일

| ID | 담당자 | Campaign Page 1 | Detection Map |
| --- | --- | --- | --- |
| SB-01 | 임준서 | `content/campaigns/SB-01.md` | `content/detections/SB-01.md` |
| SB-02 | 김정현 | `content/campaigns/SB-02.md` | 필요 시 추가 |
| SB-03 | 신가현 | `content/campaigns/SB-03.md` | 필요 시 추가 |
| SB-04 | 서현재 | `content/campaigns/SB-04.md` | 필요 시 추가 |
| SB-05 | 강지윤 | `content/campaigns/SB-05.md` | 필요 시 추가 |
| SB-06 | 오한결 | `content/campaigns/SB-06.md` | `content/detections/SB-06.md` |

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

## 작성 방식 2: HTML 본문으로 작성하기

팀원이 이미 HTML로 캠페인 페이지를 만들어왔거나, 복잡한 표와 블록을 직접 제어하고 싶다면 이 방식을 사용하면 됩니다.

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

## 작성 방식 3: 완전 독립 HTML 파일 올리기

직접 만든 HTML 파일을 그대로 올리고 싶다면 `campaigns/파일명.html`에 넣을 수도 있습니다.

다만 이 방식은 권장하지 않습니다.

- 캠페인 목록에 자동으로 추가되지 않습니다.
- 왼쪽 캠페인 메뉴가 자동으로 붙지 않습니다.
- 공통 스타일과 구조가 깨질 수 있습니다.
- 나중에 팀 페이지를 통합 관리하기 어렵습니다.

따라서 가능하면 `content/campaigns/SB-XX.md` 안에서 Markdown 또는 `format: html` 방식으로 작성해 주세요.

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
