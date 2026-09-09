# 📖 Hướng dẫn chạy & sử dụng PhotoAI Studio

> **PhotoAI Studio** — studio chỉnh sửa ảnh bằng AI trong trình duyệt: **ảnh thẻ thông minh → ánh sáng AI → phục hồi ảnh cũ**, chạy online bằng API key Gemini / OpenAI của bạn. **Không cần cài thư viện.**

---

## A. Chạy app (2 phút)

### Cách 1 — Chạy trên máy (khuyến nghị)

1. Cài [Node.js](https://nodejs.org) bản 16 trở lên (bấm Next liên tục là xong).
2. Mở terminal tại thư mục repo, gõ:

   ```bash
   node server.js        # hoặc: npm start
   ```

3. Thấy dòng `📸 PhotoAI Studio đang chạy tại: http://localhost:3000` → mở trình duyệt vào địa chỉ đó.

### Cách 2 — Chạy online trên GitHub

Không cài gì cả — xem [HUONG-DAN-GITHUB.md](HUONG-DAN-GITHUB.md) (Pages / Codespaces).

---

## B. Chọn engine MIỄN PHÍ (không bắt buộc nhập key!)

Chi tiết từng bước có trong **[HUONG-DAN-API-KEY.md](HUONG-DAN-API-KEY.md)**. Tóm tắt:

- **🌸 Polli (dễ nhất, không cần key):** chuyển engine sang 🌸 Polli là chạy ngay.
- **✨ Gemini (miễn phí, khuyên dùng):** lấy key tại https://aistudio.google.com/apikey → trong app nhấn **🔑 API Key** → dán key (mỗi dòng 1 key, càng nhiều càng tốt) → **💾 Lưu**.
- **🤗 HF (token miễn phí):** tạo token tại https://huggingface.co/settings/tokens → dán vào Cài đặt.
- **🤖 GPT Pro (trả phí, tùy chọn):** thêm key OpenAI khi cần ảnh đẹp nhất.

> Nhấn **🔌 Kiểm tra kết nối** để chắc chắn key/token hợp lệ trước khi dùng.

---

## C. Quy trình chỉnh ảnh

### Bước 1️⃣ — Tải ảnh lên

- Kéo-thả file vào khung giữa, **Ctrl+V** dán ảnh chụp màn hình, hoặc bấm **📤 Tải ảnh lên**.
- Muốn thử nhanh: bấm 1 trong 4 **ảnh mẫu** dưới khung tải.

### Bước 2️⃣ — Chọn engine AI (thanh trên cùng)

- **🌸 Polli**: miễn phí, không cần key — chạy ngay (giờ cao điểm có thể chậm).
- **✨ Gemini**: miễn phí, nhanh, đẹp — nhập nhiều key để app tự xoay vòng quota.
- **🤗 HF**: token miễn phí, model Kontext/Qwen sửa ảnh tốt (Beta).
- **🤖 GPT Pro**: trả phí, chất lượng cao nhất (chọn *Chất lượng: Cao* khi cần ảnh “đỉnh”).

### Bước 3️⃣ — Chọn công cụ ở menu trái

| Công cụ | Làm gì | Mẹo |
|---|---|---|
| 🪪 **Ảnh thẻ AI** | Chọn nền → trang phục → kiểu tóc → **⚡ Tạo ảnh thẻ AI** | Ảnh gốc rõ mặt, nền đơn giản thì AI làm đẹp nhất. Xong dùng **🖨️ Tấm in** xếp ảnh 3×4/4×6 lên khổ 10×15. |
| 💡 **Ánh sáng AI** | Chọn 1/10 kiểu sáng (+ tự mô tả) → **⚡ Áp dụng** | Bấm **🤖 AI gợi ý** để máy tự chọn kiểu sáng hợp mặt. |
| 🕰️ **Phục hồi ảnh cũ** | Tick tính năng (lên màu, xóa xước…) → **⚡ Phục hồi** | Ảnh nát nặng: chọn mức **Mạnh**, chạy 2–3 lần. Không có key vẫn dùng được Tăng nét / Cân trắng / Phóng 2× (offline). |

### Bước 4️⃣ — So sánh & tải về

- Kéo thanh **⇔** giữa ảnh để so sánh **TRƯỚC / SAU**.
- **🎨**: chỉnh sáng–tương phản–bão hòa nhanh (áp dụng khi tải về).
- **🔁**: lấy kết quả làm ảnh gốc để chỉnh tiếp (rất hữu ích khi kết hợp nhiều công cụ).
- **⬇️ PNG / ⬇️ JPG**: tải ảnh về máy. Ảnh trong **🖼️ Lịch sử** được giữ lại 12 ảnh gần nhất.

---

## D. Cắt khung ảnh (✂️ trên thanh công cụ)

1. Nhấn **✂️** → chọn khung **3×4 / 4×6 / 1×1**.
2. **Kéo ảnh** để căn mặt vào khung, kéo thanh **Zoom** để phóng to/nhỏ.
3. **✓ Áp dụng** (cắt nhầm thì nhấn **↩️** hoàn tác).

---

## E. Phím tắt

| Phím | Tác dụng |
|---|---|
| `Ctrl` + `Enter` | Chạy AI với tùy chọn hiện tại |
| `Ctrl` + `V` | Dán ảnh từ clipboard |
| `1` `2` `3` | Đổi nhanh công cụ Ảnh thẻ / Ánh sáng / Phục hồi |
| `Esc` | Đóng hộp thoại |

---

## F. Xử lý sự cố

| Triệu chứng | Cách xử lý |
|---|---|
| Báo “Chưa có API key” | Mở ⚙️ Cài đặt API, dán key đúng engine đang chọn (Gemini/GPT) rồi Lưu. |
| “API key không hợp lệ” | Copy thừa khoảng trắng? Tạo key mới và thử nút 🔌 Kiểm tra kết nối. |
| “Hết quota / 429” (Gemini) | Key miễn phí bị giới hạn lượt — đợi vài phút hoặc tạo key khác. |
| “Hết quota / 429” (OpenAI) | Tài khoản hết credit — nạp thêm tại platform.openai.com. |
| Pollinations chậm / báo quá tải | Server miễn phí đông người dùng — đợi 1–2 phút, đổi model (Kontext/FLUX/Turbo), hoặc sang ✨/🤗. |
| HF báo *gated* / 403 | Model yêu cầu chấp nhận điều khoản — mở trang model trên HF để Accept, hoặc đổi model Qwen. |
| App hỏi “dán link ảnh” | Trình duyệt chặn tự upload (CORS) — tải ảnh lên postimages.org/imgbb rồi dán Direct link vào. |
| “Không kết nối được” | Kiểm tra mạng; nếu mạng chặn Google/OpenAI thì bật VPN. |
| Ảnh AI “đổi mặt” | Chạy lại (mỗi lần AI vẽ khác nhau); với ảnh thẻ hãy dùng ảnh gốc rõ mặt, chính diện. |
| Chờ GPT quá lâu | Quality Cao mất 1–3 phút là bình thường; có thể Hủy rồi chạy lại quality Vừa. |
| Trang trắng | Dùng Chrome/Edge bản mới; tắt extension chặn script; tải lại trang (Ctrl+F5). |

---

## G. Cấu trúc file (cho dev)

```
server.js                 Máy chủ tĩnh zero-dependency
public/
  index.html              Giao diện
  css/studio.css          Theme
  js/presets.js           Preset + trình dựng prompt
  js/api.js               Client Gemini & OpenAI
  js/image.js             Xử lý ảnh canvas (cắt, nét, WB, upscale, tấm in)
  js/app.js               Điều phối UI
  video-studio/           Bản VideoAI cũ (kèm HUONG-DAN.md riêng)
scripts/smoke-test.mjs    Test tự động bản video cũ (cần: npm i -D jsdom esbuild @napi-rs/canvas)
```
