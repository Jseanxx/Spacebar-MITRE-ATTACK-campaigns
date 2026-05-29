---
id: WF-EXFIL-001
name: "외부 전송 및 클라우드 저장소 유출"
description: "HTTPS POST, SSH 채널, S3 업로드, 외부 웹 수신지 등으로 데이터가 유출된 정황을 분석한다."
techniques: "T1041, T1048, T1048.002, T1567.002, T1105"
---

# WF-EXFIL-001 외부 전송 및 클라우드 저장소 유출

수집·압축된 데이터가 외부 인프라, 웹 수신지, SSH/HTTPS 채널, S3 bucket으로 전송된 정황을 분석하는 Workflow다.
전송 이벤트만 보지 않고 직전 데이터 수집/staging과 전송량, 대상, 프로세스를 함께 확인한다.

| Field | Value |
| --- | --- |
| 분석 대상 행위 | HTTPS POST, SSH 기반 전송, S3 업로드, 외부 웹 수신지, 대량 outbound |
| 관련 캠페인 | SB-01, SB-03, SB-04, SB-05, SB-06 |
| 분석 결과물 | 전송 주체, 전송 대상, 파일/데이터 후보, 바이트 수, 차단/통지 필요성 |

## 1. 행위 정의

공격자가 수집한 데이터를 외부 C2, 웹 서버, 클라우드 저장소로 전송하는 행위다.
네트워크 로그의 destination과 bytes뿐 아니라 어떤 프로세스가 어떤 파일을 전송했는지, 직전 archive 생성이 있었는지를 연결해야 한다.

## 2. 관련 Technique

| Technique | Name | 확인 관점 |
| --- | --- | --- |
| T1041 | Exfiltration Over C2 Channel | 공격자 서버로 직접 전송 여부 확인 |
| T1048 | Exfiltration Over Alternative Protocol | HTTP/SSH 등 대체 채널 사용 확인 |
| T1048.002 | Exfiltration Over Asymmetric Encrypted Non-C2 Protocol | HTTPS/SSH 기반 유출 확인 |
| T1567.002 | Exfiltration to Cloud Storage | S3 등 클라우드 저장소 업로드 확인 |
| T1105 | Ingress Tool Transfer | 같은 도구로 payload 다운로드/데이터 업로드 여부 확인 |

## 3. 먼저 확인할 로그

| 환경 | 대표 로그 | 핵심 필드 |
| --- | --- | --- |
| Proxy / Firewall | outbound HTTP/HTTPS, SSH logs | source, destination, URL, bytes, action |
| Cloud Storage | S3 data events, bucket access log | PutObject, bucket, key, source, bytes |
| Endpoint/Server | Sysmon 1/3, EDR network | process, command_line, destination, file path |
| Web/App | app log, curl/wget/python requests | user agent, URL, status, body size |
| DLP / CASB | DLP alert, upload event | user, file, destination, policy |

## 4. 빠른 KQL

### HTTP POST 유출 후보

```text
http.request.method: "POST" and destination.ip: * and network.bytes: >1000000
```

### curl/wget/python 업로드 후보

```text
process.command_line: ("*curl*" or "*Invoke-WebRequest*" or "*python*" or "*aws s3 cp*" or "*scp*")
```

### S3 업로드

```text
event.provider: "s3.amazonaws.com" and event.action: "PutObject"
```

## 5. 분석자가 할 일

1. 전송 source, destination, protocol, bytes, process를 고정한다.
2. destination이 승인된 서비스인지 외부/비정상 인프라인지 확인한다.
3. 전송 직전 staging/archive 생성 또는 민감 데이터 접근을 Pivot한다.
4. 동일 destination, user agent, process로 전체 로그를 확장 검색한다.
5. 실제 유출 데이터 후보와 민감도를 산정한다.

## 6. 판단 기준

| 구분 | 확인 기준 |
| --- | --- |
| 의심 | 임시 archive 생성 직후 외부 HTTP POST/SSH/S3 업로드 |
| 의심 | 서버/파드에서 평소 없던 대량 outbound 또는 AWS CLI PutObject |
| 의심 | 외부 웹 수신지, 개인/비승인 cloud bucket으로 전송 |
| 정상 가능성 | 승인된 백업, 로그 전송, 배포 artifact 업로드와 일치 |

## 7. LLM Prompt Template

```text
너는 SIEM에 연결된 침해사고 분석 보조자다.
다음 조건으로 "외부 전송 및 클라우드 저장소 유출" 정황을 조사하라.

입력:
- 시간 범위:
- 의심 source host/pod:
- 의심 destination:
- 의심 파일/archive:
- 관측된 단서:

요청:
1. proxy/firewall/EDR/S3/DLP 로그를 조회하라.
2. 전송 source, destination, protocol, bytes, process를 요약하라.
3. 정상 전송 가능성과 데이터 유출 가능성을 구분하라.
4. 직전 데이터 접근/staging/archive 생성 Pivot을 확인하라.
5. 차단, 보존, 통지 검토 조치를 작성하라.

출력 형식:
- 관측된 사실
- 전송 타임라인
- 유출 데이터 후보
- 의심 근거
- 추가 Pivot
- 대응 조치
```

## 8. 대응 요약

- 네트워크 원본 로그, destination 정보, 전송 프로세스를 보존한다.
- 진행 중인 유출이면 egress 차단과 호스트/계정 격리를 수행한다.
- 전송된 파일 후보와 민감도, 개인정보 포함 여부를 확인한다.
- 동일 destination과 동일 archive/hash로 과거 로그를 확장 검색한다.
