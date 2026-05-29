---
id: WF-PRIVESC-001
name: "권한 상승 및 경계 탈출"
description: "컨테이너 탈출, privileged pod, SYSTEM/root 권한 획득, 관리자 권한 전환 정황을 분석한다."
techniques: "T1068, T1611, T1610, T1134, T1548, T1053"
---

# WF-PRIVESC-001 권한 상승 및 경계 탈출

공격자가 제한된 사용자, 서비스, 컨테이너, 파드 권한에서 root/SYSTEM/관리자/노드 권한으로 상승한 정황을 분석하는 Workflow다.
취약점 악용, privileged pod 생성, 예약 작업, 토큰/credential 악용을 함께 본다.

| Field | Value |
| --- | --- |
| 분석 대상 행위 | root/SYSTEM 권한 획득, 컨테이너 탈출, privileged pod, 관리자 권한 전환 |
| 관련 캠페인 | SB-03, SB-04, SB-06, SB-07 |
| 분석 결과물 | 상승 전후 계정, 상승 방법, 영향 호스트/노드, 후속 행위 |

## 1. 행위 정의

공격자가 취약점, 잘못된 권한, 예약 작업, credential을 이용해 더 높은 권한으로 명령을 실행하는 행위다.
권한 상승은 단독 이벤트보다 직전 실행 파일/취약점/credential 접근과 직후 LSASS, Secret, 관리자 공유 접근을 연결해 판단한다.

## 2. 관련 Technique

| Technique | Name | 확인 관점 |
| --- | --- | --- |
| T1068 | Exploitation for Privilege Escalation | 로컬/커널 취약점 악용 흔적 확인 |
| T1611 | Escape to Host | 컨테이너에서 노드로 경계 탈출 여부 확인 |
| T1610 | Deploy Container | privileged pod 생성으로 권한 확대 확인 |
| T1134 | Access Token Manipulation | 토큰/권한 컨텍스트 전환 확인 |
| T1548 | Abuse Elevation Control Mechanism | 권한 상승 메커니즘 오용 확인 |
| T1053 | Scheduled Task/Job | 높은 권한 예약 작업 실행 확인 |

## 3. 먼저 확인할 로그

| 환경 | 대표 로그 | 핵심 필드 |
| --- | --- | --- |
| Windows | Security 4672/4688/4698, Sysmon 1 | user, logonId, command_line, task name |
| Linux | auditd, sudo logs, syslog | uid/euid, command, executable, cwd |
| Kubernetes | API audit, pod spec | privileged, hostPath, serviceAccount, namespace |
| EDR | privilege escalation alert, process tree | parent, child, integrity, user, exploit indicator |
| Cloud / Node | CloudTrail, node logs | role, source, API, host identity |

## 4. 빠른 KQL

### Windows 고권한 실행

```text
winlog.event_id: (4672 or 4688 or 4698) and (user.name: "*Administrator*" or process.command_line: "*schtasks*")
```

### privileged pod

```text
kubernetes.audit.verb: "create" and kubernetes.audit.objectRef.resource: "pods" and requestObject.spec.containers.securityContext.privileged: true
```

### Linux root 전환 후보

```text
user.effective.id: 0 and process.name: ("bash" or "sh" or "python" or "sudo")
```

## 5. 분석자가 할 일

1. 상승 전 계정과 상승 후 권한을 구분한다.
2. 권한 상승을 유발한 프로세스, 취약점, Pod spec, credential을 확인한다.
3. 상승 직후 수행한 Secret 접근, LSASS dump, 관리자 공유 접근을 Pivot한다.
4. 정상 운영/배포 작업 또는 관리 도구 실행 가능성을 확인한다.
5. 영향 호스트, 노드, namespace, 계정 범위를 산정한다.

## 6. 판단 기준

| 구분 | 확인 기준 |
| --- | --- |
| 의심 | 웹/앱/일반 사용자 컨텍스트에서 root/SYSTEM 권한 실행으로 전환 |
| 의심 | privileged pod, hostPath, scheduled task, 관리자 공유 접근이 연속 발생 |
| 의심 | 권한 상승 직후 credential dump 또는 secret 조회 |
| 정상 가능성 | 승인된 패치, 운영 자동화, 클러스터 관리 작업과 일치 |

## 7. LLM Prompt Template

```text
너는 SIEM에 연결된 침해사고 분석 보조자다.
다음 조건으로 "권한 상승 및 경계 탈출" 정황을 조사하라.

입력:
- 시간 범위:
- 의심 호스트/노드/파드:
- 의심 계정:
- 관측된 상승 단서:

요청:
1. Windows/Linux/K8s/EDR 로그를 조회하라.
2. 상승 전후 권한, 실행 프로세스, 원인을 타임라인으로 정리하라.
3. 정상 관리 작업 가능성과 공격 권한 상승 가능성을 구분하라.
4. 상승 이후 credential 접근, 원격 접속, 데이터 접근 Pivot을 확인하라.
5. 초동 대응 조치를 작성하라.

출력 형식:
- 관측된 사실
- 상승 전후 권한
- 의심 근거
- 영향 범위
- 추가 Pivot
- 대응 조치
```

## 8. 대응 요약

- 권한 상승 전후 프로세스, Pod spec, 이벤트 로그를 보존한다.
- 영향 호스트/파드/노드를 격리하고 credential 회전을 검토한다.
- 동일 exploit/Pod spec/task 이름으로 전체 로그를 확장 검색한다.
- 취약점 패치, RBAC 축소, 고권한 작업 승인 절차를 점검한다.
