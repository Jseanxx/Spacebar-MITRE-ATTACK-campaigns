---
id: WF-CRED-001
name: "설정 파일 및 Secret 기반 자격 증명 수집"
description: "설정 파일, 환경변수, Kubernetes Secret, 클라우드 Secret, credential artifact에서 자격 증명을 수집한 정황을 분석한다."
techniques: "T1552, T1552.001, T1552.004, T1555, T1003"
---

# WF-CRED-001 설정 파일 및 Secret 기반 자격 증명 수집

공격자가 설정 파일, `.env`, Kubernetes Secret, Secrets Manager, credential artifact, 메모리 덤프에서 자격 증명 단서를 수집한 정황을 분석하는 Workflow다.
파일 접근 로그와 이후 인증 성공 로그를 함께 보며 실제 악용 여부를 판단한다.

| Field | Value |
| --- | --- |
| 분석 대상 행위 | Secret/credential 파일 접근, 환경변수 조회, 토큰/키/암호 수집 |
| 관련 캠페인 | SB-01, SB-03, SB-04, SB-05, SB-06, SB-07 |
| 분석 결과물 | 접근 주체, credential 종류, 저장 위치, 악용된 대상, 회전 필요 범위 |

## 1. 행위 정의

공격자가 내부 이동과 데이터 접근을 위해 파일, Secret 객체, 환경변수, 메모리, 클라우드 secret에서 자격 증명을 찾는 행위다.
파일 조회만으로 끝내지 말고, 해당 credential이 SSH, DB, AWS API, K8s API, AD 접근에 사용됐는지 이어서 확인해야 한다.

## 2. 관련 Technique

| Technique | Name | 확인 관점 |
| --- | --- | --- |
| T1552 | Unsecured Credentials | 평문/약한 보호 credential 저장 여부 확인 |
| T1552.001 | Credentials In Files | `.env`, config, XML, kubeconfig, script 내 secret 접근 확인 |
| T1552.004 | Private Keys | SSH private key, API key, token 접근 확인 |
| T1555 | Credentials from Password Stores | Secret Manager, credential store 조회 확인 |
| T1003 | OS Credential Dumping | LSASS, NTDS, memory dump 기반 credential 수집 확인 |

## 3. 먼저 확인할 로그

| 환경 | 대표 로그 | 핵심 필드 |
| --- | --- | --- |
| Linux / App | auditd, shell history 후보, file access log | user, process, file.path, command_line |
| Kubernetes | API audit log | verb, resource, namespace, user, serviceAccount |
| Cloud | CloudTrail, Secrets Manager audit | eventName, userIdentity, sourceIPAddress, secretId |
| Windows | Sysmon 1/11, Security, PowerShell 4104 | process.command_line, file.path, TargetObject |
| DB / IAM | 인증 성공/실패, key 사용 로그 | account, source IP, target, auth result |

## 4. 빠른 KQL

### Secret 파일 접근 후보

```text
file.path: ("*.env" or "*config*" or "*credential*" or "*secret*" or "*.pem" or "*kube/config" or "*dc_cred.xml")
```

### Kubernetes Secret 조회

```text
kubernetes.audit.verb: ("get" or "list") and kubernetes.audit.objectRef.resource: "secrets"
```

### Cloud Secret 조회

```text
event.provider: "secretsmanager.amazonaws.com" and event.action: ("GetSecretValue" or "ListSecrets" or "DescribeSecret")
```

## 5. 분석자가 할 일

1. 어떤 주체가 어느 secret 위치에 접근했는지 고정한다.
2. 조회 방식이 파일 읽기, API 조회, 환경변수 출력, 메모리 덤프인지 구분한다.
3. 수집 가능한 credential 종류와 권한 범위를 추정한다.
4. 해당 credential이 이후 인증/접속에 사용됐는지 Pivot한다.
5. 회전해야 할 key, token, password, certificate 범위를 정리한다.

## 6. 판단 기준

본 판단 기준은 MITRE ATT&CK 기법의 Detection Strategy/Data Sources 관점과 CISA Incident Response Playbook의 Detection & Analysis 절차를 함께 적용한다.  
단일 이벤트만으로 확정하지 않고, 로그 보존, 이벤트 상관분석, 타임라인 작성, 정상 활동과의 deconfliction, ATT&CK TTP 매핑을 통해 판단한다.

| 구분 | 확인 기준 | 근거 |
| --- | --- | --- |
| 의심 | 운영 시간 외 credential 파일/Secret 대량 조회 | MITRE ATT&CK `T1552`, `T1552.001`, `T1552.004`, `T1555`, CISA Detection & Analysis 기준 |
| 의심 | 웹/앱/컨테이너 프로세스가 secret 저장소 또는 `.env`를 비정상 조회 | MITRE ATT&CK `T1552`, `T1552.001`, `T1552.004`, `T1555`, CISA Detection & Analysis 기준 |
| 의심 | 조회 직후 SSH, DB, AWS API, K8s API 인증 성공 | MITRE ATT&CK `T1552`, `T1552.001`, `T1552.004`, `T1555`, CISA Detection & Analysis 기준 |
| 정상 가능성 | 배포, 백업, secret rotation, 운영 점검 절차와 일치 | CISA authorized activity deconfliction, 조직 baseline 및 승인 작업 확인 |

## 7. LLM Prompt Template

```text
너는 SIEM에 연결된 침해사고 분석 보조자다.
다음 조건으로 "설정 파일 및 Secret 기반 자격 증명 수집" 정황을 조사하라.

입력:
- 시간 범위:
- 의심 호스트/파드/계정:
- 의심 파일 또는 Secret:
- 관측된 단서:

요청:
1. 파일 접근, K8s audit, CloudTrail, Windows/Sysmon 로그를 조회하라.
2. 접근 주체, 대상 secret, 조회 방식, 노출 가능 credential을 요약하라.
3. credential 악용으로 이어진 인증/접속 로그를 Pivot하라.
4. 정상 운영 작업 가능성과 의심 근거를 구분하라.
5. 회전 대상과 초동 대응 조치를 작성하라.

출력 형식:
- 관측된 사실
- 노출 후보 credential
- 악용 여부
- 타임라인
- 추가 Pivot
- 대응 조치
```

## 8. 대응 요약

- secret 접근 원본 로그와 관련 파일 경로를 보존한다.
- 노출 가능성이 있는 token, key, password를 우선 회전한다.
- 해당 credential의 사용 로그를 전체 기간으로 확장 검색한다.
- secret 저장 위치와 권한, audit 설정, rotation 주기를 개선한다.

## 9. 근거자료

- CISA, [Cybersecurity Incident & Vulnerability Response Playbooks](C:/Users/iregr/Downloads/Federal_Government_Cybersecurity_Incident_and_Vulnerability_Response_Playbooks_508C.pdf) - Detection & Analysis 단계의 로그 보존, 이벤트 상관분석, 타임라인 작성, 정상 활동 deconfliction 기준을 판단 근거로 사용한다.
- MITRE ATT&CK, [Detection Strategies](https://attack.mitre.org/detectionstrategies/) - 기법별 탐지 전략과 데이터 소스 관점을 판단 기준에 반영한다.
- MITRE ATT&CK, [T1078](https://attack.mitre.org/techniques/T1078/)
