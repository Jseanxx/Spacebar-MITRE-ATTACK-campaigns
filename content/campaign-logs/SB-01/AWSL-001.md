---
id: AWSL-001
name: "AWS VPC Flow Log"
description: "SB-01 VPC 네트워크 흐름에서 App 서버의 외부 전송 정황과 서버 간 통신을 확인하는 로그."
techniques: "T1048.002,T1021.004"
---

# AWSL-001 AWS VPC Flow Log

| Field | Value |
| --- | --- |
| Log ID | AWSL-001 |
| Source | AWS VPC `vpc-027c43d14ecc78c52` |
| Representative Path | CloudWatch Logs `/aws/vpc/flowlogs/sb01` |
| Collection | VPC Flow Logs -> CloudWatch Logs |
| Primary Use | App 서버 outbound 전송 정황, Jenkins/App/DB/ELK 간 통신, REJECT 스캔성 트래픽 확인 |

## 공격 행위 요약

SB-01에서 공격자는 App 서버에서 고객 예약 데이터를 archive로 묶은 뒤 SSH 또는 HTTPS 기반 채널로 외부 인프라에 전송하려 한다. VPC Flow Log는 전송 파일명이나 HTTP 내용을 보여주지는 않지만, App 서버가 어느 외부 IP와 어떤 포트로 얼마나 많은 바이트를 주고받았는지 확인할 수 있다.

## 로그 발생 위치

| 구분 | 위치 | 설명 |
| --- | --- | --- |
| CloudWatch Logs | `/aws/vpc/flowlogs/sb01` | VPC Flow Log가 적재되는 로그 그룹 |
| VPC | `vpc-027c43d14ecc78c52` | SB-01 Jenkins/App/DB/ELK가 위치한 VPC |
| Flow Log | `fl-0b529a6d7a03c3b34` | VPC 단위 Flow Log |
| Traffic Type | `ALL` | ACCEPT/REJECT 흐름 모두 수집 |
| Aggregation Interval | `60 seconds` | 1분 단위로 flow 집계 |
| App ENI | `eni-06aca8e8d42592a24` | `sb01-app`, private IP `172.31.4.70` |

## 수집 방식

| 구분 | 방식 |
| --- | --- |
| AWS | VPC Flow Logs를 VPC 단위로 생성 |
| Destination | CloudWatch Logs로 전송 |
| Filter | `ALL`로 설정해 ACCEPT/REJECT 흐름 모두 수집 |
| 분석 위치 | 1차 확인은 CloudWatch Logs Insights, 최종 상관분석은 ELK 연동 후보 |

VPC Flow Log는 현재 CloudWatch Logs에서 먼저 확인한다. ELK까지 통합하려면 이후 AWS integration, CloudWatch Logs subscription, Firehose, Lambda forwarder 중 하나로 Elasticsearch에 전송하면 된다.

## 실제 관측 로그 예시

```text
2 142636331738 eni-06aca8e8d42592a24 172.31.4.70 93.184.216.34 45620 443 6 12 15240 1778958200 1778958260 ACCEPT OK
```

기본 형식 순서:

```text
version account-id interface-id srcaddr dstaddr srcport dstport protocol packets bytes start end action log-status
```

### 관측 예시: App HTTPS 대용량 outbound

```text
2026-05-16T19:16:53.000Z
2 142636331738 eni-06aca8e8d42592a24 172.31.4.70 13.216.7.132 49478 443 6 1117 1110487 1778959434 1778959463 ACCEPT OK
```

| 필드 | 값 | 해석 |
| --- | --- | --- |
| `interface-id` | `eni-06aca8e8d42592a24` | App 서버 ENI |
| `srcaddr` | `172.31.4.70` | App 서버 private IP |
| `dstaddr` | `13.216.7.132` | 외부 목적지 IP |
| `dstport` | `443` | HTTPS |
| `protocol` | `6` | TCP |
| `packets` / `bytes` | `1117` / `1110487` | App 서버에서 외부로 약 1.1MB 전송 |
| `action` | `ACCEPT` | Security Group/NACL에서 허용된 outbound flow |

이 예시는 안전한 테스트용 HTTPS POST로 만든 outbound flow다. 실제 T1048.002 판단에서는 이 네트워크 흐름만 단독으로 보지 않고, 같은 시간대 `LL-002`에서 archive 생성, `scp`, `curl` 실행이 있었는지 함께 확인한다.

### 참고 예시: 외부 FTP 스캔 차단

```text
2026-05-16T19:16:53.000Z
2 142636331738 eni-06aca8e8d42592a24 49.71.226.71 172.31.4.70 48509 21 6 1 40 1778959013 1778959039 REJECT OK
```

이 예시는 T1048.002 유출 증거가 아니라, public subnet에 놓인 EC2가 외부 스캔을 받는다는 네트워크 노출 정황이다.

## 주요 필드

| 필드 | 의미 | 예시 |
| --- | --- | --- |
| `interface-id` | 트래픽이 관측된 ENI | `eni-06aca8e8d42592a24` |
| `srcaddr` | 출발지 IP | `172.31.4.70` |
| `dstaddr` | 목적지 IP | `13.216.7.132` |
| `srcport` | 출발지 포트 | `49478` |
| `dstport` | 목적지 포트 | `443` |
| `protocol` | 프로토콜 번호. TCP는 `6` | `6` |
| `packets` | 패킷 수 | `1117` |
| `bytes` | 전송 바이트 수 | `1110487` |
| `action` | Security Group/NACL 처리 결과 | `ACCEPT` |
| `log-status` | Flow Log 기록 상태 | `OK` |

## 커버하는 Techniques Used

| Technique | Mapping Reason |
| --- | --- |
| [T1048.002 Exfiltration Over Asymmetric Encrypted Non-C2 Protocol](https://attack.mitre.org/techniques/T1048/002/) | App 서버에서 외부 IP의 22/443 포트로 발생한 outbound 전송량과 시간대를 확인한다. |
| [T1021.004 Remote Services: SSH](https://attack.mitre.org/techniques/T1021/004/) | Jenkins private IP에서 App private IP로 발생한 SSH 흐름을 `LL-001`의 SSH 인증 로그와 함께 확인한다. |

## 탐지 포인트

| Technique | 관찰할 행위 | 주요 필드 |
| --- | --- | --- |
| T1048.002 Exfiltration Over Alternative Protocol | App 서버 `172.31.4.70`이 외부 IP의 22 또는 443 포트로 평소보다 큰 outbound traffic을 발생시킨다. `LL-002`의 archive 생성, `scp`, `curl` 실행 직후 발생하면 우선순위가 높다. | `srcaddr`, `dstaddr`, `dstport`, `bytes`, `action`, `start`, `end` |
| T1021.004 Remote Services: SSH | Jenkins `172.31.13.239`에서 App `172.31.4.70`의 22 포트로 접속 흐름이 발생한다. 단독으로는 정상 배포일 수 있으므로 `LL-001`의 계정/시간대와 함께 본다. | `srcaddr`, `dstaddr`, `dstport`, `action` |
