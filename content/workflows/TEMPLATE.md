---
id: WF-EXAMPLE-001
name: "Workflow Name"
description: "이 Workflow가 필요한 상황을 한 문장으로 작성한다."
techniques: "T0000, T0000.000"
---

# WF-EXAMPLE-001 Workflow Name

이 Workflow는 어떤 행위가 관측됐을 때 사용하는지 짧게 설명한다.
분석자가 이 문서를 열었을 때 바로 판단할 수 있도록, 행위 의미와 확인해야 할 로그를 먼저 적는다.

| Field | Value |
| --- | --- |
| 분석 대상 행위 | 예: 내부망 원격 접속, 내부망 스캔, credential 접근 |
| 관련 캠페인 | 예: SB-01, SB-03 |
| 분석 결과물 | 예: 주체, 대상, 정상 여부, 후속 Pivot |

## 1. 행위 정의

공격자가 어떤 목적으로 이 행위를 수행하는지 설명한다.
단일 이벤트만 보지 않고 함께 봐야 할 조건도 적는다.

## 2. 관련 Technique

| Technique | Name | 확인 관점 |
| --- | --- | --- |
| T0000 | Technique Name | 이 Workflow에서 이 Technique을 어떤 관점으로 볼지 작성 |

## 3. 먼저 확인할 로그

| 환경 | 대표 로그 | 핵심 필드 |
| --- | --- | --- |
| Windows | Security, PowerShell, Sysmon | `winlog.event_id`, `user.name`, `process.command_line` |
| Linux | auth.log, syslog, auditd | `@timestamp`, `host.name`, `user.name`, `source.ip`, `message` |
| Network | VPC Flow Logs, Firewall | `source.ip`, `destination.ip`, `destination.port`, `action` |

## 4. 빠른 KQL

### 쿼리 목적

```text
campaign.id: "SB-XX" and field.name: "value"
```

## 5. 분석자가 할 일

1. 출발지와 주체를 고정한다.
2. 대상 시스템과 시간 범위를 고정한다.
3. 정상 작업 가능성을 확인한다.
4. 후속 행위로 Pivot한다.

## 6. LLM Prompt Template

```text
너는 ELK, Splunk 등 SIEM에 연결된 침해사고 분석 보조자다.
다음 조건으로 "[분석 대상 행위]" 의심 정황을 조사하라.
반드시 조회한 로그 근거를 기반으로 판단하고, 확인되지 않은 내용은 추정이라고 표시하라.

입력:
- 시간 범위:
- 캠페인/환경:
- 의심 출발지 또는 계정:
- 의심 대상 서버:
- 관측된 단서:

요청:
1. 관련 로그를 조회하라.
2. 관측된 사실을 요약하라.
3. 정상 가능성과 의심 근거를 구분하라.
4. 추가 Pivot을 제안하라.
5. 초동 대응 조치를 작성하라.

출력 형식:
- 관측된 사실
- 타임라인
- 의심 근거
- 정상 가능성
- 추가 Pivot
- 대응 조치
```

## 7. 대응 요약

- 원본 로그와 관련 산출물을 보존한다.
- 사용 계정과 출발지의 정상 사용 범위를 확인한다.
- 비정상으로 판단되면 계정, 토큰, 키, 접속 경로를 통제한다.
- 동일 계정, 동일 source IP, 동일 명령 패턴으로 전체 로그를 확장 검색한다.
