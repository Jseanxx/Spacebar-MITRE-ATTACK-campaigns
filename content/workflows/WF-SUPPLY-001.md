---
id: WF-SUPPLY-001
name: "신뢰된 배포/업데이트 체인 변조"
description: "CI/CD 배포, 패치 파일, manifest, 업데이트 서버 등 신뢰된 배포 흐름에 공격 코드를 삽입한 정황을 분석한다."
techniques: "T1195, T1195.002, T1036, T1105, T1053, T1021"
---

# WF-SUPPLY-001 신뢰된 배포/업데이트 체인 변조

공격자가 Jenkins 배포, PMS 업데이트, 패치 스크립트, manifest 같은 신뢰된 배포/업데이트 경로를 변조한 정황을 분석하는 Workflow다.
파일 변경 자체보다 변경 주체, hash/version 변경, 클라이언트 다운로드, 실행 권한을 연결해 봐야 한다.

| Field | Value |
| --- | --- |
| 분석 대상 행위 | 배포 Job 악용, patch.ps1/manifest 변조, 업데이트 흐름 악용, 신뢰 경로 위장 |
| 관련 캠페인 | SB-01, SB-07 |
| 분석 결과물 | 변조 파일, 변경 주체, 배포 대상, 실행 클라이언트, 영향 범위 |

## 1. 행위 정의

공격자가 정상 배포 또는 업데이트 체인을 이용해 내부 서버/클라이언트에 공격 코드를 전달하고 실행시키는 행위다.
정상 운영처럼 보이므로 변경 승인, 파일 hash, version, 배포 Job, 클라이언트 실행 로그를 함께 확인해야 한다.

## 2. 관련 Technique

| Technique | Name | 확인 관점 |
| --- | --- | --- |
| T1195 | Supply Chain Compromise | 신뢰된 배포/업데이트 흐름 악용 여부 확인 |
| T1195.002 | Compromise Software Supply Chain | 패치/manifest/배포 산출물 변조 확인 |
| T1036 | Masquerading | 기존 파일명/경로/version 위장 확인 |
| T1105 | Ingress Tool Transfer | 변조 패치 다운로드와 페이로드 전달 확인 |
| T1053 | Scheduled Task/Job | 에이전트 또는 예약 작업의 자동 실행 확인 |
| T1021 | Remote Services | 배포 credential을 이용한 원격 접근 확인 |

## 3. 먼저 확인할 로그

| 환경 | 대표 로그 | 핵심 필드 |
| --- | --- | --- |
| CI/CD | Jenkins job/build/audit log | job, build id, user, artifact, target |
| Update Server | web access log, file change log | path, hash, version, source IP, user |
| Endpoint | Sysmon 1/11, PowerShell 4104, task logs | downloaded file, command_line, parent process |
| File Integrity | FIM, EDR file events | file.path, hash, signer, modifier |
| Network | proxy/firewall/CDN | client, URL, download count, status |

## 4. 빠른 KQL

### 패치/manifest 변경

```text
file.path: ("*/updates/manifest.json" or "*/updates/patch.ps1" or "*artifact*" or "*deploy*") and event.action: ("file_create" or "file_modify")
```

### 클라이언트 패치 다운로드

```text
url.path: ("*/updates/patch.ps1" or "*/updates/manifest.json") and http.response.status_code: 200
```

### 패치 실행

```text
process.command_line: ("*patch.ps1*" or "*powershell*updates*" or "*deploy*") 
```

## 5. 분석자가 할 일

1. 변조 후보 파일, hash, version, 변경 시각을 고정한다.
2. 변경 주체와 승인된 배포/패치 작업 여부를 확인한다.
3. 어떤 클라이언트/서버가 변조 파일을 다운로드하고 실행했는지 집계한다.
4. 실행 권한과 후속 명령, credential 접근, 원격 접속을 Pivot한다.
5. 정상 버전과 변조 버전을 비교하고 롤백 범위를 산정한다.

## 6. 판단 기준

본 판단 기준은 MITRE ATT&CK 기법의 Detection Strategy/Data Sources 관점과 CISA Incident Response Playbook의 Detection & Analysis 절차를 함께 적용한다.  
단일 이벤트만으로 확정하지 않고, 로그 보존, 이벤트 상관분석, 타임라인 작성, 정상 활동과의 deconfliction, ATT&CK TTP 매핑을 통해 판단한다.

| 구분 | 확인 기준 | 근거 |
| --- | --- | --- |
| 의심 | 승인 없는 patch/manifest/artifact 변경 | MITRE ATT&CK `T1195`, `T1195.002`, `T1036`, `T1105`, CISA Detection & Analysis 기준 |
| 의심 | hash/version만 갱신되고 파일 내용이 비정상 변경 | MITRE ATT&CK `T1195`, `T1195.002`, `T1036`, `T1105`, CISA Detection & Analysis 기준 |
| 의심 | 업데이트 에이전트가 SYSTEM/root 권한으로 공격 명령 실행 | MITRE ATT&CK `T1195`, `T1195.002`, `T1036`, `T1105`, CISA Detection & Analysis 기준 |
| 정상 가능성 | 배포 티켓, 변경 승인, 코드 서명, 릴리스 노트와 일치 | CISA authorized activity deconfliction, 조직 baseline 및 승인 작업 확인 |

## 7. LLM Prompt Template

```text
너는 SIEM에 연결된 침해사고 분석 보조자다.
다음 조건으로 "신뢰된 배포/업데이트 체인 변조" 정황을 조사하라.

입력:
- 시간 범위:
- 의심 배포/업데이트 서버:
- 의심 파일 또는 artifact:
- 의심 계정:
- 관측된 단서:

요청:
1. CI/CD, 업데이트 서버, 파일 무결성, endpoint 실행 로그를 조회하라.
2. 파일 변경, 다운로드, 실행 타임라인을 작성하라.
3. 정상 변경 가능성과 공급망 변조 가능성을 구분하라.
4. 영향받은 클라이언트/서버와 후속 행위를 Pivot하라.
5. 롤백과 대응 조치를 작성하라.

출력 형식:
- 관측된 사실
- 변조 후보
- 영향 범위
- 의심 근거
- 추가 Pivot
- 대응 조치
```

## 8. 대응 요약

- 변조 후보 파일, hash, 배포 로그, 다운로드 로그를 보존한다.
- 배포/업데이트 경로를 임시 중단하고 정상 artifact로 롤백한다.
- 영향받은 클라이언트를 식별해 실행 로그와 credential 접근을 확인한다.
- 코드 서명, 승인 절차, artifact 무결성 검증을 강화한다.

## 9. 근거자료

- CISA, [Cybersecurity Incident & Vulnerability Response Playbooks](C:/Users/iregr/Downloads/Federal_Government_Cybersecurity_Incident_and_Vulnerability_Response_Playbooks_508C.pdf) - Detection & Analysis 단계의 로그 보존, 이벤트 상관분석, 타임라인 작성, 정상 활동 deconfliction 기준을 판단 근거로 사용한다.
- MITRE ATT&CK, [Detection Strategies](https://attack.mitre.org/detectionstrategies/) - 기법별 탐지 전략과 데이터 소스 관점을 판단 기준에 반영한다.
- MITRE ATT&CK, [T1195.002](https://attack.mitre.org/techniques/T1195/002/)
- MITRE ATT&CK, [T1036](https://attack.mitre.org/techniques/T1036/)
- MITRE ATT&CK, [T1105](https://attack.mitre.org/techniques/T1105/)
- MITRE ATT&CK, [T1059](https://attack.mitre.org/techniques/T1059/)
