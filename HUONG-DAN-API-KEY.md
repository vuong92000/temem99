# 🔑 Hướng dẫn lấy API key (Gemini & OpenAI)

PhotoAI Studio gọi AI **trực tiếp từ trình duyệt** bằng key của bạn — key chỉ lưu trong máy bạn, không gửi đi đâu khác.

---

## ✨ Cách 1 — Gemini (miễn phí, khuyên dùng cho người mới)

1. Vào **https://aistudio.google.com/apikey** và đăng nhập tài khoản Google.
2. Nhấn **Create API key** (hoặc *Get API key*) → chọn project có sẵn (mặc định là được) → **Create key in existing project**.
3. Copy chuỗi key (bắt đầu bằng `AIza…`).
4. Trong PhotoAI Studio, nhấn **🔑 API Key** (góc phải trên) → dán vào ô **Gemini API key** → **💾 Lưu cài đặt**.
5. Nhấn **🔌 Kiểm tra kết nối** — hiện “✅ Key hợp lệ!” là xong.

> **Quota miễn phí:** giới hạn số lượt gọi mỗi phút/ngày (Google có thể thay đổi). Nếu app báo *429 / hết quota*, hãy đợi vài phút rồi thử lại, hoặc tạo thêm key khác.

### Chọn model Gemini nào?

| Model | Khi nào dùng |
|---|---|
| **Gemini 2.5 Flash Image** (mặc định) | Nhanh, rẻ, đủ đẹp cho ảnh thẻ / ánh sáng / phục hồi thông thường. |
| **Gemini 3 Pro Image** | Ảnh khó (phục hồi nát nặng, chi tiết cao) — chậm hơn, tốn quota hơn. |
| **Gemini 3.1 Flash Image** | Bản mới, cân bằng tốc độ–chất lượng. |

Đổi model ngay trên thanh công cụ (ô dropdown cạnh nút ✨ Gemini), không cần vào Cài đặt.

---

## 🤖 Cách 2 — OpenAI GPT Image (trả phí, ảnh rất đẹp)

1. Vào **https://platform.openai.com/api-keys** và đăng nhập (đăng ký nếu chưa có).
2. Nhấn **Create new secret key** → đặt tên (vd: `photoai`) → **Create** → copy key (bắt đầu bằng `sk-…`). ⚠️ Key chỉ hiện **1 lần duy nhất**.
3. **Nạp credit:** vào **Settings → Billing** (https://platform.openai.com/settings/organization/billing) → *Add payment method* → *Add to credit balance* (nạp $5–10 dùng được rất lâu cho ảnh).
4. Trong PhotoAI Studio: **🔑 API Key** → dán vào ô **OpenAI API key** → **💾 Lưu** → **🔌 Kiểm tra kết nối**.
5. Trên thanh công cụ, chuyển engine sang **🤖 GPT Image**.

### Tinh chỉnh GPT Image (trong ⚙️ Cài đặt API)

| Thiết lập | Gợi ý |
|---|---|
| **Model** | `gpt-image-1` (ổn định) hoặc `gpt-image-1.5` (mới, đẹp hơn). |
| **Kích thước** | Để *Tự động* (theo ảnh gốc); ảnh thẻ nên chọn *Dọc 1024×1536*. |
| **Chất lượng** | *Vừa* cho hàng ngày; *Cao* khi cần ảnh “đỉnh” (chậm 1–3 phút, tốn tiền hơn). *Thấp* để thử nghiệm nhanh. |
| **Giữ chi tiết ảnh gốc** | Để *Cao* cho ảnh thẻ & phục hồi (giữ mặt tốt nhất). |

---

## 🔒 An toàn key

- Key lưu ở **localStorage của trình duyệt** — ai dùng chung máy + chung trình duyệt đều thấy được. **Không nhập key trên máy lạ / máy công cộng.**
- Muốn xóa key: mở Cài đặt API → xóa trắng ô key → Lưu.
- Lộ key OpenAI? Vào trang API keys → **Revoke** (thu hồi) ngay và tạo key mới.
- Không bao giờ dán key lên Facebook/Zalo/chat nhóm hay commit vào git.

---

## ❓ Hỏi nhanh

| Câu hỏi | Trả lời |
|---|---|
| Không có key dùng được không? | Dùng được công cụ **offline**: cắt khung, chỉnh màu, tăng nét, cân trắng, phóng 2×, tấm in. Muốn AI xử lý thì bắt buộc có key. |
| Dùng key của web khác được không? | Key Gemini/OpenAI là chuẩn chung — key bạn đã có từ trước dùng được luôn. |
| 1 key dùng nhiều máy được không? | Được — mỗi trình duyệt nhập key 1 lần. |
| Sao Gemini báo lỗi khu vực? | Một số mạng chặn Google AI — bật VPN sang US/Singapore rồi thử lại. |
