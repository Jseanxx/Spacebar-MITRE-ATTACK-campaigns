---
id: WF-LOLBIN-001
name: "정상 도구/서명된 바이너리 악용"
description: "rundll32, comsvcs.dll, PowerShell, schtasks 등 정상 도구를 프록시로 악용한 정황을 분석한다."
techniques: "T1218, T1218.011, T1059.001, T1003.001, T1053, T1105"
---

# WF-LOLBIN-001 정상 도구/서명된 바이너리 악용

정상 시스템 도구나 서명된 바이너리가 공격 행위의 실행 프록시로 사용된 정황을 분석하는 Workflow다.
파일명만 정상인지 보지 않고 명령줄 인자, 부모 프로세스, 실행 위치, 후속 파일/네트워크 행위를 확인한다.

| Field | Value |
| --- | --- |
| 분석 대상 행위 | rundll32/comsvcs.dll, PowerShell, schtasks, certutil, curl/wget 등 정상 도구 악용 |
| 관련 캠페인 | SB-03, SB-07 |
| 분석 결과물 | 악용된 도구, 명령줄, 부모 프로세스, 목적 행위, 후속 Pivot |

## 1. 행위 정의

공격자가 보안 탐지를 우회하거나 신뢰를 얻기 위해 운영체제 기본 도구와 정상 관리 도구를 공격 행위에 사용하는 행위다.
정상 도구 실행 자체가 아니라 비정상 인자, 비정상 부모 프로세스, 비정상 대상 파일을 중심으로 판단한다.

## 2. 관련 Technique

| Technique | Name | 확인 관점 |
| --- | --- | --- |
| T1218 | System Binary Proxy Execution | 정상 바이너리 프록시 실행 확인 |
| T1218.011 | Rundll32 | rundll32와 DLL 인자 악용 확인 |
| T1059.001 | PowerShell | 웹 요청, encoded command, 스크립트 실행 확인 |
| T1003.001 | LSASS Memory | comsvcs.dll 기반 LSASS dump 확인 |
| T1053 | Scheduled Task/Job | schtasks 기반 지속성/원격 실행 확인 |
| T1105 | Ingress Tool Transfer | 정상 도구를 통한 다운로드 확인 |

## 3. 먼저 확인할 로그

| 환경 | 대표 로그 | 핵심 필드 |
| --- | --- | --- |
| Windows | Sysmon 1/7/10/11, Security 4688 | process, command_line, parent, image_loaded |
| PowerShell | Event ID 4104 | ScriptBlockText, user, host |
| EDR | process tree, LOLBin alert | parent, child, hash, detection |
| Network | Proxy, firewall, Sysmon 3 | destination, URL, user agent, process |
| File | Sysmon 11, file creation | file.path, hash, process |

## 4. 빠른 KQL

### rundll32/comsvcs LSASS dump

```text
process.name: "rundll32.exe" and process.command_line: ("*comsvcs.dll*" and "*MiniDump*" and "*lsass*")
```

### PowerShell 다운로드/난독화

```text
process.name: ("powershell.exe" or "pwsh.exe") and process.command_line: ("*-enc*" or "*Invoke-WebRequest*" or "*DownloadString*")
```

### schtasks 등록

```text
process.command_line: ("*schtasks /create*" or "*Register-ScheduledTask*")
```

## 5. 분석자가 할 일

1. 실행된 정상 도구와 전체 command line을 고정한다.
2. 부모 프로세스, 실행 계정, 실행 위치가 정상인지 확인한다.
3. 도구 사용 목적이 dump, 다운로드, 지속성, 원격 실행 중 무엇인지 분류한다.
4. 같은 command line 또는 hash로 확장 검색한다.
5. 후속 credential 접근, 파일 생성, 네트워크 연결을 Pivot한다.

## 6. 판단 기준

본 판단 기준은 MITRE ATT&CK 기법의 Detection Strategy/Data Sources 관점과 CISA Incident Response Playbook의 Detection & Analysis 절차를 함께 적용한다.  
단일 이벤트만으로 확정하지 않고, 로그 보존, 이벤트 상관분석, 타임라인 작성, 정상 활동과의 deconfliction, ATT&CK TTP 매핑을 통해 판단한다.

| 구분 | 확인 기준 | 근거 |
| --- | --- | --- |
| 의심 | rundll32/comsvcs로 LSASS 접근 또는 dump 생성 | MITRE ATT&CK `T1218`, `T1218.011`, `T1059.001`, `T1003.001`, CISA Detection & Analysis 기준 |
| 의심 | PowerShell encoded command, 외부 다운로드, 비정상 parent | MITRE ATT&CK `T1218`, `T1218.011`, `T1059.001`, `T1003.001`, CISA Detection & Analysis 기준 |
| 의심 | schtasks로 SYSTEM 권한 payload 실행 | MITRE ATT&CK `T1218`, `T1218.011`, `T1059.001`, `T1003.001`, CISA Detection & Analysis 기준 |
| 정상 가능성 | 승인된 관리 도구, 백업, 패치, EDR/관리 솔루션 작업과 일치 | CISA authorized activity deconfliction, 조직 baseline 및 승인 작업 확인 |

## 7. LLM Prompt Template

```text
너는 SIEM에 연결된 침해사고 분석 보조자다.
다음 조건으로 "정상 도구/서명된 바이너리 악용" 정황을 조사하라.

입력:
- 시간 범위:
- 의심 호스트:
- 의심 프로세스:
- 의심 계정:
- 관측된 command line:

요청:
1. Sysmon, Security, PowerShell, EDR, 네트워크 로그를 조회하라.
2. 프로세스 트리와 명령줄을 분석해 목적 행위를 분류하라.
3. 정상 관리 가능성과 공격 악용 가능성을 구분하라.
4. 후속 파일 생성, 네트워크 연결, credential 접근 Pivot을 확인하라.
5. 초동 대응 조치를 작성하라.

출력 형식:
- 관측된 사실
- 악용 도구
- 목적 행위
- 의심 근거
- 추가 Pivot
- 대응 조치
```

## 8. 대응 요약

- 프로세스 트리, command line, 관련 파일을 보존한다.
- 비정상 도구 사용이면 호스트 격리와 credential 회전을 검토한다.
- 동일 command line, parent, destination으로 확장 검색한다.
- LOLBin 탐지 룰과 허용된 관리 도구 기준을 정비한다.

## 9. 근거자료

- CISA, [Cybersecurity Incident & Vulnerability Response Playbooks](C:/Users/iregr/Downloads/Federal_Government_Cybersecurity_Incident_and_Vulnerability_Response_Playbooks_508C.pdf) - Detection & Analysis 단계의 로그 보존, 이벤트 상관분석, 타임라인 작성, 정상 활동 deconfliction 기준을 판단 근거로 사용한다.
- MITRE ATT&CK, [Detection Strategies](https://attack.mitre.org/detectionstrategies/) - 기법별 탐지 전략과 데이터 소스 관점을 판단 기준에 반영한다.
- MITRE ATT&CK, [T1059.001](https://attack.mitre.org/techniques/T1059/001/)
- MITRE ATT&CK, [T1003.001](https://attack.mitre.org/techniques/T1003/001/)
- MITRE ATT&CK, [T1105](https://attack.mitre.org/techniques/T1105/)
