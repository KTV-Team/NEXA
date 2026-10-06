# M01/M02 — bàn giao triển khai mobile

Ngày: 06/10/2026. Phạm vi: chuyển M01/M02 từ bộ HTML Gemini thành React Native trong `apps/mobile`. Backend để nối sau theo lựa chọn của người dùng.

## Giao diện và cách chuyển đổi

Giữ nền trắng, logo vàng, heading-3, body-md/body-sm/caption, CTA đen dạng pill, input radius 8px và đường viền focus brand-blue từ shared design tokens. Thay khung điện thoại, status bar/notch/home indicator giả bằng safe area và thanh hệ thống của thiết bị. Font dùng Noto Sans đóng gói theo fallback đã cho phép; không sửa DESIGN.md.

M01/M02 mở với trường trống, không dùng tên/email/mật khẩu điền sẵn của mockup. Checkbox và checklist phản ánh dữ liệu thật. Đường vào quên mật khẩu mở dialog nhỏ thông báo chưa khả dụng, phù hợp phần hoãn F14. Bản mẫu có liên kết `#terms`/`#privacy` nhưng chưa có tài liệu hay URL thực; phần đó dùng hướng dẫn nhập tài khoản, chưa hiển thị tuyên bố người dùng đã chấp thuận điều khoản. Khi có tài liệu chính thức, thêm liên kết và luồng chấp thuận theo chính sách đã chốt.

Ghi chú cuối M01 chỉ mô tả lưu phiên bảo mật trên thiết bị native, không khẳng định backend đã mã hóa/đồng bộ Web-Mobile. Landing sau xác thực là trang thông tin phiên tối thiểu; M03–M14 chưa được triển khai trong phạm vi này.

## Hợp đồng API cần nối

Base URL cấu hình bằng `EXPO_PUBLIC_API_URL`, gồm `/api/v1`. Header `Content-Type: application/json`; request cần xác thực thêm `Authorization: Bearer <accessToken>`.

| Method / path         | Body                        | Data khi thành công                                |
| --------------------- | --------------------------- | -------------------------------------------------- |
| POST `/auth/login`    | `{ email, password }`       | `AuthResponse`                                     |
| POST `/auth/register` | `{ name, email, password }` | `AuthResponse`                                     |
| POST `/auth/refresh`  | `{ refreshToken }`          | `AuthTokens`                                       |
| GET `/users/me`       | Không có                    | `User` của phiên hiện tại                          |
| POST `/auth/logout`   | Không có; bearer token      | HTTP 204, hoặc envelope thành công có `data: null` |

Success envelope:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "name@example.com",
      "name": "Tên người dùng",
      "role": "user",
      "createdAt": "2026-10-06T00:00:00Z",
      "updatedAt": "2026-10-06T00:00:00Z"
    },
    "tokens": {
      "accessToken": "<access-token>",
      "refreshToken": "<refresh-token>",
      "expiresIn": 3600
    }
  }
}
```

Lỗi trả HTTP status thích hợp, kèm:

```json
{ "success": false, "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid credentials" } }
```

Mobile map 400/422, 401/403, 409, 429, lỗi server, timeout và mất mạng thành thông báo tiếng Việt. Endpoint đăng ký chưa tồn tại (404) báo dịch vụ chưa sẵn sàng. Request có timeout 15 giây. Phản hồi 200 thiếu envelope không được nhận là đăng nhập thành công.

Khi mở app, phiên đã lưu được kiểm tra với `/users/me`; token sắp hết hạn được refresh trước. Token refresh được thay bằng token mới nếu server xoay vòng. Phiên bị thu hồi (401/403) được xóa. Lỗi mạng khi khôi phục đưa người dùng về màn đăng nhập với nút thử khôi phục, giữ dữ liệu đã lưu để thử lại. Khi bỏ chọn duy trì, phiên mới chỉ ở bộ nhớ. Đăng xuất luôn cố xóa phiên local, kể cả khi request server thất bại; thu hồi phiên phía server cần backend thật và kết nối thành công.

Backend sau này phải tự validate schema, xác thực mật khẩu, cấp/thu hồi token và enforce ownership. Validation trên mobile không thay thế kiểm tra API. Controller stub hiện tại chưa đáp ứng các điều này; không ghi F08 là đã ship đầy đủ.

## Kết quả kiểm tra

- Typecheck mobile và các shared package đã sửa: đạt.
- ESLint mobile: đạt, không có warning.
- Unit tests: validation, confirmation, DTO, HTTP 204, timeout, từ chối stub response, lưu phiên không lưu mật khẩu, ghi nhớ bật/tắt, không kéo dài expiry khi restore, refresh/rotation, phiên hỏng/bị thu hồi, retry sau mất mạng, xóa phiên khi logout lỗi.
- Expo export bundle Android, iOS và web: đạt. Không phải native binary/signing verification.
- Playwright trên Expo web preview: M01/M02 ở 360/390/430px, không tràn ngang, CTA truy cập được bằng cuộn, label/checkbox ARIA, validation khi submit, checklist, hiện/ẩn mật khẩu, pending khóa form, 401/409/mất mạng và chuyển màn.
- Phản hồi API được mock trong browser kiểm thử để xác minh register/login thành công, DTO chuẩn hóa, restore sau reload, logout và phiên chỉ giữ trong bộ nhớ. Mock không nằm trong app runtime.
- Ảnh kiểm tra nằm trong `output/playwright/` (artifact local).

Chưa kiểm tra runtime trên emulator/điện thoại thật, bàn phím native, VoiceOver/TalkBack, SecureStore qua restart native, APK/IPA hoặc backend thật. Cần kiểm tra các mục này khi tích hợp backend và chuẩn bị release.
