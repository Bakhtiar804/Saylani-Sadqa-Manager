# Faisalabad tree data verification

Verified 11 November 2026 against the original workbook and the configured PostgreSQL database. All queries were read-only; no data was changed.

Workbook: C:\Desktop\Boot Camp\Saylani Sadqa Manager\All Pakistan Donation & Exp 2024 to 2026.xlsx
Workbook SHA-256: 18ba7be8e6883b623e3038aa4f2708a880ee1011fc75d6eddfb78c3f2353c12b

Result: all 18 Faisalabad 2026 collection rows match the original workbook, including amount, box count, source sheet and source row. The actual getNetworkTree database function returns the same figures.

| Channel | Collection, available 2026 months | Months | September 2026 reported boxes | Excel box-count cell |
| --- | ---: | --- | ---: | --- |
| branch | PKR 70,694,992 | 2026-01 to 2026-09 (9 rows) | 77 | Branch_Collection!G34 |
| public | PKR 90,270,507 | 2026-01 to 2026-09 (9 rows) | 8,801 | Public_Collection!G34 |
| Total | PKR 160,965,499 | Jan–Sep 2026 | 8,878 | Sum of both channels |

Collection amounts are sums of the available January–September 2026 monthly Cash cells. Reported box counts are the September snapshot, not a sum across months. The graph rounds collection amounts to millions; its reported counts are monthly aggregates, not individual box IDs.

## Exact source rows

| Month | Channel | Cash (PKR) | Boxes | Excel Cash cell | Excel Boxes cell | Database match |
| --- | --- | ---: | ---: | --- | --- | --- |
| 2026-01 | branch | 8,130,630 | 76 | Branch_Collection!H26 | Branch_Collection!G26 | PASS |
| 2026-01 | public | 10,743,090 | 8,382 | Public_Collection!H26 | Public_Collection!G26 | PASS |
| 2026-02 | branch | 7,788,188 | 77 | Branch_Collection!H27 | Branch_Collection!G27 | PASS |
| 2026-02 | public | 9,178,643 | 8,434 | Public_Collection!H27 | Public_Collection!G27 | PASS |
| 2026-03 | branch | 9,199,294 | 77 | Branch_Collection!H28 | Branch_Collection!G28 | PASS |
| 2026-03 | public | 10,588,455 | 8,454 | Public_Collection!H28 | Public_Collection!G28 | PASS |
| 2026-04 | branch | 8,360,485 | 77 | Branch_Collection!H29 | Branch_Collection!G29 | PASS |
| 2026-04 | public | 10,136,125 | 8,514 | Public_Collection!H29 | Public_Collection!G29 | PASS |
| 2026-05 | branch | 7,480,164 | 77 | Branch_Collection!H30 | Branch_Collection!G30 | PASS |
| 2026-05 | public | 9,153,507 | 8,597 | Public_Collection!H30 | Public_Collection!G30 | PASS |
| 2026-06 | branch | 7,114,886 | 77 | Branch_Collection!H31 | Branch_Collection!G31 | PASS |
| 2026-06 | public | 9,832,045 | 8,671 | Public_Collection!H31 | Public_Collection!G31 | PASS |
| 2026-07 | branch | 7,642,273 | 77 | Branch_Collection!H32 | Branch_Collection!G32 | PASS |
| 2026-07 | public | 10,167,046 | 8,601 | Public_Collection!H32 | Public_Collection!G32 | PASS |
| 2026-08 | branch | 7,298,939 | 77 | Branch_Collection!H33 | Branch_Collection!G33 | PASS |
| 2026-08 | public | 9,834,324 | 8,662 | Public_Collection!H33 | Public_Collection!G33 | PASS |
| 2026-09 | branch | 7,680,133 | 77 | Branch_Collection!H34 | Branch_Collection!G34 | PASS |
| 2026-09 | public | 10,637,272 | 8,801 | Public_Collection!H34 | Public_Collection!G34 | PASS |

## Import provenance

- All Pakistan Donation & Exp 2024 to 2026.xlsx; original file hash match: yes.
