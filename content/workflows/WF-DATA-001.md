---
id: WF-DATA-001
name: "민감 데이터 접근 및 수집"
description: "DB, RDS, 파일 서버, SaaS/문서 서버, Kubernetes Secret 등 민감 데이터에 접근하고 수집한 정황을 분석한다."
techniques: "T1213, T1005, T1530, T1552, T1039"
---

# WF-DATA-001 민감 데이터 접근 및 수집

공격자가 수집한 credential을 이용해 DB, RDS, 파일 서버, 문서 서버, Secret, 고객 데이터에 접근한 정황을 분석하는 Workflow다.
접근 성공 여부뿐 아니라 조회량, 대상 테이블/파일, 평소 사용 패턴, 이후 staging 여부를 함께 확인한다.

| Field | Value |
| --- | --- |
| 분석 대상 행위 | DB 조회, RDS 접근, 파일 서버 자료 수집, Secret/문서/고객 데이터 접근 |
| 관련 캠페인 | SB-01, SB-03, SB-04, SB-05, SB-06 |
| 분석 결과물 | 접근 주체, 대상 데이터, 조회량, 민감도, 유출 전 단계 여부 |

## 1. 행위 정의

공격자가 내부 이동 후 가치 있는 데이터를 찾고 수집하는 행위다.
인증 성공만 보지 말고 어떤 테이블, 파일, secret, bucket에 접근했는지와 평소 업무 패턴에서 벗어났는지를 확인해야 한다.

## 2. 관련 Technique

| Technique | Name | 확인 관점 |
| --- | --- | --- |
| T1213 | Data from Information Repositories | CI/CD, 문서, repository 정보 접근 확인 |
| T1005 | Data from Local System | 서버 로컬 파일과 임시 경로 자료 수집 확인 |
| T1530 | Data from Cloud Storage | S3/object storage 접근 확인 |
| T1552 | Unsecured Credentials | 데이터 접근을 위한 credential 수집 확인 |
| T1039 | Data from Network Shared Drive | 파일 서버/공유 폴더 데이터 접근 확인 |

## 3. 먼저 확인할 로그

| 환경 | 대표 로그 | 핵심 필드 |
| --- | --- | --- |
| DB / RDS | query audit, connection log | user, source, database, table, query, row count |
| File Server | Windows file access, SMB logs | user, path, action, client IP |
| Cloud Storage | S3 data events, object access log | bucket, key, action, source, bytes |
| Application | app audit log, document server log | user, object, action, status |
| Endpoint/Server | Sysmon 11, file read/create 후보 | file.path, process, user |

## 4. 빠른 KQL

### DB 접근 후보

```text
event.category: "database" and event.action: ("connect" or "select" or "query") and user.name: *
```

### 민감 파일 접근 후보

```text
file.path: ("*customer*" or "*reservation*" or "*payment*" or "*secret*" or "*.csv" or "*.sql" or "*.dump")
```

### S3/Object 접근

```text
event.provider: "s3.amazonaws.com" and event.action: ("GetObject" or "ListBucket")
```

## 5. 분석자가 할 일

1. 접근 주체, source, 대상 데이터 저장소를 고정한다.
2. 조회한 테이블/파일/객체와 데이터 민감도를 분류한다.
3. 조회량과 시간대가 평소 패턴과 다른지 확인한다.
4. 데이터 접근 전 credential 수집과 접근 후 staging/압축/유출을 Pivot한다.
5. 개인정보/고객정보 포함 가능성을 판단해 통지 절차 필요성을 검토한다.

## 6. 판단 기준

| 구분 | 확인 기준 |
| --- | --- |
| 의심 | 업무 계정이 평소 접근하지 않던 DB/파일/secret 대량 조회 |
| 의심 | credential 접근 직후 민감 데이터 조회 |
| 의심 | 조회 직후 임시 경로 staging, archive 생성, 외부 전송 |
| 정상 가능성 | 승인된 리포트, 백업, 데이터 이관, 운영 점검과 일치 |

## 7. LLM Prompt Template

```text
너는 SIEM에 연결된 침해사고 분석 보조자다.
다음 조건으로 "민감 데이터 접근 및 수집" 정황을 조사하라.

입력:
- 시간 범위:
- 의심 계정/source:
- 대상 DB/파일 서버/bucket:
- 의심 테이블/파일:
- 관측된 단서:

요청:
1. DB, 파일 서버, S3, app audit, endpoint 로그를 조회하라.
2. 접근 주체, 대상 데이터, 조회량, 민감도를 요약하라.
3. 정상 업무 가능성과 비정상 수집 가능성을 구분하라.
4. credential 접근 전후와 staging/exfil Pivot을 확인하라.
5. 초동 대응 조치를 작성하라.

출력 형식:
- 관측된 사실
- 접근 데이터
- 영향 범위
- 의심 근거
- 추가 Pivot
- 대응 조치
```

## 8. 대응 요약

- DB query log, 파일 접근 로그, object access log를 보존한다.
- 의심 계정과 credential을 통제하고 접근 권한을 재검토한다.
- 조회 데이터의 민감도와 개인정보 포함 여부를 확인한다.
- staging, archive, 외부 전송 로그로 즉시 Pivot한다.
