# 🎬 AI Video Workflow Builder

Một **workflow builder trực quan** (kéo–thả node, nối dây) để xây dựng toàn bộ quy trình sản xuất nội dung video bằng AI:
từ ý tưởng → phân tích hình ảnh → prompt tạo ảnh → kịch bản → storyboard → prompt video → negative prompt → kết quả xuất bản.

Giao diện lấy cảm hứng từ **ComfyUI · n8n · Freepik AI · Canva Flow**, dark mode cao cấp, tối ưu cho desktop.

![stack](https://img.shields.io/badge/React-18-61dafb) ![stack](https://img.shields.io/badge/React_Flow-11-ff0072) ![stack](https://img.shields.io/badge/Tailwind-3.4-38bdf8) ![stack](https://img.shields.io/badge/Vite-5-646cff)

---

## ⚡ Chạy dự án

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build production vào dist/
npm run preview  # xem thử bản build
```

---

## ✨ Tính năng chính

### Canvas & Workflow

| | |
| --- | --- |
| Kéo thả node từ sidebar vào canvas | ✅ |
| Nối dây bezier mượt, gradient, xoá dây bằng nút ✕ trên dây | ✅ |
| Di chuyển / xoá / nhân bản / đổi tên node (double click tiêu đề) | ✅ |
| Chọn nhiều node (kéo chọn vùng hoặc Shift + click) | ✅ |
| Copy / Paste / Duplicate node (kèm dây nối bên trong) | ✅ |
| Undo / Redo (60 bước) | ✅ |
| Zoom, pan, fit-view, mini map, snap lưới | ✅ |
| Auto layout bằng **dagre** (ngang / dọc) | ✅ |
| Group node (khung nhóm co giãn) + Ungroup | ✅ |
| Collapse / Expand từng node | ✅ |
| Bật / tắt (disable) node — node bị bỏ qua khi chạy | ✅ |
| Context menu chuột phải trên node & trên canvas | ✅ |
| Kiểm tra lỗi workflow (thiếu input, chưa nối dây, thiếu config, vòng lặp) | ✅ |
| Chạy toàn bộ workflow theo thứ tự topological của dây nối | ✅ |
| Chạy thử từng node riêng lẻ (Test Node) | ✅ |
| Trạng thái node: Idle · Ready · Warning · Running · Success · Error · Disabled | ✅ |
| Log xử lý realtime, thời gian chạy từng node | ✅ |
| Lưu / tải workflow bằng localStorage, Import / Export JSON | ✅ |
| 5 workflow mẫu dựng sẵn (đã nối dây) | ✅ |
| Toast notification, empty state, loading, animation | ✅ |

### Thư viện node (34 node — 5 nhóm)

**Input** — Image · Text Input · Product Info · Character Info · Background Info · Outfit · Audio/Voice
**AI Generation** — Image Analysis · Prompt Generator · Script Generator · Storyboard Generator · Video Prompt · Dialogue Generator · Negative Prompt · Style
**Control** — Condition · Merge · Split · Loop · Delay · Validate
**Output** — Preview · Export · Export Text · Export JSON · Copy Result · Download Result
**Utility** — Aspect Ratio · Duration · Language · Tone · Camera Style · Motion Style · Consistency Rule

### Kết quả đầu ra

Sau khi chạy, Bottom Panel hiển thị bản kịch bản hoàn chỉnh:

1. Tên video, ý tưởng, phong cách, tỉ lệ khung hình, thời lượng, ngôn ngữ, tone
2. Hook mở đầu + CTA cuối video
3. Kịch bản từng cảnh: timecode, hình ảnh, hành động, góc máy, lời thoại, âm thanh
4. **Prompt tạo ảnh** riêng cho từng cảnh
5. **Prompt chuyển ảnh → video** riêng cho từng cảnh
6. Storyboard nhiều khung (shot size, camera, tư thế, bối cảnh, prompt riêng)
7. Negative prompt theo 10 nhóm lỗi (mặt, tay, cơ thể, trang phục, sản phẩm, bối cảnh, ánh sáng, chuyển động, video, vật thể lạ)
8. Quy tắc giữ nhất quán nhân vật / sản phẩm / bối cảnh / chuyển động
9. Lời thoại – voice-over theo timecode

Xuất ra: **Copy toàn bộ · TXT · JSON · Markdown · Prompt Pack**.

---

## ⌨️ Phím tắt

| Phím | Chức năng |
| --- | --- |
| `Ctrl + Enter` | Run Workflow |
| `Ctrl + S` | Lưu workflow |
| `Ctrl + Z` / `Ctrl + Shift + Z` | Undo / Redo |
| `Ctrl + C` / `Ctrl + V` | Copy / Paste node |
| `Ctrl + D` | Duplicate node |
| `Ctrl + A` | Chọn tất cả |
| `Ctrl + G` | Nhóm node đã chọn |
| `Delete` | Xoá node / dây nối |
| `F` | Căn giữa workflow |
| `Shift + kéo` | Chọn nhiều node |

---

## 🧱 Kiến trúc mã nguồn

```
src/
├── App.jsx                     # Layout tổng: Header / Sidebar / Canvas / Panel / Bottom
├── main.jsx
├── index.css                   # Tailwind + theme dark cao cấp + style React Flow
├── components/
│   ├── Header.jsx              # Logo, tên workflow, New/Save/Load/Layout/Validate/Import/Export/Run
│   ├── Sidebar.jsx             # Thư viện node theo nhóm + tìm kiếm + workflow mẫu
│   ├── Canvas.jsx              # React Flow, toolbar, minimap, context menu, phím tắt
│   ├── PropertiesPanel.jsx     # Cấu hình node / Input-Output / Kết quả node
│   ├── BottomPanel.jsx         # Kết quả · Kịch bản · Storyboard · Prompts · Log · Cảnh báo · JSON
│   ├── Toasts.jsx  Modals.jsx  ui.jsx
│   ├── fields/FieldRenderer.jsx# Render field động: text, select, chips, multiselect, toggle, slider, image
│   ├── nodes/WorkflowNode.jsx  # Node card (icon, status, ports, preview kết quả, quick actions)
│   ├── nodes/GroupBoxNode.jsx  # Khung nhóm node
│   └── edges/FlowEdge.jsx      # Dây bezier gradient + nút xoá
├── lib/
│   ├── nodeLibrary.js          # ⭐ Registry toàn bộ node: ports, fields, actions, hàm run()
│   ├── generators.js           # "AI engine" mô phỏng: script, storyboard, prompt, negative, dialogue
│   ├── workflowEngine.js       # Topological sort, validate, chạy workflow, trạng thái node
│   ├── exporters.js            # Tổng hợp kết quả + xuất TXT / MD / JSON / Prompt Pack
│   ├── autoLayout.js           # Auto layout bằng dagre
│   └── templates.js            # 5 workflow mẫu đã nối dây
└── store/useWorkflowStore.js   # Zustand: nodes, edges, history, logs, results, settings, persistence
```

### Thêm một node mới (chỉ 1 bước)

Thêm một entry vào `NODE_DEFS` trong `src/lib/nodeLibrary.js` — UI, sidebar, panel cấu hình,
cổng vào/ra và engine sẽ tự động nhận node mới:

```js
myNode: {
  type: 'myNode',
  label: 'My Node',
  group: 'ai',                 // input | ai | control | output | utility
  icon: 'Sparkles',            // tên icon lucide-react
  accent: 'aqua',
  description: 'Mô tả ngắn hiển thị trên node.',
  inputs:  [{ id: 'in', label: 'Context', required: true }],
  outputs: [{ id: 'out', label: 'Result' }],
  fields: [
    { key: 'mode', type: 'chips', label: 'Chế độ', options: ['A', 'B'], default: 'A' },
  ],
  actions: [{ id: 'run', label: 'Generate', icon: 'Play', kind: 'run' }],
  run: ({ ctx, config }) => ({
    result: { Output: `Đã xử lý ở chế độ ${config.mode}` }, // hiển thị trong panel
    patch:  { myData: config.mode },                        // dữ liệu chảy sang node sau
  }),
}
```

### Kết nối API AI thật

Toàn bộ nội dung hiện được sinh bằng template thông minh trong `src/lib/generators.js` (không cần API key).
Để dùng model thật, chỉ cần thay thân các hàm `buildScript`, `buildStoryboard`, `buildVideoPrompt`… bằng lời gọi API
và cho `run()` của node trả về Promise — engine đã `await` sẵn kết quả của từng node.

---

## 🧠 Cách workflow chạy

1. Validate toàn bộ node (input bắt buộc, dây nối, cấu hình, vòng lặp).
2. Sắp thứ tự chạy bằng **topological sort** trên đồ thị dây nối.
3. Mỗi node gộp context từ tất cả node cha (`mergeContexts`), chạy `run()`, sinh `result` + `patch`.
4. `patch` được ghi vào context và truyền tiếp xuống node con.
5. `Condition Node` chọn nhánh `true`/`false`; nhánh không hoạt động sẽ bị đánh dấu **Disabled** và bỏ qua.
6. Node lỗi → dừng workflow, log rõ nguyên nhân, node chuyển trạng thái **Error**.
7. Hoàn tất → `buildFinalResult()` tổng hợp kết quả cuối và hiển thị ở Bottom Panel.

---

## 📦 Công nghệ

React 18 · React Flow 11 · Zustand 5 · Tailwind CSS 3.4 · dagre · lucide-react · Vite 5
