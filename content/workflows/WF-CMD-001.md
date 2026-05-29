---
id: WF-CMD-001
name: "스크립트/인터프리터 기반 명령 실행"
description: "PowerShell, Python, shell, curl/wget, kubectl exec 등 스크립트와 인터프리터를 이용한 명령 실행 정황을 분석한다."
techniques: "T1059, T1059.001, T1059.004, T1059.006, T1609, T1105"
---

# WF-CMD-001 스크립트/인터프리터 기반 명령 실행

PowerShell, Python, shell, curl/wget, kubectl exec 같은 인터프리터와 관리 도구가 공격 흐름에 사용된 정황을 분석하는 Workflow다.
실행 명령 자체뿐 아니라 부모 프로세스, 실행 계정, 다운로드/네트워크 연결, 후속 파일 생성까지 함께 본다.

| Field | Value |
| --- | --- |
| 분석 대상 행위 | PowerShell/Python/shell 실행, kubectl exec, 다운로드 도구 사용, 명령 전달 |
| 관련 캠페인 | SB-03, SB-04, SB-05, SB-06, SB-07 |
| 분석 결과물 | 실행 주체, 명령 내용, 부모 프로세스, 정상 관리 여부, 후속 행위 |

## 1. 행위 정의

공격자가 원격 접속, 취약점 악용, 컨테이너 exec 이후 스크립트나 인터프리터를 사용해 정찰, 도구 반입, credential 접근, 유출 준비를 수행하는 행위다.
관리 도구와 공격 도구의 경계가 흐리므로 명령 내용과 실행 맥락을 함께 확인해야 한다.

## 2. 관련 Technique

| Technique | Name | 확인 관점 |
| --- | --- | --- |
| T1059 | Command and Scripting Interpreter | 명령줄 기반 행위 전반 확인 |
| T1059.001 | PowerShell | PowerShell ScriptBlock, encoded command, web request 확인 |
| T1059.004 | Unix Shell | bash/sh 기반 명령 실행 확인 |
| T1059.006 | Python | Python 코드/HTTP client/시스템 명령 호출 확인 |
| T1609 | Container and Resource Discovery | Kubernetes exec를 통한 컨테이너 내부 명령 확인 |
| T1105 | Ingress Tool Transfer | curl/wget/PowerShell 다운로드 확인 |

## 3. 먼저 확인할 로그

| 환경 | 대표 로그 | 핵심 필드 |
| --- | --- | --- |
| Windows | PowerShell 4104, Sysmon 1/3, Security 4688 | `ScriptBlockText`, `process.command_line`, `parent.process.name` |
| Linux | auditd, syslog, process accounting 후보 | command, user, cwd, parent process |
| Kubernetes | API audit log, container runtime log | verb, pod, namespace, command, user |
| EDR | process tree, network telemetry | process, parent, command line, destination |
| Proxy / Network | HTTP download, outbound connection | source, destination, URL, user agent |

## 4. 빠른 KQL

### 의심 인터프리터 실행

```text
process.name: ("powershell.exe" or "pwsh.exe" or "python" or "python3" or "bash" or "sh" or "cmd.exe")
```

### 다운로드/명령 전달 후보

```text
process.command_line: ("*Invoke-WebRequest*" or "*curl *" or "*wget *" or "*DownloadString*" or "*python -c*")
```

### Kubernetes exec 후보

```text
kubernetes.audit.verb: "create" and kubernetes.audit.objectRef.subresource: "exec"
```

## 5. 분석자가 할 일

1. 실행 계정, 호스트/파드, 부모 프로세스, 명령줄을 고정한다.
2. 명령이 정찰, 다운로드, credential 접근, 유출 준비 중 어디에 해당하는지 분류한다.
3. 정상 운영 스크립트, 배포, 헬스체크와 비교한다.
4. 같은 명령 패턴과 동일 destination으로 전체 로그를 확장 검색한다.
5. 후속 파일 생성, 네트워크 연결, 인증 시도를 Pivot한다.

## 6. 판단 기준

| 구분 | 확인 기준 |
| --- | --- |
| 의심 | 웹/앱/서비스 프로세스 하위에서 shell 또는 PowerShell 실행 |
| 의심 | `curl`, `wget`, `Invoke-WebRequest`, `python -c`, encoded command 사용 |
| 의심 | kubectl exec로 컨테이너 내부에서 환경변수/secret/파일 구조 확인 |
| 정상 가능성 | 승인된 운영 스크립트, 배포 자동화, 장애 대응 절차와 일치 |

## 7. LLM Prompt Template

```text
너는 SIEM에 연결된 침해사고 분석 보조자다.
다음 조건으로 "스크립트/인터프리터 기반 명령 실행" 정황을 조사하라.

입력:
- 시간 범위:
- 의심 호스트/파드:
- 의심 계정:
- 관측된 명령 또는 프로세스:
- 관측된 단서:

요청:
1. PowerShell/Sysmon/Linux/K8s audit/EDR 로그를 조회하라.
2. 프로세스 트리, 실행 명령, 부모 프로세스, 네트워크 연결을 요약하라.
3. 정상 운영 가능성과 공격 행위 가능성을 구분하라.
4. 후속 credential 접근, 도구 다운로드, 원격 접속, 데이터 접근을 Pivot하라.
5. 초동 대응 조치를 작성하라.

출력 형식:
- 관측된 사실
- 명령 분류
- 타임라인
- 의심 근거
- 추가 Pivot
- 대응 조치
```

## 8. 대응 요약

- 원본 프로세스 로그와 스크립트 내용을 보존한다.
- 비정상 실행이면 호스트/파드 격리와 계정 사용 중지를 검토한다.
- 다운로드 URL, destination IP, 명령 패턴으로 확장 검색한다.
- 운영 자동화 예외 목록과 로깅 정책을 정비한다.
