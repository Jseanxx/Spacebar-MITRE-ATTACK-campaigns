---
id: WF-REMOTE-001
name: "내부망 원격 실행 분석"
description: "SSH, WinRM, PowerShell 등으로 내부 서버에 접속하거나 원격 명령을 실행한 정황을 분석한다."
techniques: "T1021.004, T1021.006, T1059.001, T1078"
---

# WF-REMOTE-001 내부망 원격 실행 분석

내부 서버에 SSH, WinRM, PowerShell 등으로 접근하거나 명령을 실행한 정황이 보였을 때 사용하는 행위 기반 IR Workflow다.
이 페이지는 이게 어떤 공격 행위인지, 어떤 로그를 먼저 볼지, AI 분석 보조자에게 어떻게 물어볼지 빠르게 정리한다.

| Field | Value |
| --- | --- |
| 분석 대상 행위 | 내부망 원격 접속 및 원격 명령 실행 |
| 관련 캠페인 | [SB-01](/campaigns/SB-01/), SB-03 |
| 분석 결과물 | 접속 주체, 대상 서버, 정상 작업 여부, 추가 Pivot |

## 1. 행위 정의

공격자가 탈취한 계정, SSH key, Jenkins credential, 서비스 계정 암호 등을 이용해 내부 서버에 접속하거나 원격으로 명령을 실행하는 행위다.
단순히 로그인 성공 여부만 보지 않고, 출발지, 대상 서버, 사용 계정, 시간대, 접속 이후 실행된 명령을 함께 확인해야 한다.

## 2. 관련 Technique

| Technique | Name | 확인 관점 |
| --- | --- | --- |
| T1021.004 | Remote Services: SSH | Linux 서버 SSH 접속 주체, source IP, key 사용 여부 확인 |
| T1021.006 | Remote Services: Windows Remote Management | WinRM 접속, LogonType 3, 서비스 계정 사용 여부 확인 |
| T1059.001 | Command and Scripting Interpreter: PowerShell | 원격 접속 이후 PowerShell 명령 실행 여부 확인 |
| T1078 | Valid Accounts | 정상 계정이 침해 행위에 사용됐는지 확인 |

## 3. 먼저 확인할 로그

| 환경 | 대표 로그 | 핵심 필드 |
| --- | --- | --- |
| Linux / SB-01 | [LL-001 auth.log](/campaigns/SB-01/logs/LL-001/) | `@timestamp`, `host.name`, `user.name`, `source.ip`, `message` |
| Windows / SB-03 | Security 4624, PowerShell 4104, Sysmon 1 | `winlog.event_id`, `TargetUserName`, `IpAddress`, `ScriptBlockText`, `process.command_line` |
| Jenkins / CI/CD | build log, job log | job name, build id, user, target host, command |

## 4. 빠른 KQL

### SB-01 SSH

```text
host.name: "sb01-app" and message: "Accepted publickey" and message: "deploy"
```

### SB-03 WinRM

```text
campaign.id: "SB-03" and winlog.event_id: 4624 and winlog.event_data.LogonType: "3" and winlog.event_data.TargetUserName: "svc_file"
```

## 5. 분석자가 할 일

1. 접속 이벤트를 확인해 누가, 어디서, 어느 서버로 접속했는지 고정한다.
2. 배포, 유지보수, 예약 작업 시간대와 비교해 정상 작업 여부를 확인한다.
3. PowerShell, Sysmon, 파일 접근, DB 접근 로그로 후속 행위를 Pivot한다.

## 6. 판단 기준

본 판단 기준은 MITRE ATT&CK 기법의 Detection Strategy/Data Sources 관점과 CISA Incident Response Playbook의 Detection & Analysis 절차를 함께 적용한다.  
단일 이벤트만으로 확정하지 않고, 로그 보존, 이벤트 상관분석, 타임라인 작성, 정상 활동과의 deconfliction, ATT&CK TTP 매핑을 통해 판단한다.

| 구분 | 확인 기준 | 근거 |
| --- | --- | --- |
| 침투 가능성 높음 | 승인되지 않은 source에서 SSH/WinRM/RDP 접속이 성공하고 직후 명령 실행이 관측됨 | MITRE ATT&CK `T1021.004`, `T1021.006`, CISA 타임라인 상관분석 |
| 침투 가능성 높음 | 탈취 가능성이 있는 계정, SSH key, API token, 서비스 계정으로 내부 서버 접근이 발생함 | MITRE ATT&CK `T1078 Valid Accounts`, credential 사용 pivot |
| 추가 확인 필요 | 접속 성공은 있으나 배포/관리 작업 여부와 실행 명령이 확인되지 않음 | CISA deconfliction 및 추가 로그 수집 |
| 정상 가능성 | 승인된 배포, 유지보수, 예약 작업, 장애 대응 시간대와 일치 | CISA baseline 비교 |

## 7. LLM Prompt Template

```text
너는 ELK, Splunk 등 SIEM에 연결된 침해사고 분석 보조자다.
다음 조건으로 "내부망 원격 접속 또는 원격 명령 실행" 의심 정황을 조사하라.
반드시 조회한 로그 또는 제공된 로그 근거를 기반으로 판단하고, 확인되지 않은 내용은 추정이라고 표시하라.
정상 점검, 배포, 보안 도구 실행 가능성을 함께 확인해 오탐과 실제 침투 가능성을 구분하라.

입력:
- 시간 범위:
- 캠페인/환경:
- 의심 출발지 또는 계정:
- 의심 대상 서버:
- 관측된 단서:

요청:
1. 관련 로그를 조회하라.
   - Linux SSH/auth
   - Windows Security 4624/4648
   - PowerShell 4104
   - Sysmon Process/Network
   - Jenkins build/job
2. 접속 주체, 출발지, 대상 서버, 실행 명령을 요약하라.
3. 정상 배포/관리 행위 가능성과 의심 근거를 구분하라.
4. 추가로 확인해야 할 Pivot을 제안하라.
5. 초동 대응 조치를 작성하라.

출력 형식:
- 관측된 사실
- 타임라인
- 의심 근거
- 정상 가능성
- 추가 Pivot
- 대응 조치
```

## 8. 대응 요약

- 원본 로그와 관련 build/job 로그를 보존한다.
- 사용 계정의 정상 사용 범위와 소유자를 확인한다.
- 비정상으로 판단되면 계정 비활성화, key/token 회전, 접속 경로 차단을 수행한다.
- 동일 계정, 동일 source IP, 동일 명령 패턴으로 전체 로그를 확장 검색한다.

## 9. 근거자료

- CISA, [Cybersecurity Incident & Vulnerability Response Playbooks](C:/Users/iregr/Downloads/Federal_Government_Cybersecurity_Incident_and_Vulnerability_Response_Playbooks_508C.pdf) - Detection & Analysis 단계의 로그 보존, 이벤트 상관분석, 타임라인 작성, 정상 활동 deconfliction 기준을 판단 근거로 사용한다.
- MITRE ATT&CK, [Detection Strategies](https://attack.mitre.org/detectionstrategies/) - 기법별 탐지 전략과 데이터 소스 관점을 판단 기준에 반영한다.
- MITRE ATT&CK, [T1021.004](https://attack.mitre.org/techniques/T1021/004/)
- MITRE ATT&CK, [T1021.006](https://attack.mitre.org/techniques/T1021/006/)
- MITRE ATT&CK, [T1059.001](https://attack.mitre.org/techniques/T1059/001/)
- MITRE ATT&CK, [T1078](https://attack.mitre.org/techniques/T1078/)
