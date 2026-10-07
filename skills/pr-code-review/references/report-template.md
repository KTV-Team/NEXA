# Markdown report contract

Write a concise Vietnamese report with the structure below. Substitute all example fields with verified values, or explicitly state unavailable. Keep empty severity sections. Expand the issue block once per verified new/worsened issue and remove instructional placeholder text from the delivered report.

```markdown
# Code review: PR #NUMBER — TITLE

- Pull request: [OWNER/REPOSITORY #NUMBER](PR_URL)
- Tác giả: AUTHOR
- Base: BASE_REF @ BASE_SHA
- Head: HEAD_REF @ HEAD_SHA
- Merge base: SHA hoặc không truy cập được
- Thời điểm review: ISO_TIMESTAMP_WITH_TIMEZONE
- Trạng thái: Complete / Incomplete / Stale
- Đề xuất: Changes requested / No blocking findings / Needs verification

## Tổng quan

| Critical | High | Medium | Low |
| --- | --- | --- | --- |
| COUNT | COUNT | COUNT | COUNT |

Một đoạn ngắn về kết quả và giới hạn quan trọng. Tổng số chỉ gồm issue mới hoặc bị PR làm nghiêm trọng hơn. Leader quyết định merge.

## Critical

Không phát hiện issue đã xác minh ở mức này, hoặc các issue theo mẫu bên dưới.

## High

Không phát hiện issue đã xác minh ở mức này, hoặc các issue theo mẫu bên dưới.

## Medium

### ISSUE-ID — Tiêu đề mô tả lỗi cụ thể

- Mức độ: Medium
- Nhóm / Rule: RULE_ID hoặc đường dẫn rule của repository
- Độ tin cậy: High / Medium
- Vị trí: [path:LINE](REVISION_PINNED_SOURCE_LINK)
- Điều kiện xảy ra: input/state và đường đi thực thi cụ thể.
- Bằng chứng: đoạn code ngắn hoặc kết quả kiểm tra; không chứa secrets.
- Hiện tại / Mong đợi: hành vi hiện tại và yêu cầu đã được thiết lập.
- Ảnh hưởng: người dùng/consumer nào chịu ảnh hưởng và vì sao cần sửa.
- Hướng sửa: thay đổi nhỏ nhất giải quyết nguyên nhân.
- Xác minh: reproduction/test đã chạy, hoặc kiểm tra đề xuất chưa chạy.

## Low

Không phát hiện issue đã xác minh ở mức này, hoặc các issue theo mẫu trên.

## Phạm vi và nguồn rule

- Changed files: TOTAL; đã xem: COUNT; chưa xem: COUNT.
- Các file/module và consumers liên quan đã kiểm tra.
- Nguồn rule: đường dẫn và revision, gồm nested instructions áp dụng.
- Nội dung binary/generated, patch bị cắt hoặc phần ngoài phạm vi.

## Checks và tests

| Check | Revision | Trạng thái | Bằng chứng / Giới hạn |
| --- | --- | --- | --- |
| NAME | SHA | Passed / Failed / Pending / Skipped / Cancelled / Not run / Unavailable | Link hoặc kết quả cụ thể |

## Điểm cần xác minh

Liệt kê thiếu quyền truy cập, ngữ cảnh, yêu cầu chưa được chốt, giả thuyết chưa đủ bằng chứng hoặc thay đổi head trong khi review. Không tính các mục này vào số issue.

## Issue có sẵn từ trước

Chỉ ghi issue cũ liên quan đáng kể, kèm bằng chứng ở base revision; không tính vào tổng issue của PR.

## Đề xuất tùy chọn

Cải thiện không bắt buộc, tách khỏi issue vi phạm rule hoặc lỗi có ảnh hưởng.
```

## Link and consistency rules

- Link source at the recorded head SHA, for example `https://HOST/OWNER/REPOSITORY/blob/HEAD_SHA/path#L42`. For deleted code use the recorded base SHA and explicitly mark the location as base. URL-encode paths and verify line numbers against the referenced file.
- For findings whose strongest evidence is in a diff, optionally include a verified GitHub diff permalink; do not invent diff anchors or line numbers.
- Use stable, unique issue IDs such as CR-001. Order severity groups Critical, High, Medium, Low, and sort within a group by impact.
- List concrete exclusions and gaps; do not claim complete coverage when files or required context are missing.
- If no verified issues exist, use zero counts and distinguish No blocking findings from Needs verification. Neither claims that the code is bug-free or authorizes merge.
