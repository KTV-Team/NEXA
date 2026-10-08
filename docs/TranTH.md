# TranTH — Tài khoản và kết bạn

## 1. Chức năng và màn hình

| Màn hình | Công việc |
| --- | --- |
| `/register` | Đăng ký bằng `email`, `name`, `password`; xác nhận mật khẩu chỉ ở UI; hiển thị lỗi và tạo session khi thành công. |
| `/login` | Đăng nhập, ghi nhớ phiên; khôi phục session khi mở app, refresh khi hết hạn. |
| `/account` | Xem hồ sơ, sửa `name`/`avatarUrl`, đăng xuất; cập nhật dữ liệu tài khoản trên app. |
| `/user-search` | Tìm theo trường được phép; hiển thị thông tin được phép và trạng thái quan hệ; gửi lời mời. |
| `/friends` | Danh sách bạn, lời mời đến/đi; chấp nhận, từ chối, hủy lời mời, hủy kết bạn. |

Mỗi màn hình có loading, lỗi/thử lại; danh sách có trạng thái rỗng và tải thêm. Khóa thao tác đang gửi để tránh bấm trùng.

## 2. API contract

Đường dẫn tính từ API base URL. Giữ contract auth/hồ sơ hiện có; các dòng ghi **mới** là đề xuất. API bảo vệ dùng `Authorization: Bearer <accessToken>`; đăng ký/đăng nhập công khai, refresh xác thực bằng `refreshToken`.

| Method / endpoint | Đầu vào | Kết quả `data` |
| --- | --- | --- |
| `POST /auth/register` | `{ email, name, password }` | `AuthResponse`; bổ sung route backend theo client hiện có |
| `POST /auth/login` | `{ email, password }` | `AuthResponse` |
| `POST /auth/refresh` | `{ refreshToken }` | `AuthTokens` |
| `POST /auth/logout` | Phiên hiện tại | `204`, thu hồi phiên |
| `GET /users/me` | — | `User` |
| `PATCH /users/me` | `{ name?, avatarUrl? }` | `User` đã cập nhật |
| **Mới:** `GET /users/search` | Query `q, page, limit` | `List<UserSummary>` |
| **Mới:** `POST /friend-requests` | `{ recipientId }` | `FriendRequest` |
| **Mới:** `GET /friend-requests` | Query `direction=incoming\|outgoing, page, limit` | `List<FriendRequest>` đang chờ |
| **Mới:** `PATCH /friend-requests/:id` | `{ action: accept\|reject\|cancel }` | `FriendRequest` sau chuyển trạng thái |
| **Mới:** `GET /friends` | Query `page, limit` | `List<UserSummary>` bạn đã chấp nhận |
| **Mới:** `DELETE /friends/:userId` | ID người bạn | `204`, hủy quan hệ |

Response theo transport hiện có: thành công `{ success: true, data }`; lỗi `{ success: false, error: { code, message, details? } }`; `204` không có body.
`List<T> = { data: T[], meta: { page, limit, total, totalPages } }`, nằm trong `data` của response.
Mã lỗi đề xuất: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 EMAIL_EXISTS/RELATION_CONFLICT`.

## 3. Trường dữ liệu và biến cần có

`?` = tùy chọn; ID là chuỗi, thời gian API dùng ISO 8601. Tái sử dụng dữ liệu hiện có; đối chiếu entity/migration trước khi bổ sung.

| Đối tượng | Trường |
| --- | --- |
| `User` hiện có | `id`, `email`, `name`, `avatarUrl?`, `createdAt`, `updatedAt`; `role` là scaffold, không dùng để mở rộng quyền sản phẩm |
| `AuthTokens` hiện có | `accessToken: string`, `refreshToken: string`, `expiresIn: number` (giây) |
| `AuthResponse` hiện có | `{ user: User, tokens: AuthTokens }` |
| Session/state mobile hiện có | Session: `user`, `tokens`, `expiresAt` (epoch ms); state: `remember: boolean`; lưu bằng SecureStore khi ghi nhớ |
| Session server đề xuất | `id`, `userId`, `refreshTokenHash`, `expiresAt`, `revokedAt?`; mật khẩu lưu dạng hash, không trả qua API |
| `UserSummary` đề xuất | `id`, `name`, `avatarUrl?`, `relationship: none\|incoming\|outgoing\|friend`, `requestId?`; không trả email mặc định |
| `FriendRequest` đề xuất | `id`, `senderId`, `recipientId`, `status: pending\|accepted\|rejected\|cancelled`, `createdAt`, `updatedAt` |
| Quan hệ bạn bè đề xuất | `id`, `userAId`, `userBId`, `createdAt`; cặp người dùng duy nhất, không phụ thuộc thứ tự |
| State UI | `values`, `fieldErrors`, `loading`, `submitting`, `error`; danh sách thêm `items`, `page`, `hasMore`; bạn bè thêm `activeTab` |

## 4. Quy tắc bắt buộc

- Validate tại backend bằng schema chung. Schema đăng ký hiện có: email trim/lowercase; tên 2–100 ký tự; mật khẩu 8–128 ký tự, có chữ hoa/thường và số.
- Chỉ xem/sửa hồ sơ của mình. Backend lấy người thao tác từ session; không nhận `senderId` hoặc quyền từ client.
- Chỉ người nhận được accept/reject; chỉ người gửi được cancel khi lời mời còn pending. Chỉ thành viên quan hệ được hủy kết bạn.
- Không tự kết bạn, tạo lời mời trùng hoặc kết bạn trùng. Accept/cancel đồng thời phải cho một kết quả nhất quán; accept và tạo quan hệ trong cùng transaction.
- Session bị thu hồi/hết hiệu lực yêu cầu đăng nhập lại; lỗi mạng cho phép thử lại. Đăng xuất xóa phiên local; response refresh đến muộn không được khôi phục phiên đã thoát.

## 5. Bàn giao và nghiệm thu

- TranTH sở hữu auth/users/friendships; DTO ở `packages/types`, schema ở `packages/validation`, transport ở `packages/api-client`; giữ cấu trúc feature hiện có.
- VanLT dùng danh sách bạn và provider kiểm tra quan hệ được TranTH export qua module; không tự viết lại logic kết bạn. KhangDL thống nhất với TranTH việc gỡ liên kết device token khi logout/đổi tài khoản; KhangDL sở hữu push/inbox.
- Thứ tự: auth/session → hồ sơ → tìm kiếm/kết bạn. Bàn giao contract auth và quan hệ trước để VanLT/KhangDL triển khai song song.
- Nghiệm thu trên Android/iOS với API thật: đăng ký/đăng nhập/restore/logout, sửa hồ sơ, đủ chuyển trạng thái kết bạn; test quyền sở hữu, yêu cầu trùng và thao tác đồng thời. Lint/typecheck/test phần thay đổi phải pass.
- Leader xác nhận trước triển khai phần liên quan: trường và cách khớp tìm kiếm, giới hạn phân trang, thời hạn/rotation token, chính sách gửi lại/gửi chéo lời mời và các cài đặt ngoài hồ sơ. Nếu đã chốt ở tài liệu khác, dẫn nguồn tại đây.
