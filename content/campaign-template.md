---
id: SB-00
name: "Campaign Name"
owner: "담당자"
description: "캠페인 목록에 표시될 한 줄 설명."
---

# Campaign Name

캠페인 요약을 작성합니다. 피해 시스템이 어떤 기업형 환경인지, 공격자가 어떤 목표로 어떤 흐름을 수행했는지 짧게 설명합니다.

<div class="meta-grid" aria-label="Campaign metadata">
  <div class="meta-label">ID:</div>
  <div class="meta-value">SB-00</div>
  <div class="meta-label">Name:</div>
  <div class="meta-value">Campaign Name</div>
  <div class="meta-label">First Seen:</div>
  <div class="meta-value">May 2026</div>
  <div class="meta-label">Last Seen:</div>
  <div class="meta-value">May 2026</div>
  <div class="meta-label">Version:</div>
  <div class="meta-value">0.1</div>
  <div class="meta-label">Target:</div>
  <div class="meta-value">피해 시스템</div>
</div>

## Overview

캠페인 전체 흐름을 작성합니다. “실습했다”보다 “공격자는 무엇을 통해 무엇을 수행했다” 형식으로 작성합니다.

## Groups

| ID | Name | Description |
|---|---|---|
| G-SB-000 | Group Name | 이 캠페인 활동과 연결된 가상 공격 그룹입니다. |

## Techniques Used

| Domain | ID | Name | Use |
|---|---|---|---|
| Enterprise | T1190 | Exploit Public-Facing Application | 공격자는 외부에 노출된 서비스를 악용하여 초기 접근을 확보했다. |
| Enterprise | T1083 | File and Directory Discovery | 공격자는 주요 설정 파일과 업무 데이터 경로를 탐색했다. |

## Software

| ID | Name | Description |
|---|---|---|
| S-SB-000-01 | Software Name | 캠페인에서 관찰된 도구 또는 서비스입니다. |

## References

1. MITRE ATT&CK Campaigns. https://attack.mitre.org/campaigns/
