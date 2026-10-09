# KhangDL — Inbox, realtime và native push

## Phạm vi

- `/` hiển thị inbox có phân trang, số chưa đọc, đánh dấu đã/chưa đọc, đọc tất cả và xóa riêng khỏi inbox.
- `/notification-target?itemId=...` tải nội dung qua API có xác thực; không dùng payload push để cấp quyền hoặc tải URL tùy ý.
- Khi app foreground, WebSocket làm mới inbox và không hiện banner native trùng.
- Khi app background hoặc đóng, Expo Push Service gửi native push cho Android/iOS. Quyền OS quyết định hệ điều hành có thể hiển thị push hay không.
- Khi mở lại app hoặc chạm push, app đồng bộ inbox. Tap giữ `itemId` qua quá trình khôi phục phiên/đăng nhập rồi tải lại nội dung từ API.

## Quyết định đã xác nhận

| Chủ đề | Quyết định |
| --- | --- |
| Native push | Expo Push Service; Android/iOS native token và quyền OS |
| Realtime | WebSocket tại `/api/v1/inbox/events`; xác thực bằng frame `authenticate` chứa access token sau khi kết nối |
| Đánh dấu đã đọc | Giữ contract hiện hành `{ "read": boolean }` |
| App foreground | Cập nhật inbox qua realtime; ẩn banner/list native để tránh báo trùng |
| Lock screen | Push có title và body; đây là nội dung người nhận đã được phép xem trong inbox |
| Mở inbox item | Tải item thành công rồi gửi API đánh dấu đã đọc |
| Push retry | Một lần gửi ban đầu và tối đa 5 lần thử lại sau 5/15/45/135/405 giây, có jitter ±20% |
| Phân trang | Mặc định `page=1&limit=20`, giới hạn `limit` là 100 |

## API và contract

Các route inbox dùng Bearer access token và lấy chủ sở hữu từ session. `GET /inbox/:itemId` chỉ đọc, không tự đổi trạng thái. API hiện dùng `404 INBOX_ITEM_NOT_FOUND` cho item không tồn tại, đã xóa hoặc không thuộc người gọi.

| Method và route | Đầu vào | Kết quả |
| --- | --- | --- |
| `GET /inbox?page=1&limit=20&read=true\|false` | Bộ lọc đọc tùy chọn | Trang inbox, mới nhất trước |
| `GET /inbox/unread-count` | — | `{ unreadCount }` |
| `GET /inbox/:itemId` | ID inbox | `InboxItem`, không tự đánh dấu đã đọc |
| `PATCH /inbox/:itemId` | `{ "read": boolean }` | `InboxItem` đã cập nhật |
| `POST /inbox/read-all` | — | `{ updatedCount }` |
| `DELETE /inbox/:itemId` | ID inbox | `204`, soft-delete item của caller |
| `PUT /devices/:installationId` | `{ platform, pushToken, permissionStatus }` | `{ installationId, registered }` |
| `DELETE /devices/:installationId` | ID cài đặt của caller | `204` |

`InboxItem` trả về `id`, `notificationId`, `occurrenceId`, `sender`, `title`, `body`, `scheduledFor`, `deliveredAt` và `readAt`. Inbox delete không hủy notification/lịch nguồn và retry không tạo lại item đã lưu. Mỗi `(occurrenceId, recipientId)` chỉ tạo một item.

DTO nằm ở `packages/types`, boundary schemas ở `packages/validation`, HTTP transport ở `packages/api-client`. Device registration gắn installation với tài khoản và session đã xác thực; logout gỡ registration trước khi thu hồi session. Worker kiểm tra lại chủ sở hữu, session và token trước khi gửi.

## Xử lý bền vững và trạng thái

`NotificationDeliveryService.persistDelivery` ghi inbox item cùng event outbox trong transaction. Sau commit, `InboxDeliveryWorker` xử lý outbox, tạo push job và phát `pg_notify`; WebSocket gateway chỉ gửi event ID, kind và item ID đến các socket thuộc đúng user/session. Client tải lại dữ liệu từ API. Realtime mất kết nối được nối lại; khi nối lại hoặc khi app resume, client đồng bộ inbox và số chưa đọc từ backend.

Push job lưu riêng trạng thái provider: `pending`, `accepted`, `failed` hoặc `skipped`. `accepted` chỉ có nghĩa Expo chấp nhận ticket, không khẳng định OS đã hiển thị. Receipt được kiểm tra sau khoảng 15 phút; receipt còn thiếu được đánh dấu hết hạn sau 24 giờ. `DeviceNotRegistered` vô hiệu hóa token đã dùng. Lỗi push, quyền bị từ chối hoặc không có thiết bị không làm mất inbox item.

Worker chạy trong backend, poll PostgreSQL mỗi giây và claim tối đa 50 event/job mỗi lượt bằng row lock/lease. `NOTIFICATION_WORKER_ENABLED=false` tắt worker; mặc định bật ngoài môi trường test. `EXPO_ACCESS_TOKEN` là tùy chọn để xác thực request tới Expo Push Service. Mobile cần `EXPO_PUBLIC_EAS_PROJECT_ID` cùng APNs/FCM credentials phù hợp trong EAS để cấp Expo push token.

## Files và migration

- Realtime gateway, push adapter và worker thuộc `apps/api/src/social/`.
- Inbox/device/push contracts và validation ở `packages/types`, `packages/validation`, `packages/api-client`.
- Runtime đăng ký token, WebSocket, resume và tap nằm ở `apps/mobile/src/notifications/`; màn hình thuộc feature notifications.
- `1791600000000-AddInboxRealtimePush` mở rộng outbox và thêm device registration/push job tables. Chạy migration rõ ràng bằng `pnpm --filter @nexa/api db:migration:run`.

## Nghiệm thu

Code lint/typecheck/test phải pass cho API, mobile và các package phụ thuộc. Kiểm tra API cần xác nhận quyền sở hữu chéo, chuyển installation giữa tài khoản, duplicate event/delivery, retry/receipt failure và item đã xóa. Trên thiết bị thật Android và iOS, kiểm tra app mở, background/khóa màn hình, terminated, permission denied, mất mạng, token rotation, warm/cold tap và đăng nhập lại.

Các credential EAS/APNs/FCM, API production, và thiết bị thật là cấu hình môi trường triển khai. Chưa coi push OS hiển thị hay hành vi lifecycle trên thiết bị là đã xác minh chỉ từ typecheck hoặc test backend. Quyền bị từ chối, mất mạng, giới hạn OS hoặc Force stop có thể ngăn OS hiển thị push; inbox vẫn được lưu bền vững trên backend.
