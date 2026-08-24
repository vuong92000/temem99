# Episodes — chuỗi video nhân vật nhất quán

Thư mục này chứa kịch bản từng tập (JSON) và script chạy tự động, dùng để tạo video
nhiều cảnh giữ nguyên nhân vật (An, Mây, Tro) qua các tập.

## Vì sao không dùng chế độ "creative"

`POST /api/tasks/creative` nhận **một ý tưởng** rồi tự động viết kịch bản, tự chia cảnh
và tự sinh prompt cho từng cảnh. Nghĩa là prompt bạn viết tay cho từng clip sẽ bị mô
hình biên kịch viết lại — mất kiểm soát bố cục, chuyển động máy quay và chi tiết nhân vật.

Vì vậy script này gửi **mỗi clip thành một task `simple` (t2v) riêng**, gửi prompt
**nguyên văn** tới mô hình video, rồi ghép lại bằng ffmpeg. Đổi lại ta có toàn quyền
kiểm soát từng cảnh.

Để giữ nhân vật nhất quán giữa các clip độc lập, script tự động:

- **Ghép `world_bible` vào đầu mọi prompt clip** — mô tả cố định về An, Mây, Tro, ngôi
  nhà và bối cảnh, để mọi cảnh cùng một "vũ trụ hình ảnh".
- **Gắn `negative_prompt` chung** cho mọi clip.
- **Lệch seed theo từng clip** (`seed + n`). Dùng chung một seed cho mọi cảnh thường cho
  ra khung hình gần như giống hệt nhau; lệch seed giữ chung tông màu nhưng khác bố cục.

## Cách dùng

```bash
# 1. Xem trước prompt sẽ gửi đi (không gọi API, không tốn quota)
.venv/bin/python episodes/run_episode.py episodes/ep02_rooftop_breakfast.json --dry-run

# 2. Chạy thật — 6 clip, ghép thành output/episode_02.mp4
.venv/bin/python episodes/run_episode.py episodes/ep02_rooftop_breakfast.json

# 3. Làm lại riêng clip 3 và 5 nếu chưa ưng
.venv/bin/python episodes/run_episode.py episodes/ep02_rooftop_breakfast.json --clips 3,5

# 4. Chỉ ghép lại từ các clip đã có
.venv/bin/python episodes/run_episode.py episodes/ep02_rooftop_breakfast.json --concat-only
```

Tiến độ lưu ở `episodes/.state_ep02.json`, nên chạy lại sẽ không mất clip đã xong.
Video thành phẩm nằm ở `output/` (cả hai đều đã được gitignore).

## Cấu trúc file kịch bản

| Khóa | Ý nghĩa |
|---|---|
| `world_bible` | Mô tả nhân vật + bối cảnh, tự động thêm vào đầu mọi clip |
| `negative_prompt` | Negative prompt dùng chung |
| `full_episode_prompt` | Prompt mô tả cả tập — tham khảo, hoặc dùng khi render một mạch |
| `minimal_motion_prompt` | Bản rút gọn cho mô hình yêu cầu câu lệnh tối giản |
| `clips[]` | Danh sách cảnh: `n`, `title`, `duration`, `prompt` |
| `video_width/height` | Mặc định 768×1152 (dọc 9:16) |
| `seed` | Seed gốc; mỗi clip dùng `seed + n` |

`duration` chỉ nhận các giá trị **5, 10, 15, 18, 20** giây (xem `DURATION_FRAME_MAP`
trong `core/config.py`). Giá trị khác sẽ bị server trả lỗi 422.

## Tạo tập mới

Copy `ep02_rooftop_breakfast.json`, giữ nguyên `world_bible` để nhân vật không đổi giữa
các tập, rồi thay `episode`, `title` và danh sách `clips`.

## Yêu cầu mạng

Script cần server đang chạy (`.venv/bin/python server.py`) và server phải gọi được
`apihub.agnes-ai.com`. Nếu máy bị chặn ra ngoài, task sẽ treo ở bước
"提交视频任务" và tự thử lại — không phải lỗi kịch bản. Kiểm tra nhanh:

```bash
curl -sI --max-time 10 https://apihub.agnes-ai.com/v1 | head -1
```
