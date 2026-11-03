# Drizzle Tab

> Sườn dự án: Extension "New Tab" phong cách Lofi

## 1. Tổng quan

**Drizzle Tab** là extension thay thế trang tab mới mặc định của Chrome bằng một màn hình khởi đầu riêng, gồm: lối tắt Google, link truy cập nhanh, todo list có deadline, lịch sử công việc dạng GitHub, nền lofi động và nhiều theme.

> **Lưu ý kỹ thuật:** khi extension chiếm tab mới, Chrome sẽ **tắt toàn bộ giao diện mặc định** (ô tìm kiếm Google, các ô shortcut, nút Customize Chrome, khu Gmail/Images/9 chấm). Vì vậy những thứ muốn giữ phải được **làm lại** trong extension.

---

## 2. Bố cục màn hình

- **Góc trên phải:** Gmail, Images, nút 9 chấm mở danh sách ứng dụng Google, nút đổi theme
- **Giữa phía trên:** ô tìm kiếm Google + đồng hồ / lời chào
- **Dưới ô tìm kiếm:** hàng link truy cập nhanh (tối đa 6–8 icon)
- **Một bên (trái hoặc phải):** bảng Todo
- **Phía dưới, có thể thu gọn:** bảng lịch sử dạng GitHub
- **Toàn màn hình:** nền lofi động; các khối phía trên dùng nền mờ trong suốt để không che ảnh

---

## 3. Các chức năng

### 3.1. Khu vực Google (giữ lại từ Chrome)

- Ô tìm kiếm Google, nhấn Enter là tìm
- Link Gmail, Google Images
- Nút 9 chấm mở lưới ứng dụng tự làm: Drive, Calendar, Docs, Sheets, Meet, Dịch, Maps, YouTube…
- Cho phép người dùng tự chọn ứng dụng nào hiện trong lưới

### 3.2. Link truy cập nhanh

- Giới hạn tối đa khoảng 6–8 link để không chiếm chỗ
- Thêm, sửa, xóa, kéo thả để đổi thứ tự
- Icon tự lấy từ favicon của trang web

### 3.3. Todo list có deadline

**Thông tin mỗi task**

- Tên task
- Deadline (ngày, có thể thêm giờ)
- Độ ưu tiên: Cao / Trung bình / Thấp
- Trạng thái: Chưa làm / Đã xong
- Ngày tạo, ngày hoàn thành

**Cách giúp đánh giá ưu tiên**

- Màu theo deadline:
  - Quá hạn → đỏ
  - Hôm nay → cam
  - Trong 3 ngày tới → vàng
  - Còn xa → bình thường
- Tự sắp xếp: quá hạn lên đầu → gần deadline nhất → cùng ngày thì xét độ ưu tiên
- Hiển thị dạng "còn 2 ngày", "trễ 1 ngày" thay vì chỉ ghi ngày

**Các tab lọc:** Hôm nay / Sắp tới / Quá hạn / Tất cả / Đã xong

**Tùy chọn mở rộng**

- Thông báo nhắc trước deadline
- Số task quá hạn hiện trên icon extension

### 3.4. Lịch sử công việc dạng GitHub

- Lưới 365 ô, mỗi ô là một ngày
- Màu đậm nhạt theo số task hoàn thành trong ngày (0, 1–2, 3–4, 5+…)
- Click vào ô → hiện danh sách task đã xong trong ngày đó
- Hiển thị tổng số task trong năm và chuỗi ngày làm liên tục dài nhất (streak)
- **Quy tắc quan trọng:** task đã hoàn thành khi bị xóa khỏi danh sách vẫn phải được giữ trong lịch sử (chỉ ẩn đi, không xóa thật)

### 3.5. Nền Lofi động

- **Định dạng:** ưu tiên video ngắn lặp lại (MP4/WebM) thay vì GIF vì nhẹ và mượt hơn
- **Nguồn:**
  - Có sẵn trong extension (vài video mặc định)
  - Người dùng tự tải lên video/ảnh của mình
- **Hiệu năng:**
  - Tự dừng khi tab không được xem
  - Chế độ "tiết kiệm pin" chuyển sang ảnh tĩnh
- **Bản quyền:** chỉ dùng ảnh tự làm, tự tạo bằng AI hoặc có giấy phép sử dụng

### 3.6. Theme

- Mỗi theme gồm: nền động + bảng màu + font chữ + kiểu khung (độ trong suốt, bo góc)
- Ý tưởng theme có sẵn:
  - Phố đêm mưa
  - Quán cà phê chiều
  - Thị trấn tuyết
  - Rừng buổi sáng
  - Phòng làm việc đêm
- Đổi theme nhanh từ nút ở góc màn hình
- Tùy chọn:
  - Ngẫu nhiên mỗi lần mở tab
  - Tự đổi theo giờ (ngày dùng theme sáng, tối dùng theme đêm)

### 3.7. Cài đặt

- Bật/tắt từng khu vực (ẩn todo, ẩn lịch sử…)
- Quản lý link nhanh, theme, nền
- Phím tắt (ví dụ: `T` thêm todo, `/` vào ô tìm kiếm)
- Xuất/nhập dữ liệu ra file để sao lưu

---

## 4. Lưu trữ dữ liệu

| Loại dữ liệu | Nơi lưu | Ghi chú |
|---|---|---|
| Todo, lịch sử, cài đặt | Bộ nhớ local của extension | Lưu trên máy |
| Video/ảnh người dùng tải lên | IndexedDB | Dung lượng lớn |
| Cài đặt, link nhanh | Bộ nhớ đồng bộ của Chrome | Dung lượng đồng bộ rất nhỏ, chỉ nên đồng bộ dữ liệu nhẹ |
| Bản sao lưu | File JSON xuất ra | Tránh mất dữ liệu khi cài lại |

---

## 5. Lộ trình làm

| Giai đoạn | Nội dung |
|---|---|
| 1. MVP | Bố cục, khu Google, link nhanh, todo có deadline, nền ảnh tĩnh |
| 2 | Lịch sử dạng GitHub + xem task theo ngày |
| 3 | Nền động lặp lại + hệ thống theme |
| 4 | Thông báo deadline, phím tắt, sao lưu, hoàn thiện giao diện |

---

## 6. Những điểm cần quyết định

- [ ] Có cần đồng bộ todo giữa nhiều máy (máy công ty và máy nhà) không?
- [ ] Bao nhiêu theme có sẵn ở bản đầu?
- [ ] Nền động tự tạo, tự sưu tầm hay để người dùng tự tải lên?
- [ ] Có cần thông báo nhắc deadline không, hay chỉ cần hiển thị màu là đủ?
