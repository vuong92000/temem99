# 🌐 Hướng dẫn chạy VideoAI Studio trên GitHub

> App là **100% front-end tĩnh** (mọi thứ chạy trong trình duyệt, không cần backend) nên lên GitHub là chuyện dễ — có **3 cách chạy trên GitHub**, không cần server riêng, không tốn phí.

**Địa chỉ app sau khi deploy:** 🔗 **https://vuong92000.github.io/temem99/**

---

## 🅰 Cách 1 — GitHub Pages tự động (khuyến nghị, đã setup sẵn)

Repo này đã có sẵn workflow **`.github/workflows/deploy-pages.yml`**: mỗi lần push vào nhánh `main`, GitHub Actions sẽ tự chạy smoke-test rồi xuất bản thư mục `public/` lên GitHub Pages.

### Bật Pages (chỉ làm 1 lần duy nhất)

1. Vào repo trên GitHub → **Settings** → **Pages** (menu trái, mục *Code & automation*).
2. Ở **Build and deployment** → **Source** → chọn **GitHub Actions**.
3. Xong — không cần chọn branch/folder gì thêm.

> 💡 Làm bằng lệnh (GitHub CLI):
> ```bash
> gh api repos/vuong92000/temem99/pages -X POST -f build_type=workflow
> ```

### Deploy / cập nhật bản mới

```bash
git add . && git commit -m "cập nhật" && git push origin main
```

Push xong vào tab **Actions** xem tiến trình (2 bước: *Kiểm thử* → *Xuất bản*), ~1 phút sau bản mới lên tại URL phía trên. Muốn chạy lại thủ công: tab **Actions** → **Deploy GitHub Pages** → **Run workflow**.

---

## 🅱 Cách 2 — GitHub Pages thủ công (không dùng Actions)

Nếu không muốn dùng workflow:

1. Copy toàn bộ nội dung thư mục `public/` vào thư mục `docs/` ở gốc repo rồi push lên `main`.
2. **Settings** → **Pages** → **Source**: *Deploy from a branch* → Chọn nhánh **main** / thư mục **/docs** → **Save**.
3. ~1 phút sau truy cập `https://vuong92000.github.io/temem99/`.

> ⚠️ Lưu ý: app **phải dùng đường dẫn tương đối** (`css/style.css`, `library/…`) — repo này đã sửa sẵn. Nếu bạn thấy 404 trắng trang ở bản fork/cũ, kiểm tra lại `index.html` không được dùng `/css/...` với dấu `/` đầu.

---

## 🅲 Cách 3 — GitHub Codespaces (chạy server ngay trên GitHub)

Muốn chạy đúng chế độ dev (giống local) mà không cài Node lên máy:

1. Trên trang repo, bấm nút xanh **⟨⟩ Code** → tab **Codespaces** → **Create codespace on main**.
2. Một VS Code trên trình duyệt mở ra, chờ vài giây container sẵn sàng.
3. Trong terminal của codespace gõ:

   ```bash
   node server.js
   ```

4. GitHub tự nhận diện cổng 3000 → bấm **Open in Browser** trong popup thông báo Ports (hoặc tab **Ports** → chuột phải cổng 3000 → *Open in Browser*).

Ưu điểm: chỉnh code + xem kết quả ngay trên GitHub, máy bạn không cài gì. Miễn phí 60 giờ/tháng cho tài khoản cá nhân.

---

## 🖥 (Tham khảo) Chạy bản clone về máy

```bash
git clone https://github.com/vuong92000/temem99.git
cd temem99
node server.js        # http://localhost:3000
```

Chi tiết xem [HUONG-DAN-CHAY.md](HUONG-DAN-CHAY.md).

---

## ✅ Cái gì hoạt động trên GitHub Pages?

| Tính năng | Trên Pages | Ghi chú |
|---|---|---|
| Kịch bản AI, ảnh AI, giọng đọc AI | ✅ | Gọi trực tiếp từ trình duyệt tới Pollinations.ai — không cần server |
| Chế độ offline (fallback) | ✅ | Khi dịch vụ AI đứt, app tự chuyển |
| Lưu dự án (localStorage) | ✅ | Mỗi tên miền lưu riêng — dự án trên Pages khác dự án ở localhost |
| Xuất video WebM | ✅ | Chạy hoàn toàn phía client |
| `node server.js` | ❌ | Pages chỉ serve file tĩnh — dùng Codespaces (Cách 3) nếu cần server |

## 🔧 Xử lý sự cố

| Triệu chứng | Cách xử lý |
|---|---|
| Vào URL báo **404** | Pages chưa bật (làm Cách 1 bước 1) hoặc workflow chưa chạy xong — xem tab **Actions**. Repo **private không deploy được Pages** trên plan miễn phí → chuyển repo về public hoặc dùng Codespaces. |
| Trang trắng / thiếu ảnh, CSS | Tab Actions bị đỏ (smoke-test fail) → mở log xem lỗi. Nếu là bản fork cũ: kiểm tra đường dẫn tuyệt đối `/css/...` phải đổi thành tương đối (mục Cách 2). |
| `gh api .../pages` báo 404 khi bật | Bạn chưa có quyền admin repo — bật bằng giao diện Settings → Pages. |
| Bản mới không cập nhật | Xoá cache trình duyệt (Ctrl+Shift+R); Pages có thể mất ~1 phút lan truyền. |
| Muốn tên miền riêng | Settings → Pages → **Custom domain** → điền domain của bạn (bước này cần plan trả phí nếu repo private; repo public miễn phí). |

## 🧭 Tóm tắt nhanh

```
GitHub Pages (app chạy trực tuyến)   →  https://vuong92000.github.io/temem99/
GitHub Codespaces (chạy server)      →  Code → Codespaces → node server.js
Clone về máy (dev local)             →  git clone … && node server.js
```
