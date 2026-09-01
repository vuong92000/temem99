/**
 * exporters.js — Tổng hợp kết quả cuối cùng & xuất nhiều định dạng.
 */

export function buildFinalResult(ctx = {}, meta = {}) {
  const script = ctx.script
  const board = ctx.storyboard
  const vp = ctx.videoPrompt
  const neg = ctx.negative
  const dlg = ctx.dialogue

  return {
    meta: {
      workflowName: meta.workflowName || ctx.exportConfig?.name || 'AI Video Workflow',
      generatedAt: new Date().toISOString(),
      nodeCount: meta.nodeCount || 0,
      edgeCount: meta.edgeCount || 0,
    },
    videoName: script?.title || ctx.title || 'Chưa có tiêu đề',
    idea: ctx.idea || script?.logline || '—',
    style: ctx.style || script?.style || '—',
    styleProfile: ctx.styleProfile || null,
    aspectRatio: ctx.aspectRatio || board?.aspectRatio || '9:16',
    duration: ctx.duration || script?.duration || '—',
    language: ctx.language || script?.language || 'Tiếng Việt',
    tone: ctx.tone || script?.tone || '—',
    hook: script?.hook || '—',
    scenes: (script?.scenes || []).map((s) => ({
      index: s.index,
      name: s.name,
      timecode: s.timecode,
      visual: s.visual,
      action: s.action,
      camera: s.camera,
      dialogue: s.dialogue,
      sfx: s.sfx,
      imagePrompt: s.imagePrompt,
      videoPrompt: s.videoPrompt,
    })),
    storyboard: board
      ? {
          aspectRatio: board.aspectRatio,
          frameCount: board.frameCount,
          frames: board.frames,
          continuity: board.continuity,
        }
      : null,
    imagePrompt: ctx.prompt?.main || ctx.imagePrompt || '—',
    promptPack: ctx.prompt || null,
    videoPrompt: vp?.main || '—',
    videoPromptDetail: vp || null,
    negativePrompt: neg?.full || '—',
    dialogue: dlg || null,
    consistency: {
      character: neg?.identityLock || 'Giữ nguyên nhân vật theo ảnh tham chiếu.',
      product: neg?.productLock || 'Giữ nguyên sản phẩm theo ảnh tham chiếu.',
      background: neg?.backgroundLock || 'Giữ nguyên bối cảnh giữa các cảnh.',
      motion: neg?.motionStability || 'Chuyển động ổn định, không flicker.',
      rules: ctx.consistency || [],
    },
    cta: script?.cta || '—',
  }
}

/* ------------------------------------------------------------------ TEXT */

export function toText(r) {
  if (!r) return ''
  const L = []
  const line = (s = '') => L.push(s)
  const rule = (c = '─') => line(c.repeat(72))

  rule('═')
  line(`  ${r.videoName.toUpperCase()}`)
  rule('═')
  line(`Workflow      : ${r.meta.workflowName}`)
  line(`Tạo lúc       : ${new Date(r.meta.generatedAt).toLocaleString('vi-VN')}`)
  line(`Ý tưởng       : ${r.idea}`)
  line(`Phong cách    : ${r.style}`)
  line(`Tỉ lệ khung   : ${r.aspectRatio}`)
  line(`Thời lượng    : ${r.duration}`)
  line(`Ngôn ngữ      : ${r.language}   |   Tone: ${r.tone}`)
  line()
  line(`HOOK MỞ ĐẦU: ${r.hook}`)
  line()
  rule()
  line('1. KỊCH BẢN TỪNG CẢNH')
  rule()
  r.scenes.forEach((s) => {
    line(`\n■ CẢNH ${s.index} — ${s.name}  [${s.timecode}]`)
    line(`  • Hình ảnh   : ${s.visual}`)
    line(`  • Hành động  : ${s.action}`)
    line(`  • Góc máy    : ${s.camera}`)
    if (s.dialogue) line(`  • Lời thoại  : "${s.dialogue}"`)
    if (s.sfx) line(`  • Âm thanh   : ${s.sfx}`)
    line(`  • Prompt ảnh : ${s.imagePrompt}`)
    line(`  • Prompt video: ${s.videoPrompt}`)
  })
  line()
  rule()
  line('2. STORYBOARD')
  rule()
  if (r.storyboard) {
    line(`Tỉ lệ: ${r.storyboard.aspectRatio} | Số khung: ${r.storyboard.frameCount}`)
    r.storyboard.frames.forEach((f) => {
      line(`\n□ KHUNG ${f.index} — ${f.title}`)
      line(`  Shot        : ${f.shotSize} | Camera: ${f.camera}`)
      line(`  Mô tả       : ${f.description}`)
      line(`  Tư thế      : ${f.pose}`)
      line(`  Bối cảnh    : ${f.location}`)
      line(`  Prompt ảnh  : ${f.imagePrompt}`)
    })
    line('\nQuy tắc liên tục:')
    r.storyboard.continuity.forEach((c) => line(`  - ${c}`))
  } else line('(Chưa chạy Storyboard Node)')
  line()
  rule()
  line('3. PROMPT TẠO ẢNH')
  rule()
  line(r.imagePrompt)
  if (r.promptPack) {
    line(`\nCamera   : ${r.promptPack.camera}`)
    line(`Ánh sáng : ${r.promptPack.lighting}`)
    line(`Chuyển động: ${r.promptPack.motion}`)
  }
  line()
  rule()
  line('4. PROMPT CHUYỂN ẢNH THÀNH VIDEO')
  rule()
  line(r.videoPrompt)
  if (r.videoPromptDetail?.sceneMotion?.length) {
    line('\nMotion từng cảnh:')
    r.videoPromptDetail.sceneMotion.forEach((s) => line(`  Cảnh ${s.index} [${s.timecode}]: ${s.prompt}`))
    line('\nQuy tắc chống lỗi:')
    r.videoPromptDetail.antiError.forEach((a) => line(`  - ${a}`))
  }
  line()
  rule()
  line('5. NEGATIVE PROMPT')
  rule()
  line(r.negativePrompt)
  line()
  rule()
  line('6. LỜI THOẠI / VOICE-OVER')
  rule()
  if (r.dialogue?.lines?.length) {
    line(`Giọng: ${r.dialogue.voice} | Tốc độ: ${r.dialogue.speed}`)
    r.dialogue.lines.forEach((l) => line(`  [${l.timecode}] ${l.speaker}: ${l.text}`))
  } else line('(Không có lời thoại)')
  line()
  rule()
  line('7. QUY TẮC NHẤT QUÁN')
  rule()
  line(`• Nhân vật : ${r.consistency.character}`)
  line(`• Sản phẩm : ${r.consistency.product}`)
  line(`• Bối cảnh : ${r.consistency.background}`)
  line(`• Chuyển động: ${r.consistency.motion}`)
  r.consistency.rules.forEach((c) => line(`  - ${c}`))
  line()
  rule()
  line(`8. CTA CUỐI VIDEO: ${r.cta}`)
  rule('═')
  return L.join('\n')
}

/* -------------------------------------------------------------- MARKDOWN */

export function toMarkdown(r) {
  if (!r) return ''
  const L = []
  L.push(`# 🎬 ${r.videoName}`)
  L.push('')
  L.push(`> ${r.idea}`)
  L.push('')
  L.push('| Thuộc tính | Giá trị |')
  L.push('| --- | --- |')
  L.push(`| Workflow | ${r.meta.workflowName} |`)
  L.push(`| Phong cách | ${r.style} |`)
  L.push(`| Tỉ lệ khung | ${r.aspectRatio} |`)
  L.push(`| Thời lượng | ${r.duration} |`)
  L.push(`| Ngôn ngữ | ${r.language} |`)
  L.push(`| Tone | ${r.tone} |`)
  L.push(`| Số cảnh | ${r.scenes.length} |`)
  L.push('')
  L.push(`**Hook mở đầu:** ${r.hook}`)
  L.push('')
  L.push('## 1. Kịch bản từng cảnh')
  r.scenes.forEach((s) => {
    L.push('')
    L.push(`### Cảnh ${s.index} — ${s.name} \`${s.timecode}\``)
    L.push(`- **Hình ảnh:** ${s.visual}`)
    L.push(`- **Hành động:** ${s.action}`)
    L.push(`- **Góc máy:** ${s.camera}`)
    if (s.dialogue) L.push(`- **Lời thoại:** _"${s.dialogue}"_`)
    L.push(`- **Prompt ảnh:**`)
    L.push('```text')
    L.push(s.imagePrompt)
    L.push('```')
    L.push(`- **Prompt video:**`)
    L.push('```text')
    L.push(s.videoPrompt)
    L.push('```')
  })
  L.push('')
  L.push('## 2. Storyboard')
  if (r.storyboard) {
    L.push('')
    L.push('| # | Khung | Shot | Camera | Mô tả |')
    L.push('| --- | --- | --- | --- | --- |')
    r.storyboard.frames.forEach((f) => L.push(`| ${f.index} | ${f.title} | ${f.shotSize} | ${f.camera} | ${f.description.replace(/\|/g, '/')} |`))
    L.push('')
    L.push('**Quy tắc liên tục:**')
    r.storyboard.continuity.forEach((c) => L.push(`- ${c}`))
  } else L.push('_Chưa có storyboard._')
  L.push('')
  L.push('## 3. Prompt tạo ảnh')
  L.push('```text')
  L.push(r.imagePrompt)
  L.push('```')
  L.push('## 4. Prompt video')
  L.push('```text')
  L.push(r.videoPrompt)
  L.push('```')
  L.push('## 5. Negative prompt')
  L.push('```text')
  L.push(r.negativePrompt)
  L.push('```')
  L.push('## 6. Lời thoại')
  if (r.dialogue?.lines?.length) {
    L.push(`Giọng: **${r.dialogue.voice}** — tốc độ ${r.dialogue.speed}`)
    L.push('')
    r.dialogue.lines.forEach((l) => L.push(`- \`${l.timecode}\` **${l.speaker}:** ${l.text}`))
  } else L.push('_Không có lời thoại._')
  L.push('')
  L.push('## 7. Quy tắc nhất quán')
  L.push(`- **Nhân vật:** ${r.consistency.character}`)
  L.push(`- **Sản phẩm:** ${r.consistency.product}`)
  L.push(`- **Bối cảnh:** ${r.consistency.background}`)
  L.push(`- **Chuyển động:** ${r.consistency.motion}`)
  r.consistency.rules.forEach((c) => L.push(`- ${c}`))
  L.push('')
  L.push(`## 8. CTA`)
  L.push(`**${r.cta}**`)
  return L.join('\n')
}

/* ------------------------------------------------------------ PROMPT PACK */

export function toPromptPack(r) {
  if (!r) return ''
  const L = []
  L.push('=== PROMPT PACK ===')
  L.push('')
  L.push('[MASTER IMAGE PROMPT]')
  L.push(r.imagePrompt)
  L.push('')
  L.push('[MASTER VIDEO PROMPT]')
  L.push(r.videoPrompt)
  L.push('')
  L.push('[NEGATIVE PROMPT]')
  L.push(r.negativePrompt)
  L.push('')
  L.push('[SCENE IMAGE PROMPTS]')
  r.scenes.forEach((s) => L.push(`${s.index}. ${s.imagePrompt}`))
  L.push('')
  L.push('[SCENE VIDEO PROMPTS]')
  r.scenes.forEach((s) => L.push(`${s.index}. ${s.videoPrompt}`))
  if (r.storyboard) {
    L.push('')
    L.push('[STORYBOARD FRAME PROMPTS]')
    r.storyboard.frames.forEach((f) => L.push(`${f.index}. ${f.imagePrompt}`))
  }
  L.push('')
  L.push('[CONSISTENCY RULES]')
  ;[r.consistency.character, r.consistency.product, r.consistency.background, r.consistency.motion, ...r.consistency.rules].forEach((c) =>
    L.push(`- ${c}`),
  )
  return L.join('\n')
}

export const toJson = (r) => JSON.stringify(r, null, 2)

export function scopedResult(result, scope) {
  if (!result) return null
  switch (scope) {
    case 'Chỉ kịch bản':
      return { meta: result.meta, videoName: result.videoName, hook: result.hook, scenes: result.scenes, cta: result.cta }
    case 'Chỉ prompt ảnh':
      return { meta: result.meta, imagePrompt: result.imagePrompt, scenes: result.scenes.map((s) => ({ index: s.index, imagePrompt: s.imagePrompt })) }
    case 'Chỉ prompt video':
      return { meta: result.meta, videoPrompt: result.videoPrompt, detail: result.videoPromptDetail }
    case 'Chỉ negative prompt':
      return { meta: result.meta, negativePrompt: result.negativePrompt, consistency: result.consistency }
    default:
      return result
  }
}

/* ---------------------------------------------------------------- helpers */

export function download(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      return true
    } catch {
      return false
    } finally {
      document.body.removeChild(ta)
    }
  }
}
