# NEXA Mobile

Expo + React Native + TypeScript trong workspace pnpm/Turborepo. Trạng thái triển khai bên dưới được kiểm chứng từ mã nguồn mobile/API, không suy ra từ mẫu giao diện.

Sản phẩm hiện được xác nhận là ứng dụng **thông báo cá nhân và quản lý bạn bè cho Android/iOS**, dùng chung backend. Xem [PRD](../../docs/product-requirements.md), [kiến trúc](../../docs/architecture.md), [API](../../docs/api-contracts.md) và [roadmap](../../docs/roadmap.md). Bạn bè, gửi ngay/hẹn giờ/lặp lại, inbox, realtime và native push là yêu cầu chưa triển khai. Thông báo phải hỗ trợ cả đang mở, chạy nền/khóa màn hình và đã đóng app trên Android/iOS. Nguồn yêu cầu duy nhất là task brief người dùng cung cấp đầu cuộc chat và các xác nhận bổ sung. HTML chỉ dùng chốt UI/UX; không quy định mục đích app, tính năng hay nghiệp vụ.

## Phạm vi hiện tại

- Form tiếng Việt, validation khi rời trường/khi gửi, focus vào lỗi đầu tiên, nút hiện/ẩn mật khẩu và checklist mật khẩu trực tiếp.
- Điều hướng đăng nhập/đăng ký, safe area, cuộn và xử lý bàn phím trong mã native hiện có.
- Loading, khóa gửi form khi pending và ánh xạ lỗi kết nối/timeout, thông tin không hợp lệ, email trùng, HTTP 429 từ dịch vụ. Đây không phải bằng chứng backend đã chống trùng hoặc giới hạn thử lại.
- Session provider, kiểm tra phiên khi mở app, refresh token trước request khi sắp hết hạn, route bảo vệ và đăng xuất.
- Native dùng Expo SecureStore; không lưu mật khẩu. Bỏ chọn duy trì đăng nhập chỉ giữ phiên trong bộ nhớ. Web preview dùng `sessionStorage` trong tab hiện tại.
- Noto Sans 400/500/600 đóng gói trong app, dùng được offline, theo fallback của DESIGN.md.

**Backend xác thực hiện vẫn là stub.** Chưa có đăng ký thật, kiểm tra mật khẩu/token hay quyền sở hữu; response chưa đúng hợp đồng shared API client. App sẽ báo lỗi khi dịch vụ chưa sẵn sàng hoặc trả sai hợp đồng. Không có tài khoản mẫu hay chế độ đăng nhập giả trong mobile; API có dữ liệu người dùng mẫu trong bộ nhớ.

Trang `/` chỉ hiển thị tài khoản/đăng xuất sau phản hồi API hợp lệ, chưa phải inbox hay trang quản lý bạn bè. N01 (xác thực trong PRD) chưa hoàn tất đầu cuối cho đến khi backend thật được nối vào.

## Yêu cầu thông báo trong cả ba trạng thái — chưa triển khai

| Trạng thái app              | Hành vi cần triển khai                                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Đang mở                     | Inbox/count cập nhật realtime; thống nhất hiển thị trong app và push để không tạo bản ghi hoặc cảnh báo trùng.               |
| Chạy nền hoặc khóa màn hình | Hệ điều hành hiển thị native push khi được phép; backend vẫn xử lý lịch/lặp và lưu inbox, không phụ thuộc app chạy liên tục. |
| Đã đóng                     | OS có thể hiển thị push; chạm thông báo khởi động app, khôi phục/yêu cầu đăng nhập rồi mở đích được phép.                    |

Cần thiết kế quyền thông báo, đăng ký/token thiết bị theo tài khoản, rotation/token hết hiệu lực, logout/đổi tài khoản, payload riêng tư trên màn khóa, retry/expiry và đồng bộ inbox khi mở lại. Nhà cung cấp push chưa được chọn; chưa có package/API/config tích hợp push trong repository.

Kiểm thử native phải bao phủ ba trạng thái với thông báo cá nhân/bạn bè/sự kiện xã hội, hẹn giờ và từng lần lặp; thêm trường hợp từ chối quyền, mất mạng, OS hạn chế/Force stop, trùng realtime/push và tap khi app chưa chạy. Inbox backend phải giữ dữ liệu ngay cả khi push không hiển thị. Android Force stop trong Settings cần mở lại app; không coi đó là trạng thái đóng bình thường. Expo browser preview và QA auth cũ không xác minh native push. Xem [tiêu chí PRD](../../docs/product-requirements.md) và [hành vi nền tảng](https://docs.expo.dev/push-notifications/what-you-need-to-know/).

## Chạy từ repository root

```powershell
pnpm install
pnpm dev:app
# Preview tùy chọn trong browser, phục vụ kiểm tra mobile; không phải sản phẩm web:
pnpm --filter @nexa/mobile exec expo start --web
# Native local build, cần Android SDK / macOS + Xcode tương ứng:
pnpm --filter @nexa/mobile android
pnpm --filter @nexa/mobile ios
```

Expo Go cần phiên bản hỗ trợ SDK của dự án. Khi thêm native module hoặc đổi config plugin, rebuild development/native app tương ứng.

## Địa chỉ API

Sao chép `apps/mobile/.env.example` thành `apps/mobile/.env` và đặt `EXPO_PUBLIC_API_URL`. Ví dụ dùng localhost: cần đổi trước khi chạy Android emulator/điện thoại thật. Biến `EXPO_PUBLIC_*` được đóng gói vào client: chỉ chứa URL công khai, không chứa secret. API chưa tự nạp `.env`; override `PORT`/`CORS_ORIGIN` qua environment của process như [README gốc](../../README.md).

| Môi trường          | API URL                                        |
| ------------------- | ---------------------------------------------- |
| Android emulator    | `http://10.0.2.2:4000/api/v1`                  |
| iOS simulator / web | `http://localhost:4000/api/v1`                 |
| Điện thoại thật     | `http://<IP-LAN-của-máy-chạy-API>:4000/api/v1` |
| Release             | URL HTTPS của backend triển khai               |

Nếu không có biến môi trường, app tự chọn địa chỉ emulator tương ứng. Đổi URL cần khởi động lại Metro. Với điện thoại thật, máy API và điện thoại cần truy cập được nhau. Web preview cần backend cho phép CORS origin của Metro.

## Cấu trúc

```text
app/                                      Expo Router routes và layout, không chứa screen implementation
src/features/auth/screens/login/          Screen đăng nhập, cùng code riêng của form
src/features/auth/screens/register/       Screen đăng ký, schema confirm-password và test
src/features/auth/screens/account-session/ Landing phiên đăng nhập hiện có
src/features/auth/components/             UI dùng chung trong feature auth
src/features/auth/hooks/                  Hook form dùng giữa các màn auth
src/features/auth/                        Provider, service, session storage, errors và test
src/components/                           Mỗi UI component dùng chung có file riêng
src/theme/                                Typography adapter dùng shared token
src/config/                               URL môi trường
```

Code chỉ dùng ở một màn hình/component được đặt cạnh nơi sử dụng. Code dùng trong auth giữ ở auth; UI dùng giữa các feature nằm trong `src/components`. DTO nằm trong `packages/types`, schema request chung trong `packages/validation`, HTTP client trong `packages/api-client`, style lấy từ `packages/design-tokens`. Schema xác nhận mật khẩu thuộc màn đăng ký; request chỉ gửi tên/email/mật khẩu, không gửi mật khẩu xác nhận hoặc role do client cung cấp.

## Kiểm tra và build

```powershell
pnpm --filter @nexa/mobile typecheck
pnpm --filter @nexa/mobile lint
pnpm --filter @nexa/mobile test
pnpm --filter @nexa/mobile build
pnpm --filter @nexa/mobile exec expo install --check
```

`build` export bundle Android, iOS và browser preview vào `dist` theo config hiện có; output browser không mở rộng MVP sang web. Đây không phải APK/IPA đã ký. `eas.json` có profile `preview` (Android APK, iOS simulator) và `production`. Native/cloud build cần tài khoản EAS, API và signing phù hợp; audit tài liệu này không chạy build hay xác nhận release.

Hợp đồng client và kết quả QA lịch sử nằm trong [bàn giao auth](../../docs/mobile-auth-implementation.md); trạng thái server hiện có được tách rõ trong [API contracts](../../docs/api-contracts.md).
