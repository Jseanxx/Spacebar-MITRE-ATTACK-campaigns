---
id: WF-DISCOVERY-001
name: "시스템·계정·네트워크 정보 수집"
description: "침투 이후 계정, 권한, 호스트명, 도메인, 네트워크, 서비스, 공유 자원을 수집한 정황을 분석한다."
techniques: "T1082, T1033, T1087, T1016, T1018, T1135, T1046"
---

# WF-DISCOVERY-001 시스템·계정·네트워크 정보 수집

공격자가 침투한 시스템에서 현재 권한, 계정, 도메인, 네트워크 구성, 주요 서버, 공유 자원을 파악한 정황을 분석하는 Workflow다.
정상 운영 명령과 유사하므로 명령 조합, 실행 순서, 실행 주체, 후속 이동 여부를 함께 본다.

| Field | Value |
| --- | --- |
| 분석 대상 행위 | whoami, hostname, net/nltest/nslookup, 환경변수, K8s 리소스 조회, 내부 서비스 식별 |
| 관련 캠페인 | SB-03, SB-04, SB-05, SB-06, SB-07 |
| 분석 결과물 | 정찰 주체, 수집 대상, 후속 이동 후보, 정상 점검 여부 |

## 1. 행위 정의

공격자가 다음 이동과 권한 확대를 위해 시스템 위치, 계정 권한, 도메인 구조, 내부 서비스, 네트워크 공유, Kubernetes 리소스를 확인하는 행위다.
단일 `whoami`보다 여러 discovery 명령이 짧은 시간에 연속 실행됐는지를 우선 확인한다.

## 2. 관련 Technique

| Technique | Name | 확인 관점 |
| --- | --- | --- |
| T1082 | System Information Discovery | hostname, OS, kernel, container 여부 확인 |
| T1033 | System Owner/User Discovery | 현재 사용자와 권한 확인 |
| T1087 | Account Discovery | 로컬/도메인 계정 목록 조회 확인 |
| T1016 | System Network Configuration Discovery | IP, DNS, 라우팅 정보 확인 |
| T1018 | Remote System Discovery | 주요 서버와 도메인 컨트롤러 확인 |
| T1135 | Network Share Discovery | SMB 공유 자원 확인 |
| T1046 | Network Service Discovery | 내부 서비스와 포트 확인 |

## 3. 먼저 확인할 로그

| 환경 | 대표 로그 | 핵심 필드 |
| --- | --- | --- |
| Windows | Sysmon 1, Security 4688, PowerShell 4104 | process.command_line, user.name, parent.process.name |
| Linux / Container | auditd, syslog, shell history 후보 | command, user, cwd, container.id |
| AD / DNS | DC logs, DNS query log | query, account, source, target |
| Kubernetes | API audit log | verb, resource, namespace, user |
| Network | Firewall, VPC Flow, EDR network | source, destination, port, action |

## 4. 빠른 KQL

### Windows discovery 명령

```text
process.command_line: ("*whoami*" or "*quser*" or "*net user*" or "*net view*" or "*net share*" or "*nltest*" or "*nslookup*")
```

### Linux/container discovery 명령

```text
process.command_line: ("*id*" or "*hostname*" or "*uname*" or "*ip addr*" or "*env*" or "*cat /etc/*release*")
```

### Kubernetes 리소스 조회

```text
kubernetes.audit.verb: ("get" or "list") and kubernetes.audit.objectRef.resource: ("pods" or "services" or "deployments" or "ingresses" or "namespaces")
```

## 5. 분석자가 할 일

1. discovery 명령을 실행한 주체와 위치를 고정한다.
2. 명령들이 짧은 시간에 연속 실행됐는지 확인한다.
3. 수집 대상이 계정, 네트워크, 도메인, K8s, 공유 자원 중 무엇인지 분류한다.
4. 정상 운영/장애 대응 명령과 비교한다.
5. 정찰 이후 원격 접속, credential 접근, 권한 상승이 이어졌는지 Pivot한다.

## 6. 판단 기준

| 구분 | 확인 기준 |
| --- | --- |
| 의심 | 침투 직후 여러 discovery 명령이 자동화된 순서로 실행 |
| 의심 | 서비스 계정, 웹 프로세스, SYSTEM 컨텍스트에서 내부 구조 조회 |
| 의심 | 정찰 직후 특정 서버로 WinRM/SSH/SMB/K8s API 접근 |
| 정상 가능성 | 승인된 점검 스크립트, 배포 스크립트, 장애 대응 절차와 일치 |

## 7. LLM Prompt Template

```text
너는 SIEM에 연결된 침해사고 분석 보조자다.
다음 조건으로 "시스템·계정·네트워크 정보 수집" 정황을 조사하라.

입력:
- 시간 범위:
- 의심 호스트/파드:
- 의심 계정:
- 관측된 명령:
- 관측된 단서:

요청:
1. Windows/Linux/K8s/DNS/네트워크 로그를 조회하라.
2. 실행된 discovery 명령을 목적별로 분류하라.
3. 정상 운영 가능성과 공격 정찰 가능성을 구분하라.
4. 정찰 이후 원격 접속, credential 접근, 권한 상승 Pivot을 확인하라.
5. 초동 대응 조치를 작성하라.

출력 형식:
- 관측된 사실
- 수집 대상
- 타임라인
- 의심 근거
- 추가 Pivot
- 대응 조치
```

## 8. 대응 요약

- 실행 명령과 프로세스 트리를 보존한다.
- 의심 주체의 세션, 권한, 최근 인증 로그를 확인한다.
- 동일 명령 묶음과 동일 source로 전체 로그를 확장 검색한다.
- 정찰된 주요 서버와 계정에 대한 후속 접근을 우선 점검한다.
