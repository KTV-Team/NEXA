# NEXA Mobile

Expo + React Native + TypeScript trong workspace pnpm/Turborepo. M01 (đăng nhập) và M02 (đăng ký) được dựng bằng component native, dựa trên `docs/mobile-design-create-by-gemini/m01-login.html`, `m02-register.html` và `DESIGN.md`.

## Phạm vi hiện tại

- Form tiếng Việt, validation khi rời trường/khi gửi, focus vào lỗi đầu tiên, nút hiện/ẩn mật khẩu và checklist mật khẩu trực tiếp.
- Điều hướng đăng nhập/đăng ký, safe area, cuộn và xử lý bàn phím, CTA từ 44px, bố cục 360/390/430px.
- Loading, ngăn gửi lặp, lỗi kết nối/timeout, thông tin không hợp lệ, email trùng và giới hạn thử lại.
- Session provider, kiểm tra phiên khi mở app, refresh token trước request khi sắp hết hạn, route bảo vệ và đăng xuất.
- Native dùng Expo SecureStore; không lưu mật khẩu. Bỏ chọn duy trì đăng nhập chỉ giữ phiên trong bộ nhớ. Web preview dùng `sessionStorage` trong tab hiện tại.
- Noto Sans 400/500/600 đóng gói trong app, dùng được offline, theo fallback của DESIGN.md.

**Backend chưa được triển khai trong đợt này theo lựa chọn của người dùng.** API hiện tại vẫn là stub; chưa có đăng ký thật và response chưa đúng hợp đồng shared API client. App sẽ báo lỗi phù hợp khi dịch vụ chưa sẵn sàng. Không có tài khoản mẫu hay chế độ đăng nhập giả trong app.

Trang `/` hiện chỉ hiển thị thông tin tài khoản và đăng xuất sau khi nhận phản hồi API hợp lệ. Đây là điểm tiếp nhận phiên, **chưa phải M03 Hôm nay**. F08 chưa hoàn tất từ đầu đến cuối cho đến khi backend thật được nối vào.

## Chạy từ repository root

```powershell
pnpm install
pnpm --filter @nexa/mobile dev
# Preview trong browser:
pnpm --filter @nexa/mobile exec expo start --web
# Native local build, cần Android SDK / macOS + Xcode tương ứng:
pnpm --filter @nexa/mobile android
pnpm --filter @nexa/mobile ios
```

Expo Go cần phiên bản hỗ trợ SDK của dự án. Khi thêm native module hoặc đổi config plugin, rebuild development/native app tương ứng.

## Địa chỉ API

Sao chép `.env.example` thành `.env` và đặt `EXPO_PUBLIC_API_URL`. Biến `EXPO_PUBLIC_*` được đóng gói vào client: chỉ chứa URL công khai, không chứa secret.

| Môi trường          | API URL                                        |
| ------------------- | ---------------------------------------------- |
| Android emulator    | `http://10.0.2.2:4000/api/v1`                  |
| iOS simulator / web | `http://localhost:4000/api/v1`                 |
| Điện thoại thật     | `http://<IP-LAN-của-máy-chạy-API>:4000/api/v1` |
| Release             | URL HTTPS của backend triển khai               |

Nếu không có biến môi trường, app tự chọn địa chỉ emulator tương ứng. Đổi URL cần khởi động lại Metro. Với điện thoại thật, máy API và điện thoại cần truy cập được nhau. Web preview cần backend cho phép CORS origin của Metro.

## Cấu trúc

```text
app/                         Expo Router: layout, login, register, landing phiên
src/components/              Text, button, icon, error notice
src/theme/                   Typography adapter dùng shared token
src/config/                  URL môi trường
src/features/auth/
  screens/                   M01/M02
  components/                Scaffold, input, dialog nhỏ
  auth-service.ts            Transport, refresh và persistence độc lập UI
  auth-provider.tsx          Session state của React
  session-storage.ts         SecureStore / web preview adapter
  use-auth-form.ts           Validation và touched state
  auth-service.test.ts       Kiểm thử contract và phiên
```

DTO nằm trong `packages/types`, schema trong `packages/validation`, HTTP client trong `packages/api-client`, style lấy từ `packages/design-tokens`. Chỉ gửi tên/email/mật khẩu khi đăng ký; mật khẩu xác nhận và role do client cung cấp không nằm trong DTO.

## Kiểm tra và build

```powershell
pnpm --filter @nexa/mobile typecheck
pnpm --filter @nexa/mobile lint
pnpm --filter @nexa/mobile test
pnpm --filter @nexa/mobile build
pnpm --filter @nexa/mobile exec expo install --check
```

`build` export bundle Android, iOS và web vào `dist`; đây không phải APK/IPA đã ký. `eas.json` có profile `preview` (Android APK, iOS simulator) và `production`. Native/cloud build cần thiết lập tài khoản EAS, môi trường API và signing phù hợp; chưa chạy trong đợt này.

Hợp đồng backend và kết quả QA được ghi trong `docs/mobile-auth-implementation.md`.
