# 🔑 Hướng dẫn làm ảnh MIỄN PHÍ (3 engine free + 1 Pro)

PhotoAI Studio gọi AI **trực tiếp từ trình duyệt**. Có **3 cách làm ảnh miễn phí** — chọn 1 trong 3 là đủ dùng, không tốn đồng nào.

---

## 🌸 Cách 0 — Pollinations: miễn phí, KHÔNG cần key (dễ nhất)

1. Trên thanh công cụ, chuyển engine sang **🌸 Polli**.
2. Tải ảnh lên → chọn công cụ → **⚡ Xử lý bằng AI**. Xong!
3. App sẽ tự tải ảnh của bạn lên host tạm để gửi cho AI. Nếu trình duyệt chặn, app sẽ hỏi bạn **dán link ảnh** (tải ảnh lên postimages.org/imgbb rồi dán link vào).

> **Lưu ý:** server miễn phí nên giờ cao điểm có thể chậm hoặc báo quá tải — đợi 1–2 phút rồi thử lại, hoặc đổi model (Kontext / FLUX / Turbo). Đừng dùng cho ảnh nhạy cảm vì ảnh đi qua server công cộng.

---

## ✨ Cách 1 — Gemini: miễn phí + tự xoay vòng nhiều key (khuyên dùng)

1. Vào **https://aistudio.google.com/apikey** → đăng nhập Google → **Create API key** → copy key (đầu `AIza…`).
2. Muốn làm được nhiều ảnh hơn: tạo thêm key thứ 2, 3 (mỗi project Google được tạo key riêng).
3. Trong app: **🔑 API Key** → dán các key vào ô Gemini, **mỗi dòng 1 key** → **💾 Lưu** → **🔌 Kiểm tra**.
4. Khi chạy, key nào hết quota app **tự chuyển sang key kế** — bạn không cần làm gì.

### Chọn model Gemini nào?

| Model | Khi nào dùng |
|---|---|
| **Gemini 2.5 Flash Image** (mặc định) | Nhanh, đủ đẹp cho ảnh thẻ / ánh sáng / phục hồi thông thường. |
| **Gemini 3 Pro Image** | Ảnh khó (phục hồi nát nặng, chi tiết cao) — chậm hơn, tốn quota hơn. |
| **Gemini 3.1 Flash Image** | Bản mới, cân bằng tốc độ–chất lượng. |

---

## 🤗 Cách 2 — Hugging Face: token miễn phí (Beta)

1. Đăng ký tài khoản tại **https://huggingface.co/join** (miễn phí).
2. Vào **https://huggingface.co/settings/tokens** → **Create new token** → đặt tên (vd: `photoai`) → bật quyền **Inference Providers** (hoặc Read) → copy token (đầu `hf_…`).
3. Trong app: **🔑 API Key** → dán token vào ô Hugging Face → **💾 Lưu** → **🔌 Kiểm tra**.
4. Model gợi ý: **FLUX Kontext-dev** (sửa ảnh mạnh) hoặc **Qwen Image Edit** (nhẹ, nhanh).

> Lần chạy đầu model có thể đang “ngủ” — app sẽ **tự chờ model nạp rồi chạy lại**, bạn cứ để yên 1–2 phút. Nếu báo *gated*, hãy mở trang model trên HF để chấp nhận điều khoản, hoặc đổi model Qwen.

---

## 🤖 Cách 3 — GPT Image Pro (trả phí, khi cần ảnh “đỉnh”)

1. Vào **https://platform.openai.com/api-keys** → **Create new secret key** → copy (đầu `sk-…`, chỉ hiện 1 lần).
2. **Nạp credit:** Settings → Billing → *Add to credit balance* ($5–10 dùng rất lâu).
3. Trong app: dán key vào ô OpenAI → **💾 Lưu** → chuyển engine sang **🤖 GPT**.

### Tinh chỉnh GPT Image

| Thiết lập | Gợi ý |
|---|---|
| **Model** | `gpt-image-1` (ổn định) hoặc `gpt-image-1.5` (mới, đẹp hơn). |
| **Kích thước** | Để *Tự động*; ảnh thẻ nên chọn *Dọc 1024×1536*. |
| **Chất lượng** | *Vừa* hàng ngày; *Cao* khi cần ảnh đẹp nhất (chậm 1–3 phút). |
| **Giữ chi tiết ảnh gốc** | Để *Cao* cho ảnh thẻ & phục hồi (giữ mặt tốt nhất). |

---

## 🔒 An toàn key

- Key/token lưu ở **localStorage của trình duyệt** — không nhập key trên máy lạ / máy công cộng.
- Muốn xóa: mở Cài đặt API → xóa trắng ô → Lưu.
- Lộ key OpenAI? Vào trang API keys → **Revoke** ngay và tạo key mới.
- Không bao giờ dán key lên mạng xã hội hay commit vào git.

---

## ❓ Hỏi nhanh

| Câu hỏi | Trả lời |
|---|---|
| Không có key nào dùng được không? | Được! Dùng **🌸 Polli** (không cần key) + công cụ **offline** (cắt, nét, cân trắng, phóng 2×, tấm in). |
| Gemini báo 429 / hết quota? | Nhập thêm key thứ 2, 3 — app tự xoay vòng. Vẫn hết? Đổi sang 🌸/🤗. |
| Pollinations báo quá tải? | Server free đông người dùng — đợi 1–2 phút, đổi model, hoặc sang ✨/🤗. |
| 1 key dùng nhiều máy được không? | Được — mỗi trình duyệt nhập key 1 lần. |
| Sao Gemini báo lỗi khu vực? | Một số mạng chặn Google AI — bật VPN sang US/Singapore rồi thử lại. |
