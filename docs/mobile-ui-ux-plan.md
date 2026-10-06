# NEXA — Hướng dẫn duyệt UI/UX mobile

Nguồn yêu cầu sản phẩm là task “Audit and Align Project Documentation with the Confirmed Notification App Product Scope” do người dùng cung cấp đầu cuộc chat và các xác nhận trực tiếp sau đó. [PRD](product-requirements.md) ghi lại những yêu cầu này.

## Vai trò của mẫu UI

HTML/CSS chỉ là mẫu dùng để duyệt và chốt UI/UX. Nội dung, tên màn, số màn, dữ liệu minh họa, menu hoặc thao tác trong mẫu không xác định mục đích app, phạm vi tính năng, nghiệp vụ, API, data model, roadmap hay trạng thái triển khai.

Không chuyển nội dung mẫu thành yêu cầu sản phẩm. Không coi khác biệt giữa một mẫu và PRD là quyết định thay đổi scope. Nếu cần bổ sung hành vi chưa được người dùng xác nhận, ghi câu hỏi để chốt riêng.

## Các luồng cần thể hiện từ yêu cầu đã xác nhận

- Đăng ký/xác thực; quản lý hồ sơ và cài đặt tài khoản được chốt.
- Tìm tài khoản; gửi/nhận lời mời kết bạn; chấp nhận, từ chối, hủy lời mời đã gửi; danh sách bạn và hủy kết bạn.
- Tạo thông báo cho bản thân hoặc bạn đã kết nối; gửi ngay, hẹn giờ và cấu hình lặp lại; quản lý lịch theo chính sách được chốt.
- Inbox: danh sách nhận, số chưa đọc, đọc/chưa đọc, đọc tất cả, xóa, phân trang và mở đích liên quan.
- Các sự kiện đã nêu trong brief: nhận lời mời, lời mời được chấp nhận, thông báo từ bạn, thông báo hẹn giờ và mỗi lần lặp.

Danh sách này là luồng nghiệp vụ từ brief, không ấn định số lượng màn hoặc navigation bằng bộ mẫu có sẵn.

## Thông báo ở ba trạng thái

Yêu cầu bổ sung của người dùng xác nhận hỗ trợ Android/iOS khi đang mở, chạy nền/khóa màn hình và đã đóng:

| Trạng thái             | Hành vi UI/UX cần chốt                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| Đang mở                | Inbox/count cập nhật realtime; thống nhất hiển thị trong app và push để tránh cảnh báo trùng.          |
| Chạy nền/khóa màn hình | Cảnh báo native push theo quyền/settings của hệ điều hành; nội dung hiển thị và mức riêng tư cần chốt. |
| Đã đóng                | Tap thông báo mở app, khôi phục/yêu cầu đăng nhập, kiểm tra quyền rồi mở đích liên quan.               |

Cần thể hiện tình trạng quyền thông báo bị từ chối, đồng bộ inbox khi mở lại và đích không còn truy cập được. Không hứa luôn hiển thị đúng giờ khi thiếu quyền, mạng hoặc bị OS hạn chế. Provider và chi tiết presentation chưa được chọn.

## Cách sử dụng tài liệu

Dùng shared design tokens hiện có cho phần thị giác. Kiểm chứng khả năng đã triển khai bằng mã nguồn và test tương ứng, không bằng mẫu. Xem [API](api-contracts.md), [kiến trúc](architecture.md) và [roadmap](roadmap.md) để phân biệt hiện trạng với công việc cần làm.

Mọi số màn, bố cục và thành phần trong HTML chỉ phục vụ duyệt UI/UX; không bổ sung phạm vi sản phẩm.
