# Chức năng và màn hình NEXA

Phạm vi MVP cho ứng dụng Android/iOS dùng chung backend, dựa trên task brief và các xác nhận của người dùng. Đây là yêu cầu sản phẩm, không khẳng định tính năng đã được triển khai. Hiện đăng nhập/đăng ký và session mới có UI một phần; backend còn stub.

## Chức năng chính

- Tạo tài khoản, đăng nhập/đăng xuất và khôi phục session.
- Xem/sửa thông tin và cài đặt của chính tài khoản.
- Tìm người dùng; gửi, nhận, chấp nhận, từ chối hoặc hủy lời mời kết bạn; xem danh sách bạn và hủy kết bạn.
- Tạo thông báo cho bản thân hoặc bạn đã chấp nhận: gửi ngay, lên lịch một lần hoặc lặp lại.
- Nhận và xem inbox/lịch sử, số chưa đọc; đánh dấu đã đọc/chưa đọc, đánh dấu tất cả đã đọc, xóa và xem các trang lịch sử.
- Cập nhật inbox khi đang mở app; nhận push native khi app chạy nền hoặc đã đóng; đồng bộ thông báo bị lỡ khi mở lại.
- Mở đúng nội dung/màn hình được phép khi chạm thông báo, kể cả sau khi khởi động app; yêu cầu đăng nhập lại nếu cần.

## Màn hình cần có

| Màn hình            | Chức năng chính                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| Đăng nhập / Đăng ký | Tạo tài khoản, đăng nhập và hiển thị lỗi nhập liệu/xác thực.                                          |
| Inbox / Trang chính | Xem thông báo và số chưa đọc; mở thông báo; đọc/chưa đọc, đọc tất cả, xóa và tải thêm lịch sử.        |
| Tạo thông báo       | Chọn bản thân/bạn bè đã chấp nhận, nội dung và gửi ngay, lên lịch hoặc lặp lại.                       |
| Tìm người dùng      | Tìm tài khoản theo trường được phép và gửi lời mời kết bạn.                                           |
| Bạn bè / Lời mời    | Xem bạn bè, lời mời đến/đi; chấp nhận, từ chối, hủy hoặc hủy kết bạn.                                 |
| Hồ sơ / Cài đặt     | Xem và sửa các trường thuộc tài khoản của mình đã được xác nhận.                                      |
| Đích thông báo      | Mở nội dung liên quan đã được cấp quyền từ inbox/push; xử lý mục đã xóa hoặc không còn truy cập được. |

Push permission và cài đặt thông báo hệ điều hành dùng giao diện native của Android/iOS, không cần màn hình riêng. Cần phân biệt thông báo đã lưu trong inbox, trạng thái đọc và kết quả gửi push; không bảo đảm OS luôn hiển thị khi quyền bị từ chối hoặc thiết bị bị hạn chế.

Chưa đưa vào danh sách: web app, dashboard/admin, email/SMS/Web Push và các chức năng tài khoản chưa được duyệt như khôi phục mật khẩu. Chi tiết chính sách lịch lặp, tìm kiếm và cài đặt ngoài các trường hồ sơ hiện có vẫn cần quyết định trước khi triển khai.
