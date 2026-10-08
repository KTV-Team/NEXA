# VanLT — Tạo và thực thi thông báo

## 1. Chức năng và màn hình

| Phần                   | Công việc                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| `/create-notification` | Chọn bản thân hoặc bạn đã chấp nhận; nhập tiêu đề/nội dung; chọn gửi ngay, một lần hoặc lặp. |
| Gửi ngay               | Lưu yêu cầu và tạo lần gửi để chuyển sang inbox của KhangDL.                                       |
| Lên lịch một lần       | Lưu thời điểm; backend tự thực thi khi đến hạn, kể cả app đã đóng.                           |
| Lặp lại                | Lưu quy tắc đã chốt; sinh từng lần gửi và tính thời điểm tiếp theo.                          |
| Phục hồi               | Khôi phục công việc sau restart; retry lỗi tạm thời, chống thực thi trùng.                   |

Form có lỗi theo trường, loading danh sách bạn, submitting và lỗi/thử lại. Chỉ báo đã tiếp nhận sau khi backend lưu thành công; không hiển thị “đã nhận push” từ kết quả tạo.

## 2. API contract đề xuất

Đường dẫn tính từ API base URL; dùng Bearer token của TranTH. Người gửi lấy từ session.

| Method / endpoint         | Đầu vào                    | Kết quả `data`                                        |
| ------------------------- | -------------------------- | ----------------------------------------------------- |
| `POST /notifications`     | `CreateNotification`       | `202`, `NotificationCommand` đã lưu                   |
| `GET /notifications/:id`  | ID yêu cầu thuộc người gửi | `NotificationCommand`, trạng thái xử lý inbox         |
| `GET /friends` — TranTH sở hữu | Query `page, limit`        | Danh sách bạn để chọn người nhận; dùng contract của TranTH |

Response theo [mẫu của TranTH](member-a-spec.md): `{ success, data }` hoặc `{ success: false, error: { code, message, details? } }`.
Mã lỗi đề xuất: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 RECIPIENT_NOT_ALLOWED`, `404 NOT_FOUND`, `409 IDEMPOTENCY_CONFLICT`.

## 3. Trường dữ liệu và biến cần có

`?` = tùy chọn; ID là chuỗi; thời gian API dùng ISO 8601 UTC, múi giờ dùng tên IANA. Đối chiếu entity/migration hiện có trước khi bổ sung.

| Đối tượng             | Trường đề xuất                                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CreateNotification`  | `clientRequestId`, `recipientId`, `title`, `body`, `deliveryMode: immediate\|scheduled\|recurring`, `scheduledAt?`, `timeZone?`, `recurrence?`                            |
| `RecurrenceSpec`      | `rule`, `startsAt`, `endsAt?`; cú pháp `rule` theo chính sách lặp leader đã chốt, không tự chọn chu kỳ                                                                    |
| `NotificationCommand` | `id`, `senderId`, các trường nội dung/lịch trên, `status: queued\|scheduled\|active\|completed\|failed`, `nextRunAt?`, `createdAt`, `updatedAt`                           |
| `Occurrence`          | `id` (= `occurrenceId`), `notificationId`, `scheduledFor`, `status: pending\|processing\|persisted\|failed`, `attemptCount`, `retryAt?`, `leaseUntil?`, `lastError?`      |
| Bàn giao VanLT → KhangDL        | `{ occurrenceId, notificationId, senderId, recipientId, title, body }` → `{ itemId }` sau khi inbox đã lưu                                                                |
| State UI              | `recipient`, `recipientId`, `friends`, `title`, `body`, `deliveryMode`, `date`, `time`, `timeZone`, `recurrence`, `clientRequestId`, `fieldErrors`, `submitting`, `error` |

`completed` = yêu cầu đã hoàn tất các lần lưu inbox; `active` = lịch lặp còn hoạt động. `persisted` = lần gửi đã có inbox, không phải OS đã hiển thị. Lỗi push do KhangDL quản lý, không đổi lần gửi thành thất bại lưu inbox.

## 4. Quy tắc bắt buộc

- Validate ở backend: nội dung theo giới hạn đã chốt; `scheduled` cần thời điểm tương lai và múi giờ; `recurring` cần quy tắc và múi giờ hợp lệ. Loại bỏ trường lịch không phù hợp với mode.
- Tự gửi được phép; gửi người khác cần bạn đã chấp nhận và người nhận hợp lệ. Dùng provider kiểm tra quan hệ của TranTH; kiểm tra lại lúc thực thi theo chính sách leader đã chốt.
- Một `clientRequestId` duy nhất trong phạm vi người gửi: retry cùng nội dung trả lại yêu cầu cũ; khác nội dung trả `409`.
- Mỗi `(notificationId, scheduledFor)` chỉ tạo một occurrence. Claim công việc đồng thời phải có khóa/lease bền vững; restart và retry không tạo inbox mới cho cùng occurrence.
- Lưu lần gửi và yêu cầu bàn giao bền vững trước khi xử lý. Chỉ đánh dấu `persisted` sau phản hồi của KhangDL; mất phản hồi thì gọi lại cùng `occurrenceId`.
- Tính lịch ở backend; xử lý DST, lần bị lỡ khi server dừng và lỗi hết retry theo chính sách đã chốt. Không dựa vào timer/background JavaScript trên mobile.

## 5. Bàn giao và nghiệm thu

- VanLT sở hữu form tạo, command, occurrence và bộ thực thi lịch. KhangDL sở hữu inbox, realtime, device token và push; VanLT không ghi trực tiếp bảng inbox của KhangDL.
- KhangDL export provider nội bộ `persistDelivery(payload)` theo bảng trên; lưu inbox và công việc phát tín hiệu bền vững trước khi trả `itemId`. Contract này giống [spec KhangDL](member-c-spec.md).
- DTO ở `packages/types`, schema ở `packages/validation`, transport ở `packages/api-client`. Giữ mã trong feature/module hiện có; VanLT sở hữu migration command/occurrence, KhangDL sở hữu migration inbox/push; phối hợp file chung trước khi sửa.
- Thứ tự: gửi ngay tích hợp TranTH/KhangDL → lịch một lần → lặp và phục hồi. Test quyền người nhận, retry cùng request, worker đồng thời, restart, DST và mất phản hồi từ KhangDL; chạy luồng thật trên Android/iOS. Lint/typecheck/test phần thay đổi phải pass.
- Leader xác nhận hoặc dẫn nguồn trước triển khai: giới hạn nội dung, quy tắc lặp/DST, lịch bị lỡ, quyền gửi khi hủy kết bạn, retry và cách thực thi lịch. Chỉ đề xuất thêm dịch vụ/dependency sau khi kiểm tra nền tảng hiện có.
