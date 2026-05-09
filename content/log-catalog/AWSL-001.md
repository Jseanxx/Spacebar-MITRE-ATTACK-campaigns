---
id: AWSL-001
name: "AWS VPC Flow Log"
description: "AWS VPC 네트워크 흐름에서 외부 전송과 서버 간 통신을 확인하는 로그."
techniques: "T1048.002,T1021.004"
---

# AWSL-001 AWS VPC Flow Log

| Field | Value |
| --- | --- |
| Log ID | AWSL-001 |
| Source | AWS VPC |
| Representative Path | CloudWatch Logs 또는 S3 export |
| Collection | AWS integration, CloudWatch export, 또는 별도 수집 파이프라인 |
| Primary Use | 서버 간 통신, 외부 egress, 전송량, 허용/거부 흐름 확인 |

## Log Structure

VPC Flow Log는 네트워크 패킷 내용을 보여주지 않는다. 대신 source/destination IP, port, protocol, packet/byte count, action, 시간 범위를 제공한다. 따라서 데이터 내용 분석보다는 통신 방향, 전송량, 시간대, 허용/거부 여부를 보는 데 적합하다.

## Important Fields

| Field | Meaning |
| --- | --- |
| `srcaddr` | 출발지 IP |
| `dstaddr` | 목적지 IP |
| `srcport` | 출발지 포트 |
| `dstport` | 목적지 포트 |
| `protocol` | TCP/UDP 등 프로토콜 |
| `bytes` | 전송 바이트 수 |
| `action` | ACCEPT 또는 REJECT |

## Mapped Techniques

| Technique | Mapping Reason |
| --- | --- |
| T1048.002 Exfiltration Over Asymmetric Encrypted Non-C2 Protocol | HTTPS/SSH 기반 외부 전송 흐름 확인 |
| T1021.004 Remote Services: SSH | Jenkins/App 간 SSH 통신 흐름 보조 확인 |

## KQL Draft

```text
aws.vpcflow.action: "ACCEPT" and destination.port: (22 or 443) and network.bytes > 1000000
```

## Investigation Pivot

서버의 private IP와 외부 destination IP를 기준으로 App 서버 staging 로그, archive 생성 흔적, SSH/HTTPS 연결 시각을 연결한다.
