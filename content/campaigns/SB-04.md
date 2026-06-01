---
id: SB-04
name: "NodeFall"
owner: "서현재"
description: "K8s 환경의 React 19 파드 취약점을 통해 침투한 후, 워커 노드의 공유 커널을 타격하여 컨테이너를 탈출하고 AWS IAM 권한을 탈취해 내부망 RDS 데이터를 유출한 침해 캠페인."
---

# NodeFall

NodeFall은 퍼블릭 인터넷에 노출된 AWS K8s 클러스터 내부의 React 19 / Next.js 15 애플리케이션을 최초 타겟으로 삼는 공급망 및 클라우드 인프라 침해 캠페인이다.
공격자는 RSC(React Server Components) 역직렬화 취약점(CVE-2025-55182)을 악용하여 컨테이너 내부에 초기 거점을 확보한 뒤, 클러스터에 기본 마운트된 ServiceAccount 토큰을 수집하여 K8s API 서버를 정찰했다. 이후 논리적인 권한 통제(RBAC)를 물리적으로 우회하기 위해 워커 노드의 공유 리눅스 커널 취약점(CVE-2026-31431, Copy Fail)을 직접 타격하는 방식을 취했다.
이를 통해 파드 내부에서 커널 레벨의 제어권을 획득한 공격자는 특권(Privileged) 데몬셋을 강제 생성하여 컨테이너 격리 환경을 완전히 탈출(Escape)하는 데 성공했다. 최종적으로 장악된 워커 노드(EC2)에 부여된 AWS 인스턴스 프로파일(IAM Role)을 탈취하고, 클라우드 내부망으로 피벗(Pivot)하여 프라이빗 서브넷에 위치한 RDS 데이터베이스의 고객 정보(PII)를 대량으로 유출했다.

## Groups

| ID | Name | Description |
|---|---|---|
| G-SB-004 | KubeSyndicate | K8s 환경에 초기 침투한 뒤, 워커 노드의 공유 커널 취약점(Copy Fail)을 타격하여 컨테이너를 탈출하고 클라우드 인프라(AWS IAM, RDS) 자원을 전문적으로 탈취하는 지능형 지속 위협(APT) 그룹 |

## Techniques Used

| Domain | ID | Name | Use | Primary Logs |
|---|---|---|---|---|
| Enterprise | T1190 | Exploit Public-Facing Application | Application	캠페인 당시 공격 그룹은 K8s 환경에서 ALB 443 포트로 노출된 React 19 / Next.js 15 프론트엔드 파드의 RSC 역직렬화 취약점(CVE-2025-55182)을 악용해 단일 HTTP 요청으로 초기 침투(RCE)를 수행했다. |[[FL-001]]|
| Enterprise | T1552.007 | Unsecured Credentials: Container API Credentials | 캠페인 당시 공격 그룹은 장악한 파드 내부에 `automountServiceAccountToken: true` 설정으로 인해 기본 마운트되어 있던 ServiceAccount 토큰 및 인증서를 수집했다. |[[FL-RECON]]|
| Enterprise | T1613 | Container and Resource Discovery | 캠페인 당시 공격 그룹은 획득한 SA 토큰을 사용하여 K8s API 서버와 통신하며, 클러스터 내부망의 서비스 구조와 자신에게 부여된 RBAC 권한을 정찰했다. |[[FL-002]]|
| Enterprise | T1068 | Exploitation for Privilege Escalation | 캠페인 당시 공격 그룹은 제한된 파드 권한의 한계를 극복하기 위해, K8s 워커 노드의 공유 Linux 커널 취약점(CVE-2026-31431, Copy Fail)을 타격하여 파드 내부의 루트(Root) 권한을 확보했다. |[[FL-003]]|
| Enterprise | T1552.001 | Unsecured Credentials: Credentials In Files | 캠페인 당시 공격 그룹은 권한 상승 이후 파드 내부의 `/root/.kube/config` 파일을 정찰하여 관리자용 Kubernetes 토큰이 포함되어 있음을 확인했다. 이후 해당 토큰을 사용해 kube-system 네임스페이스 내 파드 생성 권한을 확인했다. |[[FL-RECON]]|
| Enterprise | T1611 | Escape to Host | 캠페인 당시 공격 그룹은 과도하게 부여된 kube-system 내 파드 생성 권한을 악용하여, 특권(Privileged) 파드를 강제 생성함으로써 컨테이너 경계를 탈출하고 노드(Node)의 제어권을 탈취했다. |[[KL-001]],[[FL-004]]|
| Enterprise | T1552.005 | Unsecured Credentials: Cloud Instance Metadata API | 캠페인 당시 공격 그룹은 탈출한 노드에서 IMDS를 통해 Instance Profile 임시 자격 증명을 획득하고, STS로 AWS API 사용 가능성을 검증했다. |[[AL-001]],[[FL-005]]|
| Enterprise | T1213.006 | Data from Information Repositories: Databases | 캠페인 당시 공격 그룹은 획득한 AWS 임시 자격 증명으로 Secrets Manager를 조회해 nodefall-rds-credential을 식별하고, SecretString에서 RDS 접속 정보를 확보했다. 이후 RDS 메타데이터 조회 결과와 대조해 해당 접속 정보가 실제 사용 가능한 내부 RDS 자산임을 확인하고, MySQL 조회를 통해 내부 RDS 데이터 자산을 확보했다. |[[AL-002]],[[FL-006]]|
| Enterprise | T1567.002 | Exfiltration Over Web Service: Exfiltration to Cloud Storage | 캠페인 당시 공격 그룹은 내부 RDS 고객 데이터를 HTTPS POST 요청으로 외부 웹 수신지에 유출했다. |[[FL-007]]|

## Software

| ID | Name | Description |
|---|---|---|
| S-SB-004 | BurpSuite | 프로토타입 오염을 통한 리버스 쉘 확보에 활용 |


## References

https://github.com/hidden-investigations/react2shell-vulnlab.git

https://download.ahnlab.com/kr/site/brochure/React2Shell_Analysis_Report_kr.pdf

https://copy.fail/#exploit

https://webhook.site/
