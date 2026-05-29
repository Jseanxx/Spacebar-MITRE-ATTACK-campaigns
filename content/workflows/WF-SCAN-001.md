---
id: WF-SCAN-001
name: "내부망 스캔 의심 대응"
description: "짧은 시간 동안 여러 내부 IP 또는 여러 포트로 연결을 시도한 정찰 행위를 분석한다."
techniques: "T1046, T1018, T1592, T1059"
---

# WF-SCAN-001 내부망 스캔 의심 대응

내부망에서 짧은 시간 동안 여러 IP 또는 여러 포트로 연결을 시도한 정황이 보였을 때 사용하는 행위 기반 IR Workflow다.
분석자는 이 문서로 스캔 행위의 의미, 우선 확인 로그, 판단 기준, AI 분석 보조자에게 줄 프롬프트를 빠르게 확인한다.

| Field | Value |
| --- | --- |
| 분석 대상 행위 | 내부 IP/포트 스캔, 서비스 배너 확인, 짧은 시간 다수 연결 시도 |
| 관련 캠페인 | SB-01, SB-03, 내부망 침투 캠페인 공통 |
| 분석 결과물 | 스캔 주체, 대상 대역, 대상 포트, 정상 점검 여부, 후속 침투 후보 |

## 1. 행위 정의

공격자가 내부망에 진입한 뒤 다음 이동 대상을 찾기 위해 IP 대역, 포트, 서비스 응답을 탐색하는 행위다.
단일 연결 실패가 아니라 같은 출발지에서 짧은 시간 동안 여러 대상 또는 여러 포트로 반복 연결이 발생하는지를 본다.

## 2. 관련 Technique

| Technique | Name | 확인 관점 |
| --- | --- | --- |
| T1046 | Network Service Discovery | 대상 포트와 서비스 탐색 여부 확인 |
| T1018 | Remote System Discovery | 내부 시스템 목록화 여부 확인 |
| T1592 | Gather Victim Host Information | 호스트와 서비스 정보 수집 여부 확인 |
| T1059 | Command and Scripting Interpreter | nmap, curl, nc, PowerShell 기반 탐색 명령 확인 |

## 3. 먼저 확인할 로그

| 환경 | 대표 로그 | 핵심 필드 |
| --- | --- | --- |
| AWS / Network | VPC Flow Logs | `srcaddr`, `dstaddr`, `dstport`, `action`, `start`, `end` |
| Linux | Syslog, auditd, shell history 후보 | `process.name`, `process.command_line`, `user.name`, `source.ip` |
| Windows | Sysmon Event ID 1, 3 / PowerShell 4104 | `process.command_line`, `destination.ip`, `destination.port`, `ScriptBlockText` |
| Firewall / EDR | Connection allowed/blocked, port scan alert | source, destination, port, verdict, rule name |

## 4. 빠른 KQL

### 스캔 도구 실행 후보

```text
process.command_line: ("nmap" or "masscan" or "Test-NetConnection" or "nc " or "curl ")
```

### Windows PowerShell 스캔 후보

```text
winlog.event_id: 4104 and winlog.event_data.ScriptBlockText: ("Test-NetConnection" or "TcpClient" or "port" or "foreach")
```

### Sysmon 네트워크 연결

```text
winlog.provider_name: "Microsoft-Windows-Sysmon" and winlog.event_id: 3 and destination.port: *
```

## 5. 분석자가 할 일

1. 같은 source IP/host에서 반복 연결이 발생했는지 확인한다.
2. 다수 IP 대상인지, 단일 서버의 다수 포트 대상인지 구분한다.
3. 취약점 점검, 모니터링, BAS 실행 시간대와 겹치는지 확인한다.
4. 스캔 직후 인증 시도, 원격 접속, 파일 전송이 이어졌는지 본다.

## 6. 판단 기준

| 구분 | 확인 기준 |
| --- | --- |
| 의심 | 같은 출발지에서 짧은 시간 내 다수 IP 또는 다수 포트로 연결 시도 |
| 의심 | 스캔 직후 인증 시도, WinRM/SSH/RDP 접속, 파일 전송, credential 접근이 이어짐 |
| 정상 가능성 | 승인된 취약점 점검, 모니터링, 자산 스캐너, BAS 실행 시간대와 일치 |

## 7. LLM Prompt Template

```text
너는 ELK, Splunk 등 SIEM에 연결된 침해사고 분석 보조자다.
다음 조건으로 "내부망 스캔 또는 서비스 탐색" 의심 정황을 조사하라.
반드시 조회한 로그 근거를 기반으로 판단하고, 확인되지 않은 내용은 추정이라고 표시하라.

입력:
- 시간 범위:
- 의심 출발지:
- 대상 대역 또는 대상 서버:
- 의심 포트:
- 관측된 단서:

요청:
1. 관련 네트워크/호스트 로그를 조회하라.
   - VPC Flow Logs 또는 방화벽 로그
   - Sysmon Network Event ID 3
   - PowerShell 4104
   - Linux process/audit 로그
2. 같은 출발지에서 접근한 대상 IP 수, 대상 포트 수, 시간 간격을 요약하라.
3. 정상 점검/모니터링 가능성과 공격 정찰 가능성을 구분하라.
4. 스캔 이후 인증 시도, 원격 접속, 파일 전송, credential 접근이 이어졌는지 확인하라.
5. 추가 Pivot과 초동 대응 조치를 작성하라.

출력 형식:
- 관측된 사실
- 스캔 주체
- 대상 범위
- 의심 근거
- 정상 가능성
- 추가 Pivot
- 대응 조치
```

## 8. 대응 요약

- 스캔 출발지와 대상 대역을 먼저 고정한다.
- 정상 취약점 점검, 모니터링, BAS 실행 여부를 확인한다.
- 비정상으로 판단되면 출발지 호스트 격리, 계정 사용 내역 확인, 동일 패턴 확장 검색을 수행한다.
- 스캔 이후 성공한 인증, 원격 접속, 데이터 접근 로그를 우선 확인한다.
