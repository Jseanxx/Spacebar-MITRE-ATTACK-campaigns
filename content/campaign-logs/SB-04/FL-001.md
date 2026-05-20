---
id: LOG-ID
name: "Log Name"
description: "이 로그가 어떤 행위를 확인하는지 한 문장으로 작성합니다."
techniques: "TXXXX,TYYYY"
---

# LOG-ID Log Name

| Field | Value |
| --- | --- |
| Log ID | LOG-ID |
| Source | 서버 또는 서비스 이름 |
| Representative Path | `/path/to/log` 또는 CloudWatch 로그 그룹 |
| Collection | Filebeat, auditd, CloudWatch 등 수집 방식 |
| Primary Use | 이 로그로 확인하려는 핵심 행위 |

## 공격 행위 요약

이 로그가 캠페인 안에서 어떤 공격 행위를 설명하는지 2~4문장으로 작성합니다.

## 로그 발생 위치

| 구분 | 위치 | 설명 |
| --- | --- | --- |
| 예: App 서버 | `/var/log/example.log` | 어떤 이벤트가 남는지 작성 |

## 수집 방식

| 구분 | 방식 |
| --- | --- |
| 예: App 서버 | Filebeat custom input으로 로그 파일 수집 |

## 실제 관측 로그 예시

```text
실제 실습 환경에서 확인한 로그 1~3줄을 넣습니다.
민감한 토큰, 비밀번호, 실제 개인정보는 제거합니다.
```

## 주요 필드

| 필드 | 의미 | 예시 |
| --- | --- | --- |
| `@timestamp` | 이벤트 발생 시간 | `2026-05-16T19:41:44Z` |
| `source.ip` | 출발지 IP | `10.0.0.10` |
| `user.name` | 행위 계정 | `deploy` |
| `message` | 원본 로그 | `원본 로그 일부` |

## 커버하는 Techniques Used

| Technique | Mapping Reason |
| --- | --- |
| [TXXXX Technique Name](https://attack.mitre.org/techniques/TXXXX/) | 이 로그가 해당 Technique을 어떻게 설명하거나 검증하는지 작성 |

## 탐지 포인트

1. 정상 행위와 비교했을 때 이상한 계정, 시간대, 출발지, 대상인지 확인한다.
2. 같은 시간대의 다른 로그와 연결해 공격 흐름이 이어지는지 확인한다.
