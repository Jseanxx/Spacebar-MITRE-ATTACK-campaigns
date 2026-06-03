---
id: WF-STAGING-001
name: "유출 전 데이터 스테이징 및 압축"
description: "수집 자료를 임시 경로, 공유 폴더, 로컬 staging 디렉터리에 모으고 압축/암호화한 정황을 분석한다."
techniques: "T1074.001, T1560, T1560.001, T1036, T1005"
---

# WF-STAGING-001 유출 전 데이터 스테이징 및 압축

공격자가 여러 위치에서 수집한 자료를 한 경로에 모으고 archive로 묶어 외부 전송을 준비한 정황을 분석하는 Workflow다.
데이터 접근 이후 파일 생성, 복사, 압축, 암호화, 파일명 위장을 시간순으로 확인한다.

| Field | Value |
| --- | --- |
| 분석 대상 행위 | 임시 디렉터리 staging, 공유 폴더 경유, zip/tar 압축, 암호화, 파일명 위장 |
| 관련 캠페인 | SB-01, SB-03, SB-05 |
| 분석 결과물 | staging 경로, 포함 파일, archive 이름, 생성 주체, 유출 준비 여부 |

## 1. 행위 정의

공격자가 유출을 쉽게 하기 위해 고객 데이터, dump, secret, 로그를 임시 경로 또는 공유 폴더에 모으고 압축 파일로 만드는 행위다.
archive 생성만 보지 말고 직전 파일 복사와 직후 외부 전송을 함께 확인해야 한다.

## 2. 관련 Technique

| Technique | Name | 확인 관점 |
| --- | --- | --- |
| T1074.001 | Local Data Staging | 로컬 임시 경로에 자료 수집 확인 |
| T1560 | Archive Collected Data | archive 생성 여부 확인 |
| T1560.001 | Archive via Utility | zip, tar, 7z, Compress-Archive 사용 확인 |
| T1036 | Masquerading | 정상 파일명/확장자 위장 확인 |
| T1005 | Data from Local System | 로컬 수집 자료의 원천 확인 |

## 3. 먼저 확인할 로그

| 환경 | 대표 로그 | 핵심 필드 |
| --- | --- | --- |
| Windows | Sysmon 1/11, PowerShell 4104 | command_line, file.path, file.name, user |
| Linux | auditd, syslog, process/file logs | command, path, user, cwd |
| File Server | SMB/file access logs | source, user, share, file path |
| EDR | archive creation alert, file events | process, target file, size, hash |
| Network | 이후 전송 로그 | source, destination, bytes, URL |

## 4. 빠른 KQL

### 압축 도구 실행

```text
process.command_line: ("*zip*" or "*tar *" or "*7z*" or "*Compress-Archive*" or "*rar*")
```

### 임시/staging 경로 파일 생성

```text
file.path: ("*/tmp/*" or "*\\Temp\\*" or "*staging*" or "*archive*" or "*.zip" or "*.tar" or "*.7z")
```

### 정상 파일명 위장 후보

```text
file.name: ("*.log" or "*.bak" or "*.tmp" or "*.dat") and file.size: >1000000
```

## 5. 분석자가 할 일

1. staging 경로와 archive 파일명을 고정한다.
2. archive 생성 전 복사된 원본 파일 목록을 확인한다.
3. 생성 주체, 압축 명령, 암호화 옵션, 파일 크기를 확인한다.
4. 정상 백업/리포트/배포 산출물 가능성을 확인한다.
5. archive 생성 직후 외부 전송, S3 업로드, HTTP POST를 Pivot한다.

## 6. 판단 기준

본 판단 기준은 MITRE ATT&CK 기법의 Detection Strategy/Data Sources 관점과 CISA Incident Response Playbook의 Detection & Analysis 절차를 함께 적용한다.  
단일 이벤트만으로 확정하지 않고, 로그 보존, 이벤트 상관분석, 타임라인 작성, 정상 활동과의 deconfliction, ATT&CK TTP 매핑을 통해 판단한다.

| 구분 | 확인 기준 | 근거 |
| --- | --- | --- |
| 의심 | 여러 민감 파일이 임시 경로에 단시간 집중 복사 | MITRE ATT&CK `T1074.001`, `T1560`, `T1560.001`, `T1036`, CISA Detection & Analysis 기준 |
| 의심 | zip/tar/7z/Compress-Archive 후 외부 네트워크 연결 | MITRE ATT&CK `T1074.001`, `T1560`, `T1560.001`, `T1036`, CISA Detection & Analysis 기준 |
| 의심 | 파일명이 정상 로그/백업처럼 위장됐지만 내용/크기가 비정상 | MITRE ATT&CK `T1074.001`, `T1560`, `T1560.001`, `T1036`, CISA Detection & Analysis 기준 |
| 정상 가능성 | 승인된 백업, 정기 리포트, 배포 artifact 생성과 일치 | CISA authorized activity deconfliction, 조직 baseline 및 승인 작업 확인 |

## 7. LLM Prompt Template

```text
너는 SIEM에 연결된 침해사고 분석 보조자다.
다음 조건으로 "유출 전 데이터 스테이징 및 압축" 정황을 조사하라.

입력:
- 시간 범위:
- 의심 호스트:
- 의심 계정:
- 의심 경로/archive:
- 관측된 단서:

요청:
1. 파일 생성, 프로세스, PowerShell/Linux, 파일 서버, 네트워크 로그를 조회하라.
2. staging 경로, 원본 파일, archive 생성 명령을 요약하라.
3. 정상 백업/리포트 가능성과 유출 준비 가능성을 구분하라.
4. archive 생성 이후 외부 전송 Pivot을 확인하라.
5. 초동 대응 조치를 작성하라.

출력 형식:
- 관측된 사실
- staging 경로
- archive 후보
- 포함 데이터 후보
- 추가 Pivot
- 대응 조치
```

## 8. 대응 요약

- archive 파일, 원본 파일 목록, 생성 명령 로그를 보존한다.
- 유출 전송이 진행 중이면 네트워크 차단과 호스트 격리를 검토한다.
- 동일 경로, 파일명, hash, 계정으로 확장 검색한다.
- 민감 데이터 포함 여부와 개인정보 영향도를 확인한다.

## 9. 근거자료

- CISA, [Cybersecurity Incident & Vulnerability Response Playbooks](C:/Users/iregr/Downloads/Federal_Government_Cybersecurity_Incident_and_Vulnerability_Response_Playbooks_508C.pdf) - Detection & Analysis 단계의 로그 보존, 이벤트 상관분석, 타임라인 작성, 정상 활동 deconfliction 기준을 판단 근거로 사용한다.
- MITRE ATT&CK, [Detection Strategies](https://attack.mitre.org/detectionstrategies/) - 기법별 탐지 전략과 데이터 소스 관점을 판단 기준에 반영한다.
- MITRE ATT&CK, [T1074.001](https://attack.mitre.org/techniques/T1074/001/)
- MITRE ATT&CK, [T1560](https://attack.mitre.org/techniques/T1560/)
- MITRE ATT&CK, [T1036](https://attack.mitre.org/techniques/T1036/)
