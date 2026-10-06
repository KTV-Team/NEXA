# NEXA — Plan UI/UX mobile tinh gọn

Ngày cập nhật: 06/10/2026. Trạng thái: đề xuất thiết kế giai đoạn đầu, chưa phải danh sách tính năng đã triển khai.

## 1. Phạm vi

- App Android và iOS, cân bằng quản lý cá nhân và phối hợp nhóm.
- Đầu ra HTML/CSS tĩnh để duyệt giao diện.
- Ưu tiên xác thực, hôm nay, lịch/sự kiện, todo, thông báo/RSVP, nhóm và hồ sơ cơ bản.
- F01–F14 trong AGENTS.md vẫn là phạm vi dài hạn. Bộ mẫu đầu tiên chỉ thể hiện các chức năng chính, không bao phủ toàn bộ feature.
- **DESIGN.md là chuẩn thiết kế bắt buộc**, không chỉ là nguồn cảm hứng. Đối chiếu packages/design-tokens/src/index.ts; khi khác biệt, lấy DESIGN.md làm chuẩn và ghi rõ.
- Light mode, một bộ giao diện chung cho hai nền tảng.

## 2. Số lượng

**14 màn hình chính + 1 trang mục lục kiêm bảng component = 15 tệp HTML.**

- Mỗi màn chính có một bố cục đại diện. Không giấu thêm các mẫu toàn trang trong cùng tệp.
- Tạo/sửa dùng chung form; biến thể được ghi chú ngoài vùng UI.
- Nhận/gửi thông báo dùng chung cấu trúc danh sách và chi tiết, với action theo ngữ cảnh.
- Chỉ thiết kế lịch tháng kèm agenda của ngày chọn.
- Form tạo/đổi tên nhóm, mời thành viên và chọn người nhận đặt trong màn liên quan.
- Picker, dialog xác nhận và state được mô tả ở mức component trong trang mục lục. Không có bộ HTML overlay riêng.
- Không nhân đôi Android/iOS; ghi chú safe area và thanh hệ thống nếu cần.

## 3. Danh sách 14 màn hình

| ID | Màn hình | Nội dung chính | Feature liên quan |
|---|---|---|---|
| M01 | Đăng nhập | Email, mật khẩu, CTA đăng nhập, lối vào đăng ký, validation | F08 |
| M02 | Đăng ký | Tên, email, mật khẩu, xác nhận mật khẩu, validation | F08 |
| M03 | Hôm nay | Todo ưu tiên, sự kiện sắp tới, thông báo chờ phản hồi; ngữ cảnh cá nhân/nhóm rõ ràng | F04, F10, F11, F12 |
| M04 | Lịch | Tháng + agenda ngày chọn; nhãn cá nhân/nhóm và bộ lọc loại/nhóm gọn | F04 — một phần |
| M05 | Công việc | Todo, deadline, priority, hoàn thành; thao tác tạo/sửa | F12 |
| M06 | Tạo/sửa todo | Tiêu đề, deadline, priority, ghi chú; form dùng chung để xem và sửa chi tiết | F12 |
| M07 | Chi tiết lịch/sự kiện | Ngày giờ, địa điểm, ghi chú, nhắc nhở; event có RSVP, tổng số và danh sách phản hồi | F02, F11 |
| M08 | Tạo/sửa lịch hoặc sự kiện | Tiêu đề, loại lịch/event, ngày giờ, địa điểm, ghi chú, nhắc nhở và nhóm | F11 |
| M09 | Thông báo | Hai tab Nhận/Gửi dùng chung cấu trúc list; đọc/chưa đọc hoặc lifecycle tùy tab | F09, F10 |
| M10 | Chi tiết thông báo | Nội dung, người gửi/nhận, đối tượng liên quan; xác nhận/RSVP; ngữ cảnh người gửi có lifecycle và tổng hợp phản hồi | F01 — một phần; F02, F09, F10 |
| M11 | Soạn/sửa thông báo | Nội dung, nhóm, chọn một/nhiều/toàn nhóm trong form, lưu nháp, gửi ngay/lên lịch | F03, F09 |
| M12 | Nhóm | Danh sách nhóm, vai trò, số thành viên; form tạo nhóm gọn trong cùng trang | F13 |
| M13 | Chi tiết nhóm | Thành viên, vai trò, form mời và đổi tên; action xóa thành viên/rời nhóm theo quyền | F13 |
| M14 | Tài khoản | Hồ sơ cơ bản có thể sửa trong cùng trang và đăng xuất | F08, F14 — một phần |

Quy tắc gộp:

- M04 thay cho ba trang calendar và danh sách lịch riêng; agenda là lối vào M07.
- M05 hiển thị thông tin todo cơ bản; M06 chứa thông tin đầy đủ, không cần màn chi tiết riêng.
- M09 chỉ có một mẫu toàn trang. Row khác biệt của tab còn lại được minh họa trong reference.
- M10 lấy ngữ cảnh người nhận làm mẫu toàn trang. Metadata/action của người gửi được mô tả bằng component và annotation. Không hiển thị đồng thời action của hai vai trò trong UI app.
- M07 dùng event có RSVP làm mẫu; lịch cá nhân dùng cùng bố cục và bỏ vùng người tham gia theo annotation.
- M12/M13 gộp các form ngắn; nội dung dài được cuộn, không thêm màn quản trị riêng.
- M14 gộp sửa hồ sơ cơ bản, không tách cài đặt hay sửa hồ sơ thành màn mới.

## 4. Để giai đoạn sau

| Phần hoãn thiết kế | Feature |
|---|---|
| Todo theo tuần, tạo và áp dụng template | F05 |
| Thư viện, tìm kiếm, tải và xuất bản template | F06 |
| Countdown | F07 |
| Calendar tuần/ngày | Phần còn lại của F04 |
| Dời lịch từ thông báo và các action mở rộng | Phần còn lại của F01 |
| Quên/reset/đổi mật khẩu, cài đặt tài khoản nâng cao | Phần còn lại của F14 |
| Onboarding riêng, bộ lọc nâng cao, màn quản trị riêng | Phần hỗ trợ |

Đây là hoãn thiết kế, không loại khỏi phạm vi sản phẩm dài hạn. Navigation giai đoạn đầu chỉ chứa các mục đã có trong bộ mẫu.

## 5. Điều hướng

Bottom navigation: **Hôm nay · Lịch · Công việc · Nhóm**.

- Hôm nay → M03.
- Lịch → M04 → M07/M08.
- Công việc → M05/M06.
- Nhóm → M12/M13.
- Chuông trên header → M09/M10/M11.
- Avatar trên header → M14.
- Xác thực → M01/M02.

Header cho biết ngữ cảnh Cá nhân/Tất cả/một nhóm. Chọn ngữ cảnh bằng control gọn trong trang.

Bottom navigation là thành phần mobile bổ sung, dùng primitive và token từ DESIGN.md, như pill-tab/pill-tab-active; không tạo style mới. Form/chi tiết có quay lại rõ ràng và có thể ẩn bottom navigation.

## 6. Tuân thủ DESIGN.md — bắt buộc

Chỉ sắp xếp lại bố cục cho mobile bằng token hiện có. Không tự đặt thêm font, màu, cỡ chữ, radius, padding hoặc hiệu ứng để tạo một hệ thống thị giác khác.

| Thành phần | Token/component nguồn |
|---|---|
| Nền chính/phụ | colors.canvas #ffffff / colors.surface #f7f8fa |
| Chữ chính/phụ | colors.ink #1c1c1e; slate #555a6a; steel #6b6f7e |
| CTA chính | button-primary: nền primary, chữ on-primary, rounded.full, padding 12px 24px, typography.button-md |
| CTA phụ | button-secondary: nền transparent, viền hairline-strong, rounded.full |
| Tab/filter/badge | pill-tab, pill-tab-active, filter-dropdown và badge tương ứng trong nguồn |
| Tiêu đề màn | heading-3: 28px / weight 500 / line-height 1.25 |
| Tiêu đề section | heading-4: 22px / 500 / 1.30; section nhỏ dùng heading-5: 18px / 500 / 1.40 |
| Nội dung/metadata | body-md: 16px / 400 / 1.50; body-sm: 14px / 400 / 1.50; helper dùng caption 13px |
| Chữ nút | button-md: 14px / 500 / 1.30 |
| Card thường | card-base: canvas, radius 16px, padding 24px, viền hairline-soft |
| Card pastel | card-feature-coral/teal/rose: đúng màu nguồn, radius 28px, padding 32px |
| Input | text-input: radius 8px, cao 44px, padding 12px 16px, viền hairline-strong |
| Input focus | text-input-focused: viền 2px brand-blue |
| Icon button mobile | button-icon-circular, kích thước mobile 44×44px theo Responsive Behavior |
| Lề/khoảng cách | Chọn từ spacing gốc: 4/8/12/16/20/24/32px…; lề trang 16px hoặc 20px |

- Font: Roobert PRO → Noto Sans → system sans-serif theo stack nguồn; fallback khi font chính không có. Weight 400/500/600.
- CTA chủ đạo đen, nút CTA/tab/badge dạng pill đúng quy định.
- Brand-yellow dành cho nhận diện/logo, promo banner hoặc yellow-tag chip theo Do's/Don'ts; không dùng cho CTA thường hay nền lớn.
- Phối card pastel coral/teal/rose với card trắng, dùng đúng màu và hình dạng trong nguồn.
- Bề mặt chủ yếu phẳng, viền mảnh, shadow đúng mức/ngữ cảnh đã có.
- Không thêm gradient, glass effect, shadow nặng, stock photography hoặc bộ hover riêng.
- Thành phần mới như todo row/calendar cell là tổ hợp primitive/token có sẵn, ghi mapping ở reference.

DESIGN.md có card-feature-yellow dùng brand-yellow nhưng Do's/Don'ts giới hạn vàng và cấm nền lớn màu vàng. Bộ này ưu tiên giới hạn trong Do's/Don'ts: dùng card coral/teal/rose hoặc trắng, giữ vàng cho nhận diện/chip. Không tự sửa DESIGN.md.

Các bố cục marketing như pricing, footer, hero không phải màn nghiệp vụ app; dùng những primitive phù hợp và giữ nguyên token.

## 7. UX cốt lõi

- Phân biệt dữ liệu cá nhân/nhóm. Vai trò owner/admin/member có action phù hợp; annotation nêu khác biệt quyền.
- M11 chọn một/nhiều/toàn nhóm, hiển thị tổng người nhận và thời điểm gửi. Người nhận chỉ gồm thành viên được phép nhìn thấy.
- Lifecycle Draft/Scheduled/Sent/Cancelled, đọc/chưa đọc và phản hồi là ba trục độc lập.
- RSVP có Tham gia/Không tham gia/Chưa chắc; chưa phản hồi được thống kê riêng. M07/M10 dùng số liệu nhất quán.
- Todo có deadline, priority, notes và hoàn thành. Chi tiết đầy đủ nằm trong form dùng chung.
- Calendar có nhãn loại/nhóm và ví dụ về lịch, thông báo, ngày lễ/ngày đặc biệt; không chỉ phân biệt bằng màu.
- Dialog xóa, hủy gửi và rời nhóm mô tả rõ đối tượng/hậu quả ở reference.

Chính sách quyền chi tiết, sửa thông báo sau gửi và thay đổi phản hồi cần chốt khi triển khai. Bộ HTML minh họa một trường hợp rõ ràng và ghi chú khác biệt, không mô phỏng logic.

## 8. Trang reference và kiểm tra

index.html gồm liên kết M01–M14, feature map, token mapping và component nhỏ: nút, input, tab, badge, todo row, notification row, member row. Thêm ví dụ validation, empty, disabled/thiếu quyền, đã xác nhận và dialog xác nhận; không dựng thêm mẫu toàn trang.

Mốc bố cục 390px, kiểm tra thêm 360px/430px; chiều cao theo nội dung và có cuộn. Kiểm tra tiếng Việt có dấu, tên dài và CTA không che nội dung. Điều chỉnh bố cục nhỏ vẫn dùng token gốc.

## 9. Cách thực hiện và bàn giao

1. Tạo reference và ba màn M01 Đăng nhập, M03 Hôm nay, M05 Công việc để duyệt mức độ tuân thủ DESIGN.md.
2. Hoàn thiện 11 màn còn lại bằng cùng một stylesheet, dữ liệu team/event/notification/RSVP nhất quán.
3. Kiểm tra đủ 14 màn + 1 trang hỗ trợ, token nguồn, bố cục ba kích thước và phạm vi đã hoãn.

Không tự thêm màn/overlay toàn trang. Khác biệt với DESIGN.md phải được báo rõ trước khi áp dụng. Lưu kết quả trong docs/mobile-design/. HTML/CSS tĩnh là đủ; index dùng liên kết duyệt mẫu. Không cần JavaScript, API, backend hay implement web.

## 10. Prompt giao cho agent

> Thiết kế UI/UX NEXA cho mobile Android và iOS bằng HTML/CSS tĩnh, cân bằng cá nhân và nhóm. Đọc AGENTS.md, DESIGN.md, packages/design-tokens/src/index.ts và docs/mobile-ui-ux-plan.md. Chỉ làm 14 màn M01–M14 và một index.html kiêm reference/component, tổng cộng 15 tệp HTML; không thêm mẫu toàn trang hoặc overlay riêng. DESIGN.md là chuẩn bắt buộc: dùng đúng palette, font stack, typography, radius, spacing, component và Do's/Don'ts, không tự đề xuất style mới. Chỉ sắp xếp bố cục mobile bằng token đã có. Dùng CTA đen dạng pill, vàng cho nhận diện/chip, card pastel đúng token; input 44px/radius 8px, body 16px, button label 14px. Ưu tiên Do's/Don'ts khi component vàng mâu thuẫn giới hạn nền vàng. Một stylesheet chung. Tạo reference và M01/M03/M05 trước để duyệt, sau đó hoàn thiện 11 màn còn lại. Tạo/sửa, Nhận/Gửi và vai trò dùng cùng bố cục; khác biệt thể hiện bằng component nhỏ/annotation, không nhân bản màn. Nội dung tiếng Việt, dữ liệu mẫu nhất quán; kiểm tra 360/390/430px. Template/thư viện/countdown, lịch tuần/ngày và tài khoản nâng cao để sau. Lưu trong docs/mobile-design/. Chỉ tạo bản thiết kế, không cần JavaScript, API, backend hay implement web.
