---
id: WF-CICD-001
name: "CI/CD 서버 정찰 및 Credential 악용"
description: "Jenkins 등 CI/CD 서버에서 Job, workspace, credential metadata, API token을 정찰하거나 악용한 정황을 분석한다."
techniques: "T1592, T1552, T1078, T1213, T1021.004"
---

# WF-CICD-001 CI/CD 서버 정찰 및 Credential 악용

CI/CD 서버가 내부 이동과 credential 수집의 발판으로 사용된 정황이 보였을 때 사용하는 행위 기반 IR Workflow다.
Jenkins API Token, CLI 접근, Job 실행 이력, workspace, 배포 credential 접근을 중심으로 분석한다.

| Field | Value |
| --- | --- |
| 분석 대상 행위 | CI/CD 정보 정찰, API Token 사용, Jenkins CLI 접근, 배포 credential 악용 |
| 관련 캠페인 | SB-01 |
| 분석 결과물 | 접근 계정, 조회한 Job/credential, 내부 이동 단서, 배포 키 악용 여부 |

## 1. 행위 정의

공격자가 침해된 개발자 계정이나 API Token을 이용해 CI/CD 서버에 접근하고, 배포 대상 서버와 credential 단서를 찾는 행위다.
단순 로그인보다 CLI 호출, Job/Workspace 조회, credential metadata 접근, 배포 키 사용 여부를 함께 봐야 한다.

## 2. 관련 Technique

| Technique | Name | 확인 관점 |
| --- | --- | --- |
| T1592 | Gather Victim Host Information | Jenkins 헤더, UI, 플러그인, 버전 정보 확인 |
| T1552 | Unsecured Credentials | 스크립트/설정/credential metadata에서 secret 단서 확인 |
| T1078 | Valid Accounts | 개발자 계정 또는 API Token 악용 여부 확인 |
| T1213 | Data from Information Repositories | Job, workspace, build log에서 내부 정보 수집 여부 확인 |
| T1021.004 | Remote Services: SSH | 배포 키를 이용한 App 서버 이동 여부 확인 |

## 3. 먼저 확인할 로그

| 환경 | 대표 로그 | 핵심 필드 |
| --- | --- | --- |
| Jenkins | access log, audit log, controller log | user, source IP, request path, user agent, status |
| Jenkins Job | build log, job config, workspace access | job name, build id, trigger user, command, artifact |
| Host / Linux | auth.log, auditd, shell history 후보 | user, source IP, command, file path |
| Secret Store | credential access audit | credential id, accessor, time, action |
| Network | SSH, proxy, firewall log | source, destination, port, user, action |

## 4. 빠른 KQL

### Jenkins CLI/API 접근

```text
url.path: ("*/jnlpJars/jenkins-cli.jar" or "*/cli*" or "*/api/json*") and source.ip: *
```

### Job/Workspace 조회 후보

```text
url.path: ("*/job/*" or "*/workspace*" or "*/config.xml*" or "*/credential*")
```

### 배포 키 기반 SSH 이동 후보

```text
message: "Accepted publickey" and user.name: ("deploy" or "jenkins" or "app")
```

## 5. 분석자가 할 일

1. Jenkins 접근 주체와 source IP를 고정한다.
2. API Token 또는 CLI 사용 여부를 확인한다.
3. 조회한 Job, workspace, credential metadata, build log를 정리한다.
4. CI/CD 접근 직후 SSH, DB 접근, 파일 접근이 이어졌는지 Pivot한다.
5. 해당 계정의 정상 개발/배포 작업 시간대와 비교한다.

## 6. 판단 기준

| 구분 | 확인 기준 |
| --- | --- |
| 의심 | 개발자 단말 외 source에서 API Token 또는 CLI 사용 |
| 의심 | credential, workspace, config, build log를 짧은 시간에 대량 조회 |
| 의심 | CI/CD 조회 직후 App 서버 SSH 접속 또는 DB credential 접근 |
| 정상 가능성 | 승인된 배포, 장애 대응, 정기 Job 실행과 일치 |

## 7. LLM Prompt Template

```text
너는 SIEM에 연결된 침해사고 분석 보조자다.
다음 조건으로 "CI/CD 서버 정찰 및 Credential 악용" 정황을 조사하라.

입력:
- 시간 범위:
- Jenkins/CI 서버:
- 의심 계정 또는 token:
- 의심 source IP:
- 관측된 단서:

요청:
1. Jenkins access/audit/controller/build 로그를 조회하라.
2. 접근 계정, API/CLI 사용 여부, 조회한 Job/Workspace/Credential 단서를 요약하라.
3. 정상 배포 가능성과 credential 악용 가능성을 구분하라.
4. App 서버 SSH, DB 접근, 파일 접근으로 이어진 Pivot을 확인하라.
5. 초동 대응 조치를 작성하라.

출력 형식:
- 관측된 사실
- 타임라인
- 접근 주체
- 조회 대상
- 의심 근거
- 추가 Pivot
- 대응 조치
```

## 8. 대응 요약

- Jenkins 로그, build log, credential 접근 기록을 보존한다.
- 의심 API Token, SSH key, 배포 credential을 회전한다.
- 해당 계정의 권한과 최근 Job 실행 이력을 검토한다.
- 동일 token/source IP로 전체 CI/CD 로그를 확장 검색한다.
