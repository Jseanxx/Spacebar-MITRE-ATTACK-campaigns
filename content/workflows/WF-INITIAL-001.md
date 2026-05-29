---
id: WF-INITIAL-001
name: "취약 서비스 악용 기반 초기 침투"
description: "외부 노출 서비스의 취약점, 비인증 API, 웹 요청 기반 RCE를 통해 초기 실행 권한을 얻은 정황을 분석한다."
techniques: "T1190, T1059, T1203, T1105"
---

# WF-INITIAL-001 취약 서비스 악용 기반 초기 침투

공개 서비스에 대한 취약점 악용 요청 이후 애플리케이션, 컨테이너, 서버 내부에서 비정상 명령 실행이 관측됐을 때 사용하는 행위 기반 IR Workflow다.
정찰 로그와 실행 로그를 이어서 보며, 단순 스캐닝인지 실제 침투로 전환됐는지 판단한다.

| Field | Value |
| --- | --- |
| 분석 대상 행위 | RCE, 비인증 API 악용, 취약 웹/애플리케이션 서비스 악용 |
| 관련 캠페인 | SB-04, SB-06, SB-07, 외부 서비스 침투 캠페인 공통 |
| 분석 결과물 | 악용 요청, 최초 실행 위치, 실행 계정, 후속 다운로드/명령 실행 여부 |

## 1. 행위 정의

공격자가 Jenkins, Langflow, JBoss, 프론트엔드 파드 같은 외부 노출 서비스를 통해 서버 측 코드 실행 또는 명령 실행 권한을 확보하는 행위다.
HTTP 요청만 보지 않고 요청 직후 생성된 프로세스, 애플리케이션 에러, 다운로드, outbound 연결을 함께 확인해야 한다.

## 2. 관련 Technique

| Technique | Name | 확인 관점 |
| --- | --- | --- |
| T1190 | Exploit Public-Facing Application | 외부 노출 서비스 취약점 악용 여부 확인 |
| T1059 | Command and Scripting Interpreter | 취약점 악용 이후 쉘, Python, PowerShell 실행 여부 확인 |
| T1203 | Exploitation for Client Execution | 취약 입력이 런타임 실행으로 이어졌는지 확인 |
| T1105 | Ingress Tool Transfer | 초기 침투 직후 후속 도구 다운로드 여부 확인 |

## 3. 먼저 확인할 로그

| 환경 | 대표 로그 | 핵심 필드 |
| --- | --- | --- |
| Web / App | access log, error log, framework log | `source.ip`, `url.path`, `http.request.method`, `status`, `exception`, `trace_id` |
| Cloud / Edge | ALB, WAF, CDN log | `client_ip`, `request_url`, `target_status_code`, `waf.action`, `rule_id` |
| Linux / Container | auditd, syslog, container stdout/stderr | `process.name`, `process.command_line`, `user.name`, `container.id` |
| Windows | Sysmon 1/3, PowerShell 4104 | `process.command_line`, `parent.process.name`, `destination.ip`, `ScriptBlockText` |
| EDR | process/network alert | process tree, command line, parent process, network destination |

## 4. 빠른 KQL

### 취약 API/RCE 요청 후보

```text
url.path: ("*/validate*" or "*/api*" or "*/upload*" or "*/debug*" or "*/actuator*" or "*/invoker*" or "*/jmx-console*")
```

### 웹 프로세스 하위 명령 실행

```text
process.parent.name: ("nginx" or "apache2" or "java" or "node" or "python") and
process.name: ("sh" or "bash" or "cmd.exe" or "powershell.exe" or "python" or "curl" or "wget")
```

### 침투 직후 outbound 연결

```text
event.category: "network" and process.name: ("curl" or "wget" or "python" or "powershell.exe" or "java")
```

## 5. 분석자가 할 일

1. 의심 HTTP 요청의 source IP, URL, request body 후보, status code를 고정한다.
2. 같은 시간대 애플리케이션 에러와 프로세스 생성 로그를 확인한다.
3. 웹/앱 프로세스 하위에 쉘, 스크립트, 다운로드 도구가 실행됐는지 본다.
4. 취약점 악용 이후 credential 접근, 내부 정찰, 도구 반입으로 이어졌는지 Pivot한다.
5. 영향 서비스의 버전, 패치 상태, 노출 범위를 확인한다.

## 6. 판단 기준

| 구분 | 확인 기준 |
| --- | --- |
| 의심 | 취약 경로 요청 직후 웹/앱 프로세스 하위 명령 실행 |
| 의심 | 정상 기능과 무관한 `curl`, `wget`, `sh`, `python`, `powershell` 실행 |
| 의심 | 에러 로그에 역직렬화, 템플릿, 코드 검증, JBoss/Jenkins 취약 경로 흔적 |
| 정상 가능성 | 승인된 보안 점검, 헬스체크, QA 테스트와 일치 |

## 7. LLM Prompt Template

```text
너는 SIEM에 연결된 침해사고 분석 보조자다.
다음 조건으로 "취약 서비스 악용 기반 초기 침투" 정황을 조사하라.
반드시 조회한 로그 근거를 기반으로 판단하고, 확인되지 않은 내용은 추정이라고 표시하라.

입력:
- 시간 범위:
- 대상 서비스/도메인:
- 의심 source IP:
- 관측된 URL/취약점:
- 관측된 단서:

요청:
1. Web/ALB/WAF/App/EDR 로그를 조회하라.
2. 악용 요청과 직후 프로세스/네트워크 이벤트를 시간순으로 연결하라.
3. 최초 실행 계정, 프로세스, 컨테이너/호스트를 요약하라.
4. 정상 점검 가능성과 침투 가능성을 구분하라.
5. 후속 Pivot과 초동 대응 조치를 작성하라.

출력 형식:
- 관측된 사실
- 타임라인
- 최초 침투 후보
- 의심 근거
- 추가 Pivot
- 대응 조치
```

## 8. 대응 요약

- 원본 HTTP 요청 로그, 애플리케이션 로그, 프로세스 트리를 보존한다.
- 취약 서비스의 외부 노출을 임시 제한하고 WAF/접근 제어를 강화한다.
- 동일 source IP와 동일 URL 패턴으로 과거 로그를 확장 검색한다.
- 침투 성공 가능성이 있으면 호스트/파드 격리, 토큰 회전, 취약 버전 패치를 수행한다.
