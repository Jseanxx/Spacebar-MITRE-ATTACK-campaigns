---
id: WF-CLOUD-001
name: "클라우드 메타데이터 및 임시 자격 증명 악용"
description: "IMDS, STS, Instance Profile, AWS CLI, Secrets Manager, S3 등 클라우드 임시 자격 증명 악용 정황을 분석한다."
techniques: "T1552.005, T1078.004, T1528, T1530, T1567.002"
---

# WF-CLOUD-001 클라우드 메타데이터 및 임시 자격 증명 악용

노드, 컨테이너, 서버에서 클라우드 메타데이터 서비스나 임시 자격 증명을 이용해 AWS API, Secret, S3에 접근한 정황을 분석하는 Workflow다.
IMDS 접근, STS 검증, Secrets Manager 조회, S3 업로드/다운로드를 하나의 흐름으로 확인한다.

| Field | Value |
| --- | --- |
| 분석 대상 행위 | IMDS 접근, Instance Profile credential 획득, STS 검증, Secrets Manager/S3 접근 |
| 관련 캠페인 | SB-04, SB-05 |
| 분석 결과물 | 사용된 role, API 호출 주체, 접근 secret/bucket, 데이터 이동 여부 |

## 1. 행위 정의

공격자가 서버나 K8s 노드에서 메타데이터 서비스를 통해 임시 자격 증명을 얻고, 이를 이용해 클라우드 API를 호출하는 행위다.
CloudTrail만 보지 않고 credential이 획득된 호스트/파드와 API 호출 source를 연결해야 한다.

## 2. 관련 Technique

| Technique | Name | 확인 관점 |
| --- | --- | --- |
| T1552.005 | Cloud Instance Metadata API | IMDS 접근과 role credential 획득 여부 확인 |
| T1078.004 | Cloud Accounts | 임시 cloud credential의 비정상 사용 확인 |
| T1528 | Steal Application Access Token | token/temporary credential 수집 확인 |
| T1530 | Data from Cloud Storage | S3/object storage 접근 확인 |
| T1567.002 | Exfiltration to Cloud Storage | 외부/비정상 bucket 업로드 확인 |

## 3. 먼저 확인할 로그

| 환경 | 대표 로그 | 핵심 필드 |
| --- | --- | --- |
| AWS | CloudTrail | eventName, userIdentity, sourceIPAddress, userAgent, requestParameters |
| Host / Node | EDR network, proxy, iptables 후보 | destination, URL, process, command_line |
| Kubernetes | API audit, pod/node mapping | pod, node, serviceAccount, source IP |
| Secrets | Secrets Manager API log | secretId, GetSecretValue, caller role |
| Storage | S3 data event, server access log | bucket, key, PutObject, GetObject, source |

## 4. 빠른 KQL

### STS/Role 확인

```text
event.provider: "sts.amazonaws.com" and event.action: ("GetCallerIdentity" or "AssumeRole")
```

### Secret 조회

```text
event.provider: "secretsmanager.amazonaws.com" and event.action: ("GetSecretValue" or "ListSecrets")
```

### S3 업로드/다운로드

```text
event.provider: "s3.amazonaws.com" and event.action: ("PutObject" or "GetObject" or "ListBucket")
```

## 5. 분석자가 할 일

1. CloudTrail에서 사용된 role, source IP, userAgent를 고정한다.
2. 해당 source가 어떤 노드/파드/서버인지 매핑한다.
3. STS, Secrets Manager, RDS, S3 접근 순서를 타임라인화한다.
4. 정상 애플리케이션 호출인지 공격자 수동 호출인지 userAgent와 시간대로 구분한다.
5. Secret 조회 이후 DB 접근 또는 S3 업로드가 이어졌는지 Pivot한다.

## 6. 판단 기준

본 판단 기준은 MITRE ATT&CK 기법의 Detection Strategy/Data Sources 관점과 CISA Incident Response Playbook의 Detection & Analysis 절차를 함께 적용한다.  
단일 이벤트만으로 확정하지 않고, 로그 보존, 이벤트 상관분석, 타임라인 작성, 정상 활동과의 deconfliction, ATT&CK TTP 매핑을 통해 판단한다.

| 구분 | 확인 기준 | 근거 |
| --- | --- | --- |
| 의심 | 서버/파드에서 예상치 못한 STS GetCallerIdentity 또는 AWS CLI userAgent | MITRE ATT&CK `T1552.005`, `T1078.004`, `T1528`, `T1530`, CISA Detection & Analysis 기준 |
| 의심 | 애플리케이션 역할이 평소 접근하지 않던 Secret/Bucket 조회 | MITRE ATT&CK `T1552.005`, `T1078.004`, `T1528`, `T1530`, CISA Detection & Analysis 기준 |
| 의심 | Secret 조회 직후 DB 접근 또는 외부 bucket 업로드 | MITRE ATT&CK `T1552.005`, `T1078.004`, `T1528`, `T1530`, CISA Detection & Analysis 기준 |
| 정상 가능성 | 애플리케이션 정규 기능, 백업, 배포, 운영 자동화와 일치 | CISA authorized activity deconfliction, 조직 baseline 및 승인 작업 확인 |

## 7. LLM Prompt Template

```text
너는 SIEM에 연결된 침해사고 분석 보조자다.
다음 조건으로 "클라우드 메타데이터 및 임시 자격 증명 악용" 정황을 조사하라.

입력:
- 시간 범위:
- 의심 role 또는 access key:
- 의심 source IP/host/pod:
- 관측된 API:
- 관측된 단서:

요청:
1. CloudTrail, host/network, K8s, S3, Secrets Manager 로그를 조회하라.
2. 사용된 role, API 호출, source, userAgent를 요약하라.
3. 정상 애플리케이션 호출과 공격자 호출 가능성을 구분하라.
4. Secret 조회, DB 접근, S3 업로드 Pivot을 확인하라.
5. 초동 대응 조치를 작성하라.

출력 형식:
- 관측된 사실
- API 타임라인
- 사용 credential/role
- 의심 근거
- 추가 Pivot
- 대응 조치
```

## 8. 대응 요약

- CloudTrail 원본 이벤트와 관련 host/pod 매핑 정보를 보존한다.
- 노출 가능 role의 세션 차단, 권한 축소, secret 회전을 검토한다.
- S3/Secrets/RDS 접근 로그를 전체 기간으로 확장 검색한다.
- IMDSv2 강제, 최소 권한, pod identity 분리를 점검한다.

## 9. 근거자료

- CISA, [Cybersecurity Incident & Vulnerability Response Playbooks](C:/Users/iregr/Downloads/Federal_Government_Cybersecurity_Incident_and_Vulnerability_Response_Playbooks_508C.pdf) - Detection & Analysis 단계의 로그 보존, 이벤트 상관분석, 타임라인 작성, 정상 활동 deconfliction 기준을 판단 근거로 사용한다.
- MITRE ATT&CK, [Detection Strategies](https://attack.mitre.org/detectionstrategies/) - 기법별 탐지 전략과 데이터 소스 관점을 판단 기준에 반영한다.
- MITRE ATT&CK, [T1078](https://attack.mitre.org/techniques/T1078/)
