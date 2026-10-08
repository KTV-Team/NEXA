# KhangDL — Inbox, realtime và native push

## 1. Chức năng và màn hình

| Phần                              | Công việc                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `/` — Inbox                       | Danh sách/lịch sử, tải thêm, số chưa đọc; đọc/chưa đọc, đọc tất cả, xóa.              |
| `/notification-target?itemId=...` | Tải đúng nội dung được phép; xử lý thiếu ID, mục đã xóa hoặc không có quyền.          |
| App đang mở                       | Cập nhật inbox qua realtime; gộp tín hiệu realtime/push trùng nhau.                   |
| App chạy nền/đã đóng              | Nhận native push Android/iOS; quản lý permission và device token.                     |
| Mở lại/chạm push                  | Đồng bộ inbox; xử lý tap khi app đang chạy hoặc khởi động mới, đăng nhập lại nếu cần. |

Màn hình có loading, empty, lỗi/thử lại và tải thêm. Permission/cài đặt OS dùng giao diện native, không tạo màn hình riêng.

## 2. API contract đề xuất

Đường dẫn tính từ API base URL; mọi endpoint xác thực bằng Bearer token của TranTH. Chủ sở hữu lấy từ session.

| Method / endpoint                 | Đầu vào                                     | Kết quả `data`                                               |
| --------------------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| `GET /inbox`                      | Query `page, limit`                         | `List<InboxItem>`, mới nhất trước, thứ tự ổn định            |
| `GET /inbox/unread-count`         | —                                           | `{ unreadCount: number }`                                    |
| `GET /inbox/:itemId`              | ID mục của mình                             | `InboxItem`                                                  |
| `PATCH /inbox/:itemId`            | `{ isRead: boolean }`                       | `InboxItem` đã cập nhật                                      |
| `POST /inbox/read-all`            | —                                           | `{ updatedCount: number }`; các mục trong snapshot lúc xử lý |
| `DELETE /inbox/:itemId`           | ID mục của mình                             | `204`, xóa riêng khỏi inbox                                  |
| `PUT /devices/:installationId`    | `{ platform, pushToken, permissionStatus }` | `{ installationId, registered: boolean }`                    |
| `DELETE /devices/:installationId` | Thiết bị thuộc tài khoản hiện tại           | `204`, gỡ đăng ký push                                       |

Response và `List<T>` theo [mẫu của TranTH](member-a-spec.md). Mã lỗi đề xuất: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.
URL/transport realtime chốt riêng; kết nối phải xác thực và chỉ phát dữ liệu của chính tài khoản.

## 3. Trường dữ liệu và biến cần có

`?` = tùy chọn; ID là chuỗi; thời gian dùng ISO 8601 UTC. Đối chiếu entity/migration hiện có trước khi bổ sung.

| Đối tượng               | Trường đề xuất                                                                                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `InboxItem`             | `id` (= `itemId`), `occurrenceId`, `notificationId`, `senderId`, `recipientId`, `title`, `body`, `createdAt`, `readAt: string\|null`; `deletedAt` nội bộ                                      |
| Device registration     | `installationId`, `userId`/`sessionId` từ server, `platform: android\|ios`, `pushToken: string\|null`, `permissionStatus`, `updatedAt`; enum permission thống nhất với adapter native đã chọn |
| Công việc push bền vững | `id`, `itemId`, `installationId`, `status: pending\|accepted\|failed\|skipped`, `attemptCount`, `retryAt?`, `providerMessageId?`, `lastError?`                                                |
| Realtime event          | `eventId`, `kind: created\|updated\|deleted\|resync`, `itemId?`; client tải lại dữ liệu cần thiết từ API                                                                                      |
| Push data               | `{ itemId, occurrenceId }`; dùng để đồng bộ/điều hướng, không thay kiểm tra quyền                                                                                                             |
| State UI                | `items`, `unreadCount`, `page`, `hasMore`, `loading`, `refreshing`, `error`, `pendingTapItemId`, `permissionStatus`                                                                           |

`accepted` = provider chấp nhận push, không chứng minh OS đã hiển thị. `readAt` do thao tác đọc quyết định, không suy ra từ gửi/nhận push.

## 4. Quy tắc bắt buộc

- Chỉ tài khoản sở hữu được đọc/sửa/xóa inbox; mục xóa không còn trong danh sách/số chưa đọc. Xóa inbox không hủy lịch của VanLT và không được tạo lại khi retry.
- Export provider nội bộ `persistDelivery({ occurrenceId, notificationId, senderId, recipientId, title, body })` → `{ itemId }`, giống [spec VanLT](member-b-spec.md). Một `(occurrenceId, recipientId)` chỉ tạo một inbox item.
- Lưu inbox và công việc phát tín hiệu bền vững trong cùng transaction trước khi trả `itemId`; phát realtime/push sau commit. Lỗi push hoặc không có thiết bị không làm mất inbox.
- Đăng ký token cho tài khoản hiện tại; xử lý token rotation, token hết hiệu lực, logout/đổi tài khoản và job đang chờ. Kiểm tra lại chủ sở hữu token trước khi gửi, không gửi sang tài khoản mới trên cùng thiết bị.
- Khi mở lại/reconnect, lấy dữ liệu và số chưa đọc từ backend; gộp theo `itemId`, không tăng đếm hai lần vì realtime/push. Đọc/xóa cập nhật lại số đếm theo server.
- Tap giữ `itemId` qua bước khôi phục/đăng nhập, rồi tải nội dung có kiểm tra quyền. Payload push không được tự cấp quyền hoặc mở URL tùy ý.
- Kiểm thử ba trạng thái bình thường: mở, nền/khóa màn hình, đóng. Quyền bị từ chối, mất mạng, giới hạn OS hoặc Force stop có thể ngăn hiển thị push; inbox vẫn phải lưu bền vững.

## 5. Bàn giao và nghiệm thu

- KhangDL sở hữu inbox/read state, provider `persistDelivery`, realtime, device registration và push. VanLT sở hữu tạo thông báo/lịch/occurrence; TranTH sở hữu auth/session. KhangDL phối hợp hook logout/đổi tài khoản với TranTH, không viết lại auth.
- DTO ở `packages/types`, schema ở `packages/validation`, transport ở `packages/api-client`; giữ feature notifications hiện có. KhangDL sở hữu migration inbox/device/push, VanLT sở hữu command/occurrence; phối hợp file chung trước khi sửa.
- Thứ tự: inbox + provider cho VanLT → đọc/xóa/phân trang → realtime/resume → push/token/tap. Không coi chỉ realtime là hoàn thành MVP.
- Nghiệm thu với API thật và push thật trên Android/iOS ở cả ba trạng thái; test truy cập chéo tài khoản, retry VanLT/KhangDL, token đổi chủ, tín hiệu trùng, permission denied, push failure, cold/warm tap và mục đã xóa. Lint/typecheck/test phần thay đổi phải pass.
- Leader xác nhận hoặc dẫn nguồn trước triển khai: provider native push, transport realtime, giới hạn phân trang, retry và cách hiển thị khi app mở. Chỉ chọn dependency sau khi kiểm tra manifest và phương án tích hợp thực tế.
