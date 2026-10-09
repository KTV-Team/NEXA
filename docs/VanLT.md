# VanLT — Tạo và thực thi thông báo

## Phạm vi triển khai

VanLT triển khai luồng tạo thông báo trong ứng dụng Android/iOS, API command, occurrence bền vững và worker thực thi lịch. Luồng dùng API bạn bè hiện có của TranTH. KhangDL chỉ là ranh giới tích hợp inbox tối thiểu; triển khai này không thêm realtime, đăng ký device token hay native push.

Màn hình `/create-notification` cho phép gửi cho chính mình hoặc bạn đã chấp nhận kết bạn, nhập nội dung, chọn gửi ngay/lên lịch một lần/lặp lại, xem lỗi theo trường và kiểm tra lại trạng thái command. Màn hình chỉ báo đã tiếp nhận khi API lưu command thành công; `QUEUED` không có nghĩa inbox đã được ghi.

## API contract

Giữ contract đang dùng trong workspace, không chuyển sang payload phẳng hoặc mã HTTP mới:

| Method / endpoint | Request | Response |
| --- | --- | --- |
| `POST /notifications` | `CreateNotification` với `clientRequestId`, `recipientId`, `title`, `body`, `delivery` | `201` khi tạo mới; `200` khi replay cùng idempotency key |
| `GET /notifications/:id` | ID command thuộc người gửi | `PersonalNotification` và trạng thái xử lý |
| `GET /friends?page=1&limit=20` | Phân trang | Danh sách bạn để chọn người nhận |

Payload giữ dạng hiện có: `delivery: { mode: 'immediate' }`, `{ mode: 'scheduled', scheduledAt }`, hoặc `{ mode: 'recurring', rule }`. Response tiếp tục dùng envelope `{ success, data }` của API.

## Trạng thái và dữ liệu

- `QUEUED`: command gửi ngay đã được lưu cùng occurrence; worker chưa xác nhận inbox.
- `SCHEDULED`: lịch một lần đang chờ.
- `ACTIVE`: lịch lặp còn occurrence tiếp theo.
- `COMPLETED`: các lần gửi đã hoàn tất bước lưu inbox.
- `CANCELLED`, `BLOCKED`, `FAILED`: trạng thái kết thúc tương ứng với hủy, người nhận không còn đủ điều kiện, hoặc lỗi xử lý.

Occurrence lưu payload snapshot, thời điểm dự kiến, trạng thái `pending | processing | persisted | failed`, số lần thử, thời điểm retry, lease, claim token và mã lỗi kỹ thuật. Mỗi cặp `(notificationId, scheduledFor)` chỉ có một occurrence. `persisted` nghĩa là inbox đã được ghi; không khẳng định hệ điều hành đã hiển thị hoặc người nhận đã đọc.

## Quy tắc đã chốt

- Tiêu đề dài 1–200 ký tự; nội dung dài 1–5000 ký tự. API vẫn xác thực dữ liệu ở server.
- Gửi cho chính mình được phép; gửi người khác cần tài khoản còn hoạt động và quan hệ bạn bè đang được chấp nhận. Kiểm tra điều kiện này lại khi thực thi.
- Lịch một lần dùng thời điểm ISO 8601 và phải ở tương lai.
- Lặp lại hỗ trợ hằng ngày/hằng tuần, giờ địa phương `HH:mm`, múi giờ IANA, ngày kết thúc bao gồm trong lịch và thứ trong tuần theo ISO (Thứ Hai=1 đến Chủ Nhật=7).
- Giờ địa phương rơi vào khoảng DST bị bỏ qua sẽ được dời tới thời điểm hợp lệ kế tiếp; giờ bị lặp chọn instant sớm hơn.
- Lịch một lần bị lỡ khi server dừng sẽ được thực thi một lần sau khi worker chạy lại. Các occurrence lặp bị lỡ được gộp thành occurrence hợp lệ mới nhất.
- `clientRequestId` thuộc phạm vi người gửi: cùng key và cùng payload trả lại command cũ; payload khác trả `409 IDEMPOTENCY_KEY_REUSED`.
- Lỗi tạm thời retry sau 1, 2, 4, 8 và 16 giây; sau năm lần retry thì command chuyển `FAILED`. Lỗi người nhận không còn đủ điều kiện chuyển `BLOCKED`.

## Độ bền và ranh giới bàn giao

Tạo command và occurrence nằm trong cùng transaction. Worker claim bằng khóa và lease để nhiều process hoặc lần chạy lại không tạo hai inbox item cho cùng occurrence. Việc ghi inbox và hàng outbox nằm trong một transaction; worker chỉ đánh dấu occurrence `persisted` sau khi nhận được item ID. Nếu mất phản hồi sau commit, lần thử lại dùng cùng occurrence và trả lại inbox item hiện có.

Outbox là dữ liệu bàn giao bền vững cho consumer tương lai. Phạm vi hiện tại chưa phát sự kiện realtime và chưa gọi push provider. Vì vậy trạng thái lưu inbox, push provider chấp nhận, hệ điều hành hiển thị và read state là các khái niệm riêng.

DTO nằm trong `packages/types`, schema boundary trong `packages/validation`, transport trong `packages/api-client`; mã tính năng nằm trong feature/module hiện có. Migration mở rộng status command và occurrence, backfill snapshot từ inbox hiện tại, đồng thời tạo outbox. Migration rollback từ chối khi còn công việc chưa thể biểu diễn bằng schema cũ hoặc outbox chưa được phát hành.

## Kiểm tra nghiệm thu

Kiểm thử cần bao phủ contract và idempotency, quyền người nhận, worker chạy đồng thời, khôi phục sau restart, coalescing lịch lặp, DST, retry/backoff, mất phản hồi sau khi inbox commit, tranh chấp hủy và ownership của inbox. Chạy lint, typecheck và test cho API/mobile. Kiểm tra luồng native Android/iOS trên thiết bị hoặc simulator trước khi xác nhận nghiệm thu; không suy ra kết quả thiết bị từ test mô phỏng.
