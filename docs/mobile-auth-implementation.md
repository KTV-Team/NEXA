# Xác thực mobile — hiện trạng triển khai và hợp đồng cần nối

Ngày kiểm tra tài liệu: 06/10/2026. Tài liệu này mô tả bằng chứng từ mã nguồn; không lấy HTML hoặc mẫu UI làm yêu cầu sản phẩm. Nguồn nghiệp vụ là task brief người dùng cung cấp và các xác nhận bổ sung được ghi trong [PRD](product-requirements.md).

## Hiện trạng mobile

Mã nguồn có màn đăng nhập/đăng ký native, validation qua packages/validation, session provider, protected routes và trang hiển thị thông tin phiên/đăng xuất. Đây là triển khai một phần của N01, chưa phải xác thực đầu cuối với backend thật.

- DTO đăng ký gửi tên/email/mật khẩu; xác nhận mật khẩu là dữ liệu form, không gửi role do client tự chọn.
- AuthService dùng shared Fetch client, kiểm tra shape phản hồi, lưu phiên theo lựa chọn ghi nhớ và làm mới token trước request khi gần hết hạn.
- Native lưu phiên bằng SecureStore; không lưu mật khẩu. Không ghi nhớ thì giữ phiên trong bộ nhớ. Browser preview dùng sessionStorage theo tab để phục vụ phát triển.
- Khi restore, lấy user từ API; phiên hỏng/bị từ chối được xóa, lỗi mạng giữ dữ liệu đã lưu để người dùng thử lại.
- Logout cố xóa phiên local kể cả khi request server thất bại; thu hồi phiên server vẫn cần backend thật.
- Trang sau đăng nhập chỉ hiển thị thông tin tài khoản/đăng xuất; chưa có luồng inbox hoặc quản lý bạn bè.

Bằng chứng: [AuthService](../apps/mobile/src/features/auth/auth-service.ts), [AuthProvider](../apps/mobile/src/features/auth/auth-provider.tsx), [storage](../apps/mobile/src/features/auth/session-storage.ts), [routing](../apps/mobile/app/_layout.tsx), [session landing](../apps/mobile/src/features/auth/screens/account-session/account-session-screen.tsx), [shared validation](../packages/validation/src/index.ts), [registration form schema](../apps/mobile/src/features/auth/screens/register/register-form-schema.ts).

Các chức năng tài khoản bổ sung như recovery/reset phải được xác nhận riêng; một đường dẫn hoặc dialog trong UI không xác nhận tính năng backend.

## Hợp đồng mà client hiện yêu cầu

Base URL lấy từ EXPO_PUBLIC_API_URL, gồm /api/v1. Client gửi JSON và bearer token khi có phiên. Đây là kỳ vọng từ mã client, không phải các route server đã hoàn thiện.

| Method/path         | Request                          | Data client cần                              | Hiện trạng server                                          |
| ------------------- | -------------------------------- | -------------------------------------------- | ---------------------------------------------------------- |
| POST /auth/login    | LoginDto: email/password         | AuthResponse                                 | Stub, không kiểm tra mật khẩu; raw response thiếu envelope |
| POST /auth/register | RegisterDto: name/email/password | AuthResponse                                 | Chưa có controller                                         |
| POST /auth/refresh  | refreshToken                     | AuthTokens                                   | Stub token cố định; không validate/rotation thật           |
| GET /users/me       | Bearer khi có phiên              | User thuộc phiên                             | Stub luôn chọn sample user đầu tiên; chưa có ownership     |
| POST /auth/logout   | Bearer khi có phiên              | HTTP 204 hoặc success envelope với data null | 204 nhưng chưa revoke token                                |

Shared client yêu cầu success envelope `{ success: true, data: T }`, hoặc lỗi `{ success: false, error: { code, message, details? } }`; HTTP 204 không parse JSON. Timeout mặc định 15 giây. Response 200 thiếu envelope bị từ chối thay vì coi là đăng nhập thành công.

Các contract và gap được tách chi tiết trong [API contracts](api-contracts.md). Schema phía mobile không thay thế validation, authentication và authorization tại API.

## Bằng chứng kiểm thử và giới hạn

[auth-service.test.ts](../apps/mobile/src/features/auth/auth-service.test.ts) kiểm tra shared DTO/schema, envelope và stub rejection, HTTP 204/timeout, lưu phiên không lưu mật khẩu, ghi nhớ bật/tắt, restore/refresh, dữ liệu phiên hỏng/bị từ chối, mất mạng và logout lỗi. Kiểm tra riêng quy tắc confirm-password nằm cạnh màn đăng ký trong [register-form-schema.test.ts](../apps/mobile/src/features/auth/screens/register/register-form-schema.test.ts). Các test dùng transport/storage mock; đây là bằng chứng test code tồn tại, không phải chứng nhận runtime backend hoặc native.

Audit tài liệu này không chạy lại test/build. Browser preview không xác minh native SecureStore qua restart, bàn phím/accessibility native, signed binary hay push khi app nền/đóng. Những kiểm tra này phải hoàn thành khi tích hợp theo [roadmap](roadmap.md).

## Tích hợp auth và native push cần làm

Người dùng đã xác nhận thông báo phải hoạt động khi đang mở, chạy nền/khóa màn hình và đã đóng. Push native chưa được triển khai.

Khi triển khai cần bind token đúng tài khoản đã xác thực, xử lý rotation/token không hợp lệ và logout/đổi tài khoản. Tap push từ app nền/đóng phải restore hoặc yêu cầu đăng nhập rồi kiểm tra quyền với đích. Không coi test auth hiện có là bằng chứng đã kiểm tra vòng đời push token hoặc delivery ở ba trạng thái.
