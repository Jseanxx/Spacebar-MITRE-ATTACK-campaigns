---
id: WF-PERSIST-001
name: "지속성 확보 및 정상 흐름 위장"
description: "웹쉘, Scheduled Task, Golden Ticket, 정상 업데이트 흐름 위장 등 지속 접근 구조를 분석한다."
techniques: "T1505.003, T1053, T1558.001, T1098, T1036"
---

# WF-PERSIST-001 지속성 확보 및 정상 흐름 위장

공격자가 재접속을 위해 웹쉘, 예약 작업, 위조 티켓, 계정/RBAC 변경, 정상 파일명 위장을 사용한 정황을 분석하는 Workflow다.
지속성은 겉으로 정상 운영 파일이나 작업처럼 보일 수 있으므로 생성 주체와 변경 시점을 우선 확인한다.

| Field | Value |
| --- | --- |
| 분석 대상 행위 | 웹쉘, marker, scheduled task, Golden Ticket, 계정/RBAC 변경, 정상 파일명 위장 |
| 관련 캠페인 | SB-03, SB-06, SB-07 |
| 분석 결과물 | 지속성 메커니즘, 생성 주체, 실행 조건, 제거 범위, 재접속 가능성 |

## 1. 행위 정의

공격자가 일회성 침투 이후에도 접근을 유지하기 위해 서버에 실행 채널을 남기거나, 인증/권한 구조를 변경하거나, 정상 배포/업데이트 흐름처럼 보이게 위장하는 행위다.
파일 생성, 작업 등록, 티켓 사용, 권한 변경을 같은 타임라인에서 확인해야 한다.

## 2. 관련 Technique

| Technique | Name | 확인 관점 |
| --- | --- | --- |
| T1505.003 | Web Shell | JSP/webshell/marker 배치 확인 |
| T1053 | Scheduled Task/Job | SYSTEM/root 권한 예약 작업 등록 확인 |
| T1558.001 | Golden Ticket | 위조 TGT 사용과 장기 도메인 접근 확인 |
| T1098 | Account Manipulation | 계정, Role, RoleBinding 변경 확인 |
| T1036 | Masquerading | 정상 파일명/경로/업데이트 흐름 위장 확인 |

## 3. 먼저 확인할 로그

| 환경 | 대표 로그 | 핵심 필드 |
| --- | --- | --- |
| Web/App | file create, deploy log, access log | file.path, user, process, URL, timestamp |
| Windows | Security 4698/4702, TaskScheduler, Sysmon 1/11 | task name, author, command, file.path |
| AD | Kerberos/DC logs, Security 4768/4769 | account, ticket, source, encryption, anomaly |
| Kubernetes | API audit, RBAC changes | verb, resource, user, namespace |
| EDR | persistence alert, file/process tree | process, persistence type, hash |

## 4. 빠른 KQL

### 웹쉘/스크립트 파일 생성 후보

```text
file.path: ("*.jsp" or "*.aspx" or "*.php" or "*webshell*" or "*marker*") and event.action: ("creation" or "file_create")
```

### Scheduled Task 등록

```text
winlog.event_id: (4698 or 4702) or process.command_line: ("*schtasks*" or "*Register-ScheduledTask*")
```

### RBAC/계정 변경

```text
event.action: ("CreateUser" or "AttachUserPolicy" or "CreateRole" or "CreateRoleBinding" or "UpdateAssumeRolePolicy")
```

## 5. 분석자가 할 일

1. 지속성 후보의 생성 시각, 생성 주체, 파일/작업/권한 객체를 고정한다.
2. 정상 배포나 관리 작업으로 생성된 것인지 변경 승인 기록과 비교한다.
3. 실행 조건과 실제 실행 여부를 확인한다.
4. 동일 파일명, hash, task name, 계정 변경 패턴으로 확장 검색한다.
5. 지속성 제거 전 원본 증적을 보존하고 재접속 경로를 차단한다.

## 6. 판단 기준

본 판단 기준은 MITRE ATT&CK 기법의 Detection Strategy/Data Sources 관점과 CISA Incident Response Playbook의 Detection & Analysis 절차를 함께 적용한다.  
단일 이벤트만으로 확정하지 않고, 로그 보존, 이벤트 상관분석, 타임라인 작성, 정상 활동과의 deconfliction, ATT&CK TTP 매핑을 통해 판단한다.

| 구분 | 확인 기준 | 근거 |
| --- | --- | --- |
| 의심 | 배포 경로에 비정상 스크립트/webshell 파일 생성 | MITRE ATT&CK `T1505.003`, `T1053`, `T1558.001`, `T1098`, CISA Detection & Analysis 기준 |
| 의심 | 운영 승인 없이 SYSTEM/root scheduled task 등록 | MITRE ATT&CK `T1505.003`, `T1053`, `T1558.001`, `T1098`, CISA Detection & Analysis 기준 |
| 의심 | Golden Ticket, 과도한 RBAC, 신규 계정/키 생성 | MITRE ATT&CK `T1505.003`, `T1053`, `T1558.001`, `T1098`, CISA Detection & Analysis 기준 |
| 정상 가능성 | 승인된 배포, 운영 자동화, 정기 작업 변경과 일치 | CISA authorized activity deconfliction, 조직 baseline 및 승인 작업 확인 |

## 7. LLM Prompt Template

```text
너는 SIEM에 연결된 침해사고 분석 보조자다.
다음 조건으로 "지속성 확보 및 정상 흐름 위장" 정황을 조사하라.

입력:
- 시간 범위:
- 의심 호스트/서비스/계정:
- 의심 파일/task/권한 객체:
- 관측된 단서:

요청:
1. 파일 생성, 작업 등록, AD/Kerberos, RBAC, EDR 로그를 조회하라.
2. 지속성 후보의 생성 주체, 실행 조건, 실행 여부를 요약하라.
3. 정상 변경 가능성과 공격 지속성 가능성을 구분하라.
4. 같은 패턴의 재접속/후속 실행 Pivot을 확인하라.
5. 제거 및 대응 조치를 작성하라.

출력 형식:
- 관측된 사실
- 지속성 후보
- 타임라인
- 의심 근거
- 추가 Pivot
- 대응 조치
```

## 8. 대응 요약

- 파일, 작업, 티켓, 권한 변경 로그를 제거 전에 보존한다.
- 의심 지속성 객체를 격리하고 관련 credential을 회전한다.
- 동일 hash/task/계정/source IP로 확장 검색한다.
- 변경 승인과 무결성 검증 절차를 개선한다.

## 9. 근거자료

- CISA, [Cybersecurity Incident & Vulnerability Response Playbooks](C:/Users/iregr/Downloads/Federal_Government_Cybersecurity_Incident_and_Vulnerability_Response_Playbooks_508C.pdf) - Detection & Analysis 단계의 로그 보존, 이벤트 상관분석, 타임라인 작성, 정상 활동 deconfliction 기준을 판단 근거로 사용한다.
- MITRE ATT&CK, [Detection Strategies](https://attack.mitre.org/detectionstrategies/) - 기법별 탐지 전략과 데이터 소스 관점을 판단 기준에 반영한다.
- MITRE ATT&CK, [T1558.001](https://attack.mitre.org/techniques/T1558/001/)
- MITRE ATT&CK, [T1036](https://attack.mitre.org/techniques/T1036/)
