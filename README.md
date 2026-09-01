# AI Video Workflow Builder — PRO v2.5

Trình dựng workflow dạng node graph để thiết kế **kịch bản video AI, storyboard và bộ prompt (ảnh + video motion)** cho quảng cáo / TVC / TikTok.

Giao diện chạy hoàn toàn ở client (không cần backend): toàn bộ node config được tổng hợp bởi một "workflow engine" giả lập để sinh ra kịch bản hoàn chỉnh.

## Chạy dự án

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # bundle sản phẩm vào dist/
npm run preview # xem thử bản build
```

Yêu cầu: Node 18+.

## Tính năng

### Canvas
- Kéo thả node từ **thư viện 20 node** (Input · AI · Utility · Control · Output) lên canvas.
- Nối dây bằng cách kéo từ cổng **output** (bên phải) sang cổng **input** (bên trái).
  - Chặn tự nối chính nó, chặn trùng lặp, **chặn tạo chu trình (cycle)**.
  - Click vào đường nối rồi click biểu tượng ✕ để xóa.
- Kéo nền để pan, **cuộn chuột để zoom**, nút *Fit view* để thu/ phóng vừa toàn bộ graph.
- **Mini map** ở góc dưới bên trái: click để nhảy tới vùng graph mong muốn.
- **Auto Layout**: tự xếp node theo từng lớp dựa trên thứ tự topological.

### Panel cấu hình (bên phải)
- Schema-driven: mỗi node type khai báo `fields` (text / textarea / select / number / slider / chips) nên mọi node đều có form chỉnh sửa, không chỉ 3 node như bản gốc.
- Hiển thị danh sách kết nối vào/ra của node đang chọn.
- Nút *Thử nghiệm Node này* để chạy lẻ một node.

### Thực thi & kết quả (panel dưới)
- Sắp xếp thực thi theo **topological sort** (Kahn), log từng bước, cảnh báo node thiếu input.
- Kết quả sinh ra **động từ config hiện tại** (số cảnh, style, ánh sáng, tỷ lệ, thời lượng, giọng đọc, camera…):
  - Tab **Kịch Bản Chi Tiết**: visual / hành động / lời thoại từng cảnh.
  - Tab **Storyboard**: khung hình đúng tỷ lệ (9:16, 16:9, 1:1, 4:5).
  - Tab **Prompt Pack AI**: image prompt + video motion prompt (tiếng Anh) + negative prompt.
  - Tab **JSON Output** và **Execution Logs**.
- Xuất / copy: JSON, Markdown, TXT, Prompt Pack.

### Khác
- Undo / Redo (Ctrl/⌘ + Z, Ctrl/⌘ + Shift + Z), Delete để xóa node, Esc để hủy.
- Lưu / nhập lại workflow dạng JSON.
- Nút **Preset** nạp lại workflow mẫu (serum PureGlow, 9 node).

## Cấu trúc mã

```
src/
├── App.jsx                  # điều phối state graph, canvas, thực thi
├── data/nodeTemplates.js    # 20 node template: category, ports, config schema, preset workflow
├── lib/
│   ├── graph.js             # vị trí cổng, bezier, topological sort, cycle guard, layout, bounds
│   └── generator.js         # sinh kịch bản/storyboard/prompt pack + exporter
└── components/
    ├── NodeLibrary.jsx      # sidebar trái (tìm kiếm + kéo thả)
    ├── NodeCard.jsx         # thẻ node trên canvas (cổng nằm sát mép, toạ độ chính xác)
    ├── Connections.jsx      # SVG layer vẽ đường nối
    ├── Inspector.jsx        # sidebar phải (form sinh từ schema)
    ├── ResultsPanel.jsx     # panel dưới (5 tab + export)
    └── MiniMap.jsx          # bản đồ thu nhỏ
```

## Ghi chú kỹ thuật

- Cổng nối được **định vị tuyệt đối** ở mép thẻ node (`NODE_W`, `PORT_TOP`, `PORT_GAP`), nên toạ độ đường nối được tính chính xác thay vì ước lượng `x + 240 / y + 60` như bản gốc.
- Lịch sử undo/redo được ghi cho các thay đổi cấu trúc (thêm/xóa/nhân bản/nối dây/kéo node); chỉnh sửa text trong form không đẩy lịch sử để tránh nhiễu.
- Engine hiện tại là **mock**: `src/lib/generator.js` là nơi duy nhất cần thay thế khi muốn gắn API thật (Gemini / OpenAI / …).
