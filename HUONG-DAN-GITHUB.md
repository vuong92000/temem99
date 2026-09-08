# 🌐 Hướng dẫn chạy VideoAI Studio trên GitHub

> App là **100% front-end tĩnh** (mọi thứ chạy trong trình duyệt, không cần backend) nên lên GitHub là chuyện dễ — có **3 cách chạy trên GitHub**, không cần server riêng, không tốn phí.

**Địa chỉ app sau khi deploy:** 🔗 **https://vuong92000.github.io/temem99/**

---

## ⚡ Thiết lập 1 lần duy nhất (2 phút, chỉ chủ repo làm được)

> Agent/bot được cấp quyền đẩy code nhưng **không được phép tạo file workflow hay bật Pages** (chính sách bảo mật của GitHub). Vì vậy 2 bước sau đây bạn tự bấm — mỗi bước ~30 giây, sau đó mọi thứ tự động hoàn toàn.

### Bước 1 — Thêm file workflow (paste 1 lần)

1. Mở link tạo file mới (đã điền sẵn tên): **https://github.com/vuong92000/temem99/new/main?filename=.github/workflows/deploy-pages.yml**
2. Dán toàn bộ nội dung sau vào ô soạn thảo:

```yaml
# 🚀 Tự động deploy VideoAI Studio lên GitHub Pages
# Mỗi lần push vào main: chạy smoke-test rồi xuất bản public/ lên Pages.
name: Deploy GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  test:
    name: Kiểm thử (smoke-test)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Chạy smoke-test online + offline
        run: node scripts/smoke-test.mjs

  deploy:
    name: Xuất bản lên Pages
    needs: test
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: public
      - id: deployment
        uses: actions/deploy-pages@v4
```

3. Bấm **Commit changes** (mặc định commit vào `main`).

### Bước 2 — Bật GitHub Pages

1. Mở **https://github.com/vuong92000/temem99/settings/pages**
2. **Build and deployment** → **Source** → chọn **GitHub Actions**.
3. Xong! Workflow vừa commit sẽ chạy ngay lần đầu — vào tab **Actions** xem tiến trình (2 bước: *Kiểm thử* → *Xuất bản*), sau ~1–2 phút app lên mạng tại URL phía trên.

---

## 🅰 Cách 1 — GitHub Pages tự động (khuyến nghị)

Sau khi làm 2 bước thiết lập trên: **mỗi lần push vào `main`**, GitHub Actions tự chạy smoke-test rồi xuất bản thư mục `public/` lên GitHub Pages — không cần làm gì thêm.

### Deploy / cập nhật bản mới

```bash
git add . && git commit -m "cập nhật" && git push origin main
```

Muốn chạy lại thủ công: tab **Actions** → **Deploy GitHub Pages** → **Run workflow**.

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
| Bước 1 paste workflow mà báo lỗi | Chỉ chủ repo (hoặc người có quyền **Workflows**) mới tạo được file trong `.github/workflows/` — dùng tài khoản của bạn, không phải bot/token mượn. |
| Bản mới không cập nhật | Xoá cache trình duyệt (Ctrl+Shift+R); Pages có thể mất ~1 phút lan truyền. |
| Muốn tên miền riêng | Settings → Pages → **Custom domain** → điền domain của bạn (bước này cần plan trả phí nếu repo private; repo public miễn phí). |

## 🧭 Tóm tắt nhanh

```
GitHub Pages (app chạy trực tuyến)   →  https://vuong92000.github.io/temem99/
GitHub Codespaces (chạy server)      →  Code → Codespaces → node server.js
Clone về máy (dev local)             →  git clone … && node server.js
```
