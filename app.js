// ===== DOM 元素获取 =====
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.tool-panel');
const inputText = document.getElementById('input-text');
const outputText = document.getElementById('output-text');
const inputCount = document.getElementById('input-count');
const outputCount = document.getElementById('output-count');
const btnProcess = document.getElementById('btn-process');
const btnPaste = document.getElementById('btn-paste');
const btnClear = document.getElementById('btn-clear');
const btnCopy = document.getElementById('btn-copy');
const toast = document.getElementById('toast');

// 输入模式相关
const inputModeTabs = document.querySelectorAll('.input-mode-tab');
const modePanels = document.querySelectorAll('.input-mode');
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const btnRemoveFile = document.getElementById('btn-remove-file');

// 输出模式相关
const outputModeText = document.getElementById('output-mode-text');
const outputModeFile = document.getElementById('output-mode-file');
const downloadFilename = document.getElementById('download-filename');
const btnDownload = document.getElementById('btn-download');

let currentTool = 'summarize';   // 当前工具
let uploadedText = '';            // 上传文件提取的文本
let uploadedFileName = '';        // 上传文件的原始文件名
let uploadedFileExt = '';         // 上传文件的扩展名
let currentInputMode = 'text';   // 当前输入模式
let lastResult = '';              // 最近一次处理结果文本

// ===== 功能选项卡切换 =====
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    panels.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    currentTool = tab.dataset.tool;
    document.getElementById(`panel-${currentTool}`).classList.add('active');
  });
});

// ===== 输入模式切换 =====
inputModeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    inputModeTabs.forEach(t => t.classList.remove('active'));
    modePanels.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    currentInputMode = tab.dataset.mode;
    document.getElementById(`mode-${currentInputMode}`).classList.add('active');
  });
});

// ===== 缩写扩写：模式切换时动态调整滑块范围 =====
const rewriteMode = document.getElementById('rewrite-mode');
const rewriteRatio = document.getElementById('rewrite-ratio');
const rewriteRatioValue = document.getElementById('rewrite-ratio-value');

rewriteMode.addEventListener('change', () => {
  if (rewriteMode.value === 'shorten') {
    rewriteRatio.min = 1;
    rewriteRatio.max = 100;
    rewriteRatio.value = 50;
  } else {
    rewriteRatio.min = 100;
    rewriteRatio.max = 1000;
    rewriteRatio.value = 200;
  }
  rewriteRatioValue.textContent = rewriteRatio.value + '%';
});

rewriteRatio.addEventListener('input', () => {
  rewriteRatioValue.textContent = rewriteRatio.value + '%';
});

// ===== 文件上传处理 =====
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) handleFile(file);
});

btnRemoveFile.addEventListener('click', () => {
  uploadedText = '';
  uploadedFileName = '';
  uploadedFileExt = '';
  fileInput.value = '';
  fileInfo.hidden = true;
  uploadArea.style.display = '';
  inputCount.textContent = '0 字';
  showToast('文件已移除');
});

// 处理上传文件，提取文本并记录文件名和扩展名
async function handleFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const supported = ['txt', 'md', 'docx'];
  if (!supported.includes(ext)) { showToast('不支持的文件格式'); return; }

  try {
    if (ext === 'txt' || ext === 'md') {
      uploadedText = await file.text();
    } else if (ext === 'docx') {
      uploadedText = await readDocx(file);
    }

    // 记录原始文件信息，用于输出同类型文档
    uploadedFileName = file.name;
    uploadedFileExt = ext;

    fileName.textContent = `${file.name} (${uploadedText.length} 字)`;
    fileInfo.hidden = false;
    uploadArea.style.display = 'none';
    inputCount.textContent = `${uploadedText.length} 字`;
    showToast('文件读取成功');
  } catch (err) {
    showToast('文件读取失败：' + err.message);
  }
}

// 使用 mammoth.js 解析 docx 文件
async function readDocx(file) {
  if (!window.mammoth) {
    await loadScript('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js');
  }
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// 动态加载外部脚本
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error('加载依赖库失败，请检查网络'));
    document.head.appendChild(script);
  });
}

// ===== 输出模式切换 =====
// 根据输入模式自动切换输出区域：文本模式显示文本，文档模式显示下载
function showOutputText() {
  outputModeText.classList.add('active');
  outputModeFile.classList.remove('active');
}

function showOutputFile(resultText) {
  outputModeText.classList.remove('active');
  outputModeFile.classList.add('active');

  // 生成输出文件名：原文件名加 _processed 后缀
  const baseName = uploadedFileName.replace(/\.[^.]+$/, '');
  const outName = `${baseName}_processed.${uploadedFileExt}`;
  downloadFilename.textContent = outName;
}

// ===== 字数统计 =====
inputText.addEventListener('input', () => {
  inputCount.textContent = `${inputText.value.length} 字`;
});

// ===== 按钮事件 =====
btnPaste.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    inputText.value = text;
    inputText.dispatchEvent(new Event('input'));
    showToast('已粘贴');
  } catch { showToast('粘贴失败，请手动粘贴'); }
});

btnClear.addEventListener('click', () => {
  inputText.value = '';
  outputText.value = '';
  uploadedText = '';
  uploadedFileName = '';
  uploadedFileExt = '';
  lastResult = '';
  fileInput.value = '';
  fileInfo.hidden = true;
  uploadArea.style.display = '';
  inputCount.textContent = '0 字';
  outputCount.textContent = '0 字';
  showOutputText(); // 重置为文本输出模式
});

btnCopy.addEventListener('click', async () => {
  if (!outputText.value) return;
  try {
    await navigator.clipboard.writeText(outputText.value);
    showToast('已复制到剪贴板');
  } catch { showToast('复制失败'); }
});

// ===== 下载文档按钮 =====
btnDownload.addEventListener('click', () => {
  if (!lastResult) return;

  const baseName = uploadedFileName.replace(/\.[^.]+$/, '');
  const outName = `${baseName}_processed.${uploadedFileExt}`;

  if (uploadedFileExt === 'txt' || uploadedFileExt === 'md') {
    // txt / md：直接生成纯文本文件下载
    downloadTextFile(outName, lastResult);
  } else if (uploadedFileExt === 'docx') {
    // docx：生成 docx 文件下载
    downloadDocx(outName, lastResult);
  }
});

// 生成纯文本文件并触发下载
function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, filename);
}

// 生成 docx 文件并触发下载（使用简易 docx XML 模板）
async function downloadDocx(filename, content) {
  // 动态加载 docx 生成库
  if (!window.docx) {
    await loadScript('https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.min.js');
  }

  // 将文本按段落拆分，生成 docx 文档
  const paragraphs = content.split('\n').filter(Boolean).map(line =>
    new docx.Paragraph({ children: [new docx.TextRun(line)] })
  );

  const doc = new docx.Document({
    sections: [{ children: paragraphs }],
  });

  const blob = await docx.Packer.toBlob(doc);
  triggerDownload(blob, filename);
}

// 通用下载触发
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('文档已下载');
}

// ===== 获取输入文本 =====
function getInputText() {
  if (currentInputMode === 'file' && uploadedText) return uploadedText;
  return inputText.value.trim();
}

// ===== 构建 AI Prompt =====
function buildPrompt(text) {
  switch (currentTool) {
    case 'summarize':
      return `请对以下文本进行总结提炼，抓住核心要点，输出简洁的摘要。只输出摘要内容，不要额外说明。\n\n${text}`;
    case 'polish': {
      const req = document.getElementById('polish-requirement').value.trim();
      const extra = req ? `，具体要求：${req}` : '';
      return `请润色以下文本，提升表达质量和可读性${extra}。保持原意不变，只输出润色后的文本。\n\n${text}`;
    }
    case 'rewrite': {
      const mode = document.getElementById('rewrite-mode').value;
      const ratio = document.getElementById('rewrite-ratio').value;
      const modeText = mode === 'shorten' ? '缩写精简' : '扩写丰富';
      return `请将以下文本进行${modeText}，目标长度约为原文的${ratio}%。保持核心意思不变，只输出处理后的文本。\n\n${text}`;
    }
    case 'translate': {
      const from = document.getElementById('translate-from').value;
      const to = document.getElementById('translate-to').value;
      const langMap = { auto: '自动检测', zh: '中文', en: '英文', ja: '日文', ko: '韩文', fr: '法文', de: '德文', es: '西班牙文' };
      const fromText = from === 'auto' ? '' : `源语言为${langMap[from]}，`;
      return `${fromText}请将以下文本翻译为${langMap[to]}。保持原文风格和语境，只输出翻译结果。\n\n${text}`;
    }
    default:
      return text;
  }
}

// ===== 调用 AI API =====
async function callAPI(prompt) {
  const { apiKey, apiUrl, model } = CONFIG;
  if (!apiKey) throw new Error('请在 config.js 中填写你的 API Key');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是一个专业的文本处理助手，请严格按照用户要求处理文本。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API 请求失败 (${response.status})`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '未获取到结果';
}

// ===== 处理按钮 =====
btnProcess.addEventListener('click', async () => {
  const text = getInputText();
  if (!text) { showToast('请先输入需要处理的文本'); return; }

  // 润色功能必须填写润色要求
  if (currentTool === 'polish') {
    const req = document.getElementById('polish-requirement').value.trim();
    if (!req) { showToast('请先填写润色要求'); return; }
  }

  const btnText = btnProcess.querySelector('.btn-text');
  const btnLoading = btnProcess.querySelector('.btn-loading');
  btnProcess.disabled = true;
  btnText.hidden = true;
  btnLoading.hidden = false;
  outputText.value = '';
  outputCount.textContent = '0 字';

  try {
    const prompt = buildPrompt(text);
    const result = await callAPI(prompt);
    lastResult = result;

    if (currentInputMode === 'file' && uploadedFileName) {
      // 文档模式：显示下载区域
      showOutputFile(result);
      outputCount.textContent = `${result.length} 字`;
    } else {
      // 文本模式：显示文本结果
      showOutputText();
      outputText.value = result;
      outputCount.textContent = `${result.length} 字`;
    }
    showToast('处理完成');
  } catch (err) {
    showOutputText();
    outputText.value = `错误：${err.message}`;
    showToast(err.message);
  } finally {
    btnProcess.disabled = false;
    btnText.hidden = false;
    btnLoading.hidden = true;
  }
});

// ===== Toast 提示 =====
function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => { toast.hidden = true; }, 2500);
}
