---
id: WF-RECON-001
name: "외부 노출 서비스 및 취약 표면 정찰"
description: "공개 노출된 웹/API/CI-CD/Ingress 서비스의 배너, URL, 포트, 취약 버전 식별 정황을 분석한다."
techniques: "T1595, T1595.002, T1592, T1590, T1593"
---

# WF-RECON-001 외부 노출 서비스 및 취약 표면 정찰

공개 인터넷 또는 외부 접근 경로에서 서비스 배너, HTTP 응답, URL 구조, 포트, 버전 정보, 관리 UI 노출 여부를 수집한 정황이 보였을 때 사용하는 행위 기반 IR Workflow다.
분석자는 이 문서로 정찰 행위의 의미, 우선 확인 로그, 정상 점검과 공격 준비 행위의 구분 기준, AI 분석 보조자에게 줄 프롬프트를 빠르게 확인한다.

| Field | Value |
| --- | --- |
| 분석 대상 행위 | 외부 노출 서비스 식별, 배너/버전 수집, URL/API 구조 탐색, 취약 표면 확인 |
| 관련 캠페인 | SB-04, SB-06 |
| 분석 결과물 | 정찰 주체, 대상 서비스, 수집된 표면 정보, 취약점 악용 가능성, 후속 Pivot |

## 1. 행위 정의

공격자가 초기 침투 전에 외부에서 접근 가능한 서비스를 탐색하고, 응답 헤더, 배너, URL 경로, API 포트, 관리 UI, 취약 버전 여부를 확인하는 행위다.
단순 접속 1건보다 같은 출발지에서 짧은 시간 동안 여러 경로와 포트를 반복 요청했는지, 취약점 PoC 경로 또는 관리 기능 확인 요청이 이어졌는지를 함께 봐야 한다.

이 Workflow는 외부 노출 표면을 대상으로 한다.
내부망 진입 이후 여러 내부 IP와 포트를 훑는 행위는 [WF-SCAN-001](/workflows/WF-SCAN-001/)에서 분석한다.

## 2. 관련 Technique

| Technique | Name | 확인 관점 |
| --- | --- | --- |
| T1595 | Active Scanning | 외부 노출 서비스에 대한 반복 요청, 포트 확인, HTTP 스캔 여부 확인 |
| T1595.002 | Vulnerability Scanning | 알려진 취약점 경로, 버전 확인, PoC 요청 패턴 확인 |
| T1592 | Gather Victim Host Information | 서버 배너, 프레임워크, 런타임, 운영 환경 정보 수집 여부 확인 |
| T1590 | Gather Victim Network Information | 공개 IP, 포트, reverse proxy, ingress, ALB 등 네트워크 진입점 식별 여부 확인 |
| T1593 | Search Open Websites/Domains | 공개 웹 경로, URL 구조, 문서화된 API, 관리 페이지 탐색 여부 확인 |

## 3. 먼저 확인할 로그

> 본 표의 핵심 필드는 원본 로그 필드명이 아니라, ELK/ECS 등 SIEM에서 정규화했을 때 우선 확인할 분석 필드 기준이다. 실제 원본 필드명은 Nginx, ALB, WAF, CDN, EDR 제품에 따라 다를 수 있다.

| 환경 | 대표 로그 | 핵심 필드 |
| --- | --- | --- |
| Web / Reverse Proxy | Nginx/Apache 등 웹 서버 access log, reverse proxy access log | `@timestamp`, `source.ip`, `http.request.method`, `url.path`, `http.response.status_code`, `user_agent.original` |
| Cloud / Edge | ALB access log, WAF log, CDN log | `source.ip` 또는 `client.ip`, `url.original`, `url.path`, `http.request.method`, `http.response.status_code`, `user_agent.original`, `target_group_arn`, `event.action`, `rule.id`, `terminatingRuleId` |
| Application | App access log, framework error log | `route` 또는 `url.path`, `handler`, `error.type`, `error.message`, `stack_trace`, `trace.id`, `response.header.*` |
| Firewall / EDR | 외부 접속 허용/차단, 스캔 탐지 | `source.ip`, `destination.ip`, `destination.port`, `network.transport`, `event.action`, `event.outcome`, `rule.name` |

## 4. 빠른 KQL

이 쿼리는 차단용 탐지 룰이 아니라, 정찰 후보를 넓게 찾기 위한 헌팅 쿼리다.  
실제 판단은 같은 `source.ip`의 요청 수, 고유 `url.path` 수, 상태 코드 분포, User-Agent, 요청 간격, 승인된 스캐너 여부를 함께 확인한다.

### 외부 HTTP 스캔 후보

```text
http.request.method: ("GET" or "HEAD" or "OPTIONS") and
url.path: ("/" or "/api*" or "/admin*" or "/login*" or "/version*" or "/debug*" or "/.env" or "/config*") and
source.ip: *
```

### 취약점/관리 경로 탐색 후보

```text
url.path: ("*/cli*" or "*/script*" or "*/actuator*" or "*/debug*" or "*/api/v1*" or "*/validate*" or "*/upload*" or "*/config*" or "*/jmx-console*" or "*/invoker*")
```

### 비정상 User-Agent 또는 자동화 도구 후보

```text
user_agent.original: ("*curl*" or "*wget*" or "*python-requests*" or "*Go-http-client*" or "*nmap*" or "*masscan*" or "*sqlmap*" or "*nikto*" or "*dirbuster*" or "*ffuf*" or "*gobuster*")
```

### 짧은 시간 다수 경로 요청 후보

```text
source.ip: * and
http.response.status_code: (401 or 403 or 404 or 500) and
url.path: *
```

### 쿼리 결과 확인 지표

| 기준 | 의심도 | 해석 |
| --- | --- | --- |
| 같은 `source.ip`가 5분 내 고유 `url.path` 20개 이상 요청 | 높음 | 자동화된 경로 탐색 또는 디렉터리 브루트포싱 가능성이 높다. |
| 401/403/404/500 비율이 높고 정상 페이지 접근이 적음 | 높음 | 존재하지 않거나 제한된 경로를 반복 확인하는 스캔성 요청일 수 있다. |
| `/.env`, `/debug`, `/config`, `/actuator`, `/admin` 접근 포함 | 높음 | 민감 파일, 디버그 경로, 관리 페이지 탐색 가능성이 높다. |
| User-Agent가 `curl`, `python-requests`, `nmap`, `sqlmap`, `ffuf`, `gobuster` 등 | 높음 | 브라우저가 아닌 자동화 도구 또는 공격 도구 기반 요청일 수 있다. |
| 승인된 취약점 스캐너, 모니터링, 검색엔진 크롤러와 일치 | 낮음 또는 정상 후보 | 승인된 점검 활동일 수 있으므로 스캐너 자산 목록과 점검 일정으로 교차 확인한다. |


## 5. 분석자가 할 일

1. 의심 `source.ip`, `user_agent.original`, 대상 host, 시간 범위를 고정한다.
2. 같은 출발지에서 접근한 URL 경로 수, 대상 host 수, 대상 포트 수, 요청 간격을 집계한다.
3. 단순 방문인지, 배너/버전/관리 UI/취약점 경로를 확인한 것인지 구분한다.
4. 승인된 취약점 점검, ASM, WAF 헬스체크, 모니터링, 검색엔진 크롤러 가능성을 정상 baseline과 비교한다.
5. 정찰 직후 인증 시도, 취약점 악용 요청, 파일 접근, credential 접근, 원격 명령 실행이 이어졌는지 Pivot한다.
6. 확인된 정찰 지표와 후속 행위를 타임라인으로 정리하고, 관련 ATT&CK Technique에 매핑한다.

## 6. 판단 기준

본 판단 기준은 MITRE ATT&CK 기법의 Detection Strategy/Data Sources 관점과 CISA Incident Response Playbook의 Detection & Analysis 절차를 함께 적용한다.  
단일 이벤트만으로 확정하지 않고, 로그 보존, 이벤트 상관분석, 타임라인 작성, 정상 활동과의 deconfliction, ATT&CK TTP 매핑을 통해 판단한다.

| 구분 | 확인 기준 | 근거 |
| --- | --- | --- |
| 의심 | 같은 `source.ip`가 짧은 시간 동안 다수 경로, 다수 host, 다수 포트로 반복 요청 | MITRE ATT&CK `T1595 Active Scanning`, CISA 이벤트 상관분석/타임라인 작성 |
| 의심 | 외부 노출된 Langflow API, React/Next.js 프론트엔드, K8s Ingress, `.env`, `/config`, `/debug`, `/actuator`, `/admin` 등 민감 경로 확인 | MITRE ATT&CK `T1595.002 Vulnerability Scanning`, `T1592 Gather Victim Host Information` |
| 의심 | 서비스 버전, 응답 헤더, 에러 메시지, framework fingerprint를 유도하는 요청 패턴 | MITRE ATT&CK `T1592 Gather Victim Host Information`, `T1590 Gather Victim Network Information` |
| 의심 | 정찰 직후 RCE, 인증 우회, credential 접근, 원격 접속, 데이터 접근 등 후속 침투 행위가 이어짐 | CISA 조사 범위 갱신 및 ATT&CK TTP 분석 |
| 정상 가능성 | 승인된 취약점 점검, 외부 공격표면 관리(ASM), 모니터링, WAF 점검, 검색엔진 크롤러와 일치 | CISA authorized activity deconfliction, 조직 baseline 비교 |

## 7. LLM Prompt Template

```text
너는 ELK, Splunk 등 SIEM에 연결된 침해사고 분석 보조자다.
다음 조건으로 "외부 노출 서비스 및 취약 표면 정찰" 의심 정황을 조사하라.
반드시 조회한 로그 또는 제공된 로그 근거를 기반으로 판단하고, 확인되지 않은 내용은 추정이라고 표시하라.
정상 점검, 배포, 보안 도구 실행 가능성을 함께 확인해 오탐과 실제 침투 가능성을 구분하라.
분석은 CISA Incident Response Playbook의 Detection & Analysis 절차에 맞춰 로그 보존, 이벤트 상관분석, 타임라인 작성, 정상 baseline 비교, ATT&CK TTP 매핑 관점으로 수행하라.

입력:
- 시간 범위:
- 의심 source IP 또는 user agent:
- 대상 도메인/서비스:
- 관측된 URL 경로 또는 포트:
- 관측된 단서:

요청:
1. 관련 외부 접근 로그를 조회하라.
   - Web/reverse proxy access log
   - ALB/WAF/CDN log
   - Application access/error log
   - 외부 노출된 경우에 한해 Jenkins access/audit log 또는 Kubernetes ingress log
   - Firewall 또는 EDR network log
2. 같은 source IP 또는 user agent가 접근한 대상 host, URL path, port, status code 분포와 요청 간격을 요약하라.
3. 배너/버전/관리 UI/취약점 경로 확인 정황을 MITRE ATT&CK T1595, T1595.002, T1592, T1590, T1593 관점으로 분류하라.
4. 승인된 취약점 점검, ASM, WAF 헬스체크, 모니터링, 검색엔진 크롤러 가능성을 정상 baseline과 비교해 구분하라.
5. 정찰 이후 취약점 악용, 인증 시도, credential 접근, 원격 명령 실행, 데이터 접근으로 이어진 로그가 있는지 Pivot하라.
6. 확인된 사실을 시간순 타임라인으로 정리하고, 조사 범위를 갱신해야 할 대상 host, 계정, 서비스, 로그 소스를 제안하라.
7. 증거 보존과 초동 대응 조치를 작성하라.

출력 형식:
- 관측된 사실
- 타임라인
- 정찰 주체 후보와 정상 가능성
- 대상 서비스와 노출 표면
- ATT&CK 매핑
- 의심 근거와 한계
- 추가 Pivot
- 보존해야 할 증거
- 대응 조치
```

## 8. 대응 요약

`LLM Prompt Template`을 통해 도출된 분석 결과를 바탕으로 분석자가 수행해야 할 증거 보존, 정상 여부 검증, 확장 검색, 예방 조치, 후속 Workflow Pivot을 정리한 실행 항목이다.

- 원본 access log, WAF/ALB/CDN 로그, 애플리케이션 access/error 로그, Firewall/EDR 네트워크 로그를 보존한다.
- 의심 `source.ip`, `user_agent.original`, 대상 host, URL 경로, 상태 코드, 요청 시각을 고정하고 타임라인으로 정리한다.
- 승인된 취약점 점검, ASM, WAF 헬스체크, 모니터링, 검색엔진 크롤러와 일치하는지 정상 baseline으로 먼저 교차 확인한다.
- 승인된 활동이 아니라면 동일 `source.ip`, 동일 `user_agent.original`, 동일 URL 패턴으로 전체 로그를 확장 검색한다.
- 정찰된 서비스의 외부 노출 범위, 버전, 관리 UI, 민감 경로, 불필요한 응답 헤더/에러 정보 노출 여부를 점검한다.
- 후속 침투 정황이 없으면 WAF 룰, rate limit, 접근 제어, 노출 정보 최소화 등 예방 조치를 우선 검토한다.
- 정찰 이후 RCE, 인증 우회, credential 접근, 원격 명령 실행, 데이터 접근이 확인되면 `WF-INITIAL-001`, `WF-CRED-001`, `WF-REMOTE-001`, `WF-DATA-001`로 Pivot한다.

## 9. 근거자료

- CISA, [Cybersecurity Incident & Vulnerability Response Playbooks](C:/Users/iregr/Downloads/Federal_Government_Cybersecurity_Incident_and_Vulnerability_Response_Playbooks_508C.pdf) - Detection & Analysis 단계의 로그 보존, 이벤트 상관분석, 타임라인 작성, 정상 활동 deconfliction 기준을 판단 근거로 사용한다.
- MITRE ATT&CK, [Detection Strategies](https://attack.mitre.org/detectionstrategies/) - 기법별 탐지 전략과 데이터 소스 관점을 판단 기준에 반영한다.
- MITRE ATT&CK, [T1595](https://attack.mitre.org/techniques/T1595/)
- MITRE ATT&CK, [T1595.002](https://attack.mitre.org/techniques/T1595/002/)
- MITRE ATT&CK, [T1592](https://attack.mitre.org/techniques/T1592/)
- MITRE ATT&CK, [T1590](https://attack.mitre.org/techniques/T1590/)
- MITRE ATT&CK, [T1593](https://attack.mitre.org/techniques/T1593/)
