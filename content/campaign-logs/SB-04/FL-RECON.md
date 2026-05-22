---
id: FL-RECON
name: Falco Credential Recon Log
description: ServiceAccount 토큰 경로 접근과 kubeconfig 내 Kubernetes 자격 증명 확인 행위를 설명하는 Falco 런타임 로그
techniques: T1552.007,T1552.001
---

# FL-RECON Falco Credential Recon Log

| Field | Value |
| --- | --- |
| Log ID | FL-RECON |
| Source | SB-04 K8s Node |
| Representative Path | `journalctl -u falco-modern-bpf.service` |
| Collection | Wazuh agent journald input (`/var/ossec/etc/ossec.conf`) |
| Primary Use | ServiceAccount 토큰/인증서 접근 및 `/root/.kube/config` 내 Kubernetes 자격 증명 확인 |

## 공격 행위 요약

FL-RECON은 NodeFall 캠페인에서 공격자가 장악한 컨테이너 내부에서 Kubernetes 자격 증명을 정찰하는 행위를 설명하는 로그이다. 공격자는 먼저 기본 마운트된 ServiceAccount 경로(`/var/run/secrets/kubernetes.io/serviceaccount/`)를 확인하여 `token`, `ca.crt`, `namespace` 파일 존재 여부를 탐색했다.

이후 권한 상승이 이루어진 뒤에는 `/root/.kube/config` 파일을 확인하여 관리자용 Kubernetes 토큰이 포함되어 있는지 정찰했다. 이 로그는 단순 파일 탐색이 아니라, 공격자가 이후 Kubernetes API 접근과 권한 확인, 특권 Pod 생성으로 이어가기 위해 사용할 수 있는 자격 증명 후보를 찾는 단계의 증적이다.

## 로그 발생 위치

| 구분 | 위치 | 설명 |
| --- | --- | --- |
| K8s Node | `Linux Kernel syscall` | 컨테이너 내부에서 `ls`, `cat` 등의 프로세스 실행과 민감 경로 파일 접근 행위가 syscall로 발생 |
| K8s Node | `falco-modern-bpf.service` | Falco가 syscall을 관찰하고 ServiceAccount 또는 kubeconfig 접근 행위와 매칭되면 탐지 이벤트 생성 |
| K8s Node | `journalctl -u falco-modern-bpf.service` | Falco 탐지 이벤트가 systemd journal에 기록되는 대표 확인 위치 |

## 수집 방식

| 구분 | 방식 |
| --- | --- |
| Falco | eBPF/driver를 통해 Linux Kernel syscall을 관찰하고, Falco rule의 `condition`과 매칭되면 `output` 형식의 탐지 이벤트를 생성 |
| journald | Falco가 생성한 탐지 이벤트를 `falco-modern-bpf.service`의 systemd journal 로그로 기록 |
| Wazuh agent | `/var/ossec/etc/ossec.conf`의 journald 수집 설정을 통해 Falco 서비스 로그를 수집 |
| Wazuh manager | 수집된 Falco 로그를 `/var/ossec/etc/rules/local_rules.xml`의 룰과 매칭하여 Wazuh alert로 변환 |
| Wazuh Dashboard | 생성된 Wazuh alert를 분석자가 확인할 수 있는 대시보드 이벤트로 표시 |

## 로그 출력 명령어

```bash
sudo journalctl -u falco-modern-bpf.service --no-pager | grep -E "\[NF-RECON\] SA Credential Access|\[NF-RECON\] Kube-system Pod List"
```

```bash
sudo journalctl -u falco-modern-bpf.service --no-pager | grep -E "\[NF4\] Kubeconfig Read"
```

## 실제 관측 로그

```text
May 22 11:48:16 ip-10-0-133-48 falco[8979]: 11:48:16.562095080: Notice [NF-RECON] SA Credential Access (user=nextjs proc=cat cmd=cat /var/run/secrets/kubernetes.io/serviceaccount/token file=/var/run/secrets/kubernetes.io/serviceaccount/token container=react-app pod=react-app-685875587f-hv72r ns=default) 
container_id=5ed6b4677c32 container_name=react-app container_image_repository=docker.io/library/react2shell-vulnlab-hi-react2shell-tribune container_image_tag=latest k8s_pod_name=react-app-685875587f-hv72r k8s_ns_name=default
```

```text
May 22 11:48:24 ip-10-0-133-48 falco[8979]: 11:48:24.796423993: Notice [NF-RECON] Kube-system Pod List (user=nextjs proc=curl cmd=curl -k -H Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImdvZlBXTC1kUlpjUHdocmJZZnNmaHNxaUFtTFJuS3JSM1FtQWxfek5BOTgifQ.eyJhdWQiOlsiaHR0cHM6Ly9rdWJlcm5ldGVzLmRlZmF1bHQuc3ZjLmNsdXN0ZXIubG9jYWwiXSwiZXhwIjoxODEwOTg1NDIzLCJpYXQiOjE3Nzk0NDk0MjMsImlzcyI6Imh0dHBzOi8va3ViZXJuZXRlcy5kZWZhdWx0LnN2Yy5jbHVzdGVyLmxvY2FsIiwianRpIjoiNGViZmM2ZDctZTRjZC00Njc4LTlkZjUtMmZlZDk5Y2EzMTkwIiwia3ViZXJuZXRlcy5pbyI6eyJuYW1lc3BhY2UiOiJkZWZhdWx0Iiwibm9kZSI6eyJuYW1lIjoiaXAtMTAtMC0xMzMtNDgiLCJ1aWQiOiIwNGZjMDU0Ny1mYTNkLTRlZGYtOGYxMi04NDU1YWE1MTgzZjkifSwicG9kIjp7Im5hbWUiOiJyZWFjdC1hcHAtNjg1ODc1NTg3Zi1odjcyciIsInVpZCI6IjUyZjMyODI5LWU2YzAtNGJiNS1hNjY0LTM2OTE0MmNlNzdjYSJ9LCJzZXJ2aWNlYWNjb3VudCI6eyJuYW1lIjoiZGVmYXVsdCIsInVpZCI6IjIwNDI1Mjk5LTRjZTQtNGY3ZS05YzBmLTBiZTVhOGE0MDk5ZSJ9LCJ3YXJuYWZ0ZXIiOjE3Nzk0NTMwMzB9LCJuYmYiOjE3Nzk0NDk0MjMsInN1YiI6InN5c3RlbTpzZXJ2aWNlYWNjb3VudDpkZWZhdWx0OmRlZmF1bHQifQ.Db1BSArLvO_Mfv5HfZOXTiK071rrLmpyvxDi80CeNrCPCjFWVvRtjf9HwUeHAIFzXgf3mAmZz8ZzXIB7Ry8_k3HPuLl-jhoTDTXSLH4l2zI8QbtwL_6NMh-2A8GY4YPW3LmUvrNXlnk-qAt6CCvFpDRkPCUTpVAP4Qe3RTHJUUUljDXmdjtLJpM-g_vjKLCXqKBJBnMMvVDdzWsc1wqkZdCHpeXpKLr2Tz33fd5eOKImiTtArWmeGHkYuEF-8BU6eNCu1DDGFjvc_q8L77InvnjlpeyWDCWM731oCDkgaK2199V1R3a99pP3dPHzBjfqgt1bJreVCi7WDDPerJ-aWw https://kubernetes.default.svc/api/v1/namespaces/kube-system/pods container=react-app pod=react-app-685875587f-hv72r ns=default) 
container_id=5ed6b4677c32 container_name=react-app container_image_repository=docker.io/library/react2shell-vulnlab-hi-react2shell-tribune container_image_tag=latest k8s_pod_name=react-app-685875587f-hv72r k8s_ns_name=default
```

```text
May 22 11:58:16 ip-10-0-133-48 falco[8979]: 11:58:16.123457477: Warning [NF4] Kubeconfig Read (user=root proc=cat .kube/config file=/root/.kube/config container=react-app pod=react-app-685875587f-hv72r ns=default) 
container_id=5ed6b4677c32 container_name=react-app container_image_repository=docker.io/library/react2shell-vulnlab-hi-react2shell-tribune container_image_tag=latest k8s_pod_name=react-app-685875587f-hv72r k8s_ns_name=default
```

## 주요 필드

| 필드 | 의미 | 예시 |
| --- | --- | --- |
| `evt.time` | Falco 탐지 이벤트 발생 시간 | `11:48:16.562095080`, `11:48:24.796423993`, `11:58:16.123457477` |
| `priority` | Falco 탐지 심각도 | `Notice`, `Warning` |
| `rule/message` | Falco가 탐지한 정찰 행위명 | `[NF-RECON] SA Credential Access`, `[NF-RECON] Kube-system Pod List`, `[NF4] Kubeconfig Read` |
| `user` | 행위를 수행한 컨테이너 내부 사용자 | `nextjs`, `root` |
| `proc` | 실행된 프로세스 | `cat`, `curl` |
| `cmd` | 실행된 명령어 또는 인자 | `cat /var/run/secrets/kubernetes.io/serviceaccount/token`, `curl -k -H Authorization: Bearer <REDACTED> https://kubernetes.default.svc/api/v1/namespaces/kube-system/pods`, `cat .kube/config` |
| `file` | 접근한 자격 증명 파일 또는 민감 파일 | `/var/run/secrets/kubernetes.io/serviceaccount/token`, `/root/.kube/config` |
| `api_path` | Kubernetes API 요청 대상 | `/api/v1/namespaces/kube-system/pods` |
| `container_name` | 행위가 발생한 컨테이너 이름 | `react-app` |
| `container_id` | 컨테이너 식별자 | `5ed6b4677c32` |
| `container_image_repository` | 컨테이너 이미지 저장소 | `docker.io/library/react2shell-vulnlab-hi-react2shell-tribune` |
| `container_image_tag` | 컨테이너 이미지 태그 | `latest` |
| `k8s_pod_name` | 행위가 발생한 Kubernetes Pod | `react-app-685875587f-hv72r` |
| `k8s_ns_name` | Pod가 속한 namespace | `default` |
| `message` | journald에 기록된 Falco 원본 로그 | `Notice [NF-RECON] SA Credential Access ...`, `Notice [NF-RECON] Kube-system Pod List ...`, `Warning [NF4] Kubeconfig Read ...` |

## 커버 대상 Techniques Used

| Technique | Mapping Reason |
| --- | --- |
| T1552.007 Unsecured Credentials: Container API Credentials | 장악한 Pod 내부에서 기본 마운트된 ServiceAccount 토큰 및 인증서 경로에 접근했는지 확인한다. |
| T1552.001 Unsecured Credentials: Credentials In Files | 권한 상승 이후 `/root/.kube/config` 파일을 확인하여 관리자용 Kubernetes 토큰이 포함되어 있는지 정찰한 행위를 확인한다. |

## 탐지 포인트

| Technique | 관찰 행위 | 주요 필드 |
| --- | --- | --- |
| T1552.007 Unsecured Credentials: Container API Credentials | 컨테이너 내부에서 `/var/run/secrets/kubernetes.io/serviceaccount/` 하위의 `token`, `ca.crt`, `namespace` 파일에 접근하는지 확인한다. 이는 기본 마운트된 ServiceAccount 자격 증명을 확인하는 초기 정찰 행위다. | `rule/message`, `user`, `proc`, `cmd`, `file`, `container_name`, `k8s_pod_name`, `k8s_ns_name` |
| T1552.007 Unsecured Credentials: Container API Credentials | 확보한 ServiceAccount 토큰을 이용해 Kubernetes API 서버의 `kube-system` Pod 목록을 조회하는지 확인한다. 단순 파일 접근보다 실제 API 정찰로 이어졌는지를 판단하는 지점이다. | `rule/message`, `user`, `proc`, `cmd`, `api_path`, `container_id`, `container_name`, `k8s_pod_name`, `k8s_ns_name` |
| T1552.001 Unsecured Credentials: Credentials In Files | 권한 상승 이후 `/root/.kube/config` 파일을 읽어 관리자용 Kubernetes 토큰이나 cluster/user/context 정보를 확인하는지 본다. 일반 ServiceAccount 토큰이 아니라 파일에 저장된 별도 자격 증명 확인 행위로 구분한다. | `rule/message`, `user`, `proc`, `cmd`, `file`, `container_name`, `k8s_pod_name`, `k8s_ns_name` |
| T1552.001 Unsecured Credentials: Credentials In Files | kubeconfig 확인 이후 RBAC 권한 확인이나 특권 Pod 생성으로 이어지는지 타임라인상 연결한다. 이 행위는 단독으로도 민감하지만, 이후 `SelfSubjectAccessReview` 또는 Pod 생성 요청과 이어질 때 공격 단계 전환의 증거가 된다. | `message`, `cmd`, `file`, `k8s_pod_name`, `k8s_ns_name`, `container_id` |
