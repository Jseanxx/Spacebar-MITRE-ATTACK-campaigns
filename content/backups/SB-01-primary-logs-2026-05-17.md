# SB-01 Primary Logs Backup - 2026-05-17

아래 매핑은 SB-01 로그 상세 페이지를 실제 AWS/ELK에서 하나씩 검증하기 전의 초안이다.

| Name | ID | Previous Primary Logs |
| --- | --- | --- |
| Gather Victim Host Information | T1592 | JL-001 |
| Unsecured Credentials: Credentials In Files | T1552.001 | 작성 예정 |
| Valid Accounts | T1078 | JL-002 |
| Exploit Public-Facing Application | T1190 | JL-001, JL-002 |
| Data from Information Repositories | T1213 | JL-001, JL-002 |
| Unsecured Credentials: Private Keys | T1552.004 | JL-002 |
| Remote Services: SSH | T1021.004 | LL-001 |
| File and Directory Discovery | T1083 | LL-002 |
| Data from Information Repositories: Databases | T1213.006 | DBL-001 |
| Data Staged: Local Data Staging | T1074.001 | LL-002 |
| Exfiltration Over Alternative Protocol: Exfiltration Over Asymmetric Encrypted Non-C2 Protocol | T1048.002 | AWSL-001 |
