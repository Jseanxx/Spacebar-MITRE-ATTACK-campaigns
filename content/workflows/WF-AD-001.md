---
id: WF-AD-001
name: "AD 장악 및 도메인 권한 확대"
description: "Kerberoasting, LSASS dump, DCSync, Golden Ticket, NTDS 탈취 등 AD 장악 흐름을 분석한다."
techniques: "T1558.003, T1003.001, T1003.006, T1003.003, T1558.001, T1021.006"
---

# WF-AD-001 AD 장악 및 도메인 권한 확대

도메인 계정 정찰 이후 Kerberoasting, LSASS dump, DCSync, Golden Ticket, NTDS 탈취로 이어지는 AD 장악 흐름을 분석하는 Workflow다.
각 이벤트를 따로 보지 않고 계정 정찰, credential 수집, DC 접근, 도메인 권한 행사 순서로 연결한다.

| Field | Value |
| --- | --- |
| 분석 대상 행위 | Kerberoasting, LSASS dump, DCSync, Golden Ticket, NTDS 탈취, DC 원격 접속 |
| 관련 캠페인 | SB-03, SB-07 |
| 분석 결과물 | 탈취 계정, 도메인 권한 범위, DC 접근 경로, 장기 지속성 여부 |

## 1. 행위 정의

공격자가 AD 환경에서 서비스 계정이나 관리자 credential을 탈취하고, 도메인 컨트롤러 접근과 전체 계정 데이터베이스 탈취를 시도하는 행위다.
Windows 이벤트, Sysmon, PowerShell, DC 보안 로그, 네트워크 접속 로그를 함께 확인해야 한다.

## 2. 관련 Technique

| Technique | Name | 확인 관점 |
| --- | --- | --- |
| T1558.003 | Kerberoasting | 서비스 티켓 요청과 오프라인 크래킹 후보 확인 |
| T1003.001 | LSASS Memory | LSASS 덤프 프로세스와 파일 생성 확인 |
| T1003.006 | DCSync | Directory Replication 권한 오용 확인 |
| T1003.003 | NTDS | NTDS.dit 또는 secretsdump 기반 계정 DB 탈취 확인 |
| T1558.001 | Golden Ticket | krbtgt 키 악용과 위조 TGT 사용 확인 |
| T1021.006 | WinRM | DC 원격 명령 실행 여부 확인 |

## 3. 먼저 확인할 로그

| 환경 | 대표 로그 | 핵심 필드 |
| --- | --- | --- |
| Domain Controller | Security 4768/4769/4771/4662/4624 | account, serviceName, source IP, object, access mask |
| Windows Host | Sysmon 1/10/11, Security 4688 | process.command_line, target process, file path |
| PowerShell | Event ID 4104 | ScriptBlockText, user, host |
| Network | SMB/WinRM/RPC/DCERPC logs | source, destination, port, account |
| EDR | credential dumping alert | process tree, dump file, detection name |

## 4. 빠른 KQL

### Kerberoasting 후보

```text
winlog.event_id: 4769 and winlog.event_data.TicketEncryptionType: ("0x17" or "0x18")
```

### LSASS dump 후보

```text
process.command_line: ("*lsass*" or "*comsvcs.dll*" or "*MiniDump*" or "*procdump*")
```

### DCSync 후보

```text
winlog.event_id: 4662 and winlog.event_data.Properties: ("*DS-Replication-Get-Changes*" or "*DS-Replication-Get-Changes-All*")
```

## 5. 분석자가 할 일

1. AD 정찰과 credential 수집의 시작점을 찾는다.
2. Kerberoasting, LSASS dump, DCSync, NTDS 접근 이벤트를 시간순으로 연결한다.
3. DC 접근 계정, source host, 인증 방식, 원격 실행 도구를 확인한다.
4. Golden Ticket 또는 krbtgt 관련 이상 징후를 확인한다.
5. 도메인 전체 영향 범위와 credential 회전 범위를 산정한다.

## 6. 판단 기준

본 판단 기준은 MITRE ATT&CK 기법의 Detection Strategy/Data Sources 관점과 CISA Incident Response Playbook의 Detection & Analysis 절차를 함께 적용한다.  
단일 이벤트만으로 확정하지 않고, 로그 보존, 이벤트 상관분석, 타임라인 작성, 정상 활동과의 deconfliction, ATT&CK TTP 매핑을 통해 판단한다.

| 구분 | 확인 기준 | 근거 |
| --- | --- | --- |
| 의심 | 일반 사용자/감염 호스트에서 대량 TGS 요청 또는 Rubeus 실행 | MITRE ATT&CK `T1558.003`, `T1003.001`, `T1003.006`, `T1003.003`, CISA Detection & Analysis 기준 |
| 의심 | LSASS dump 파일 생성, comsvcs.dll/rundll32 악용 | MITRE ATT&CK `T1558.003`, `T1003.001`, `T1003.006`, `T1003.003`, CISA Detection & Analysis 기준 |
| 의심 | 비정상 계정의 DCSync/NTDS 접근 또는 DC 원격 실행 | MITRE ATT&CK `T1558.003`, `T1003.001`, `T1003.006`, `T1003.003`, CISA Detection & Analysis 기준 |
| 정상 가능성 | 승인된 백업, AD 점검, 보안 도구 스캔과 일치 | CISA authorized activity deconfliction, 조직 baseline 및 승인 작업 확인 |

## 7. LLM Prompt Template

```text
너는 SIEM에 연결된 침해사고 분석 보조자다.
다음 조건으로 "AD 장악 및 도메인 권한 확대" 정황을 조사하라.

입력:
- 시간 범위:
- 의심 계정:
- 의심 호스트:
- 대상 DC:
- 관측된 단서:

요청:
1. DC Security, Sysmon, PowerShell, 네트워크, EDR 로그를 조회하라.
2. Kerberoasting, LSASS dump, DCSync, Golden Ticket, NTDS 관련 이벤트를 분류하라.
3. DC 접근 경로와 사용 credential을 타임라인으로 정리하라.
4. 정상 관리 가능성과 도메인 장악 가능성을 구분하라.
5. containment와 credential 회전 조치를 작성하라.

출력 형식:
- 관측된 사실
- AD 공격 단계
- 영향 계정/호스트
- 의심 근거
- 추가 Pivot
- 대응 조치
```

## 8. 대응 요약

- DC 로그, dump 파일 흔적, 원격 실행 로그를 보존한다.
- 의심 계정 비활성화, 관리자 credential 회전, krbtgt 회전 필요성을 검토한다.
- DC 접근 source host를 격리하고 전체 도메인 인증 로그를 확장 검색한다.
- AD Tiering, 최소 권한, credential 보호 설정을 점검한다.

## 9. 근거자료

- CISA, [Cybersecurity Incident & Vulnerability Response Playbooks](C:/Users/iregr/Downloads/Federal_Government_Cybersecurity_Incident_and_Vulnerability_Response_Playbooks_508C.pdf) - Detection & Analysis 단계의 로그 보존, 이벤트 상관분석, 타임라인 작성, 정상 활동 deconfliction 기준을 판단 근거로 사용한다.
- MITRE ATT&CK, [Detection Strategies](https://attack.mitre.org/detectionstrategies/) - 기법별 탐지 전략과 데이터 소스 관점을 판단 기준에 반영한다.
- MITRE ATT&CK, [T1558.003](https://attack.mitre.org/techniques/T1558/003/)
- MITRE ATT&CK, [T1003.001](https://attack.mitre.org/techniques/T1003/001/)
- MITRE ATT&CK, [T1003.006](https://attack.mitre.org/techniques/T1003/006/)
- MITRE ATT&CK, [T1003.003](https://attack.mitre.org/techniques/T1003/003/)
- MITRE ATT&CK, [T1558.001](https://attack.mitre.org/techniques/T1558/001/)
- MITRE ATT&CK, [T1021.006](https://attack.mitre.org/techniques/T1021/006/)
