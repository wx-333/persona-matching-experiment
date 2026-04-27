# 部署问卷到线上

以下是使用 GitHub Pages + Google Sheets 部署问卷的完整步骤。

## 第一步：设置 Google Sheets 后端

1. 打开 https://sheets.google.com，创建一个新的空白表格
2. 菜单：**扩展程序 > Apps Script**
3. 将 `apps_script.gs` 的**全部代码**粘贴进去，替换默认内容
4. 点击顶部的 **"部署 > 新部署"**
5. 类型选择 **"Web 应用"**，设置：
   - 执行身份：**"我"**
   - 访问权限：**"所有人"**（或"任何知道链接的人"）
6. 点击部署，授权权限，**复制以 `/exec` 结尾的 URL**
7. 回到 Google Sheets，你会看到自动创建了 `trials` 和 `meta` 两个 sheet（列名已自动生成）

## 第二步：配置问卷页面

1. 打开 `experiment_survey_v4.html`，找到最上方 JS 中的：
   ```js
   const GAS_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
   ```
2. 替换为你第一步复制的 URL

## 第三步：上传到 GitHub 并开启 Pages

需要上传以下文件到**同一个 GitHub 仓库**（保持目录结构不变）：

```
repo/
├── index.html                        # 问卷首页（复制 experiment_survey_v4.html 并改名）
├── experiment_survey_v4.html         # 保留原文件也可
├── apps_script.gs                    # （可选）Apps Script 源码备份
├── questions_mimo_v6.json            # 问卷题目定义
├── questions.json                    # （可选）旧版问卷
├── selection.json                    # （可选）筛选记录
├── mimo_audio_samples_v6/            # ★ MiMo v6 音频文件（正式用这套）
│   ├── somatic_mass/
│   │   ├── V5_Q001_target_mimo.wav
│   │   ├── V5_Q001_negative_mimo.wav
│   │   └── ...
│   ├── vitality/
│   ├── social_dominance/
│   ├── emotional_temperature/
│   ├── vocal_texture/
│   └── multi/
└── audio_samples/                    # 旧版 Parler 音频（选上传）
    └── ...
```

**不需要上传**的文件：`candidate_pool/`、`__pycache__/`、`*.py` 等后端/开发文件。

### 重要：创建 index.html

最简单的做法：把配置好 GAS_URL 的 `experiment_survey_v4.html` 复制一份命名为 `index.html`，这样访问根路径直接进入问卷。但默认会加载 `questions.json`，如果要默认加载 `questions_mimo_v6.json`，修改 index.html 中的这一行：

```js
const questionsFile = urlParams.get('questions') || 'questions_mimo_v6.json';
```

同时修改默认音频目录：
```js
const audioDir = (urlParams.get('audio_dir') || 'mimo_audio_samples_v6').replace(/\/+$/, '');
```

### 开启 GitHub Pages

1. 仓库 Settings > Pages
2. Source 选 **Deploy from a branch**
3. Branch 选 `main`，文件夹选 `/ (root)`
4. 保存，等待部署完成，会得到一个类似 `https://你的用户名.github.io/仓库名/` 的 URL

## 第四步：测试

1. 用手机或另一台设备打开你的 GH Pages URL
2. 完成问卷，提交结果
3. 打开 Google Sheets 确认数据已写入 `trials` sheet
4. 将 GAS 返回的 `ok: true` 视为成功

## 可选：切换问卷和音频（通过 URL 参数）

线上支持多套问卷切换，只需在 URL 后面加参数：

| URL 参数 | 说明 |
|---|---|
| `?questions=questions_mimo_v6.json` | 使用 v6 问卷 |
| `?questions=questions.json` | 使用旧版 v4 问卷 |
| `&audio_dir=mimo_audio_samples_v6` | 指定音频目录 |
| `?questions=questions_mimo_v5.json&audio_dir=mimo_audio_samples_v5` | 组合使用 v5 |

例如：
```
https://你的用户名.github.io/仓库名/?questions=questions_mimo_v6.json&audio_dir=mimo_audio_samples_v6
```

## 故障排查

| 问题 | 检查 |
|---|---|
| 提交后没反应 | F12 控制台看是否有 CORS 或网络错误，检查 GAS_URL 是否正确 |
| 提交后数据未写入 Sheet | 重新部署 GAS（"部署 > 管理部署 > 编辑 > 新版本"），权限设"任何人" |
| 音频加载失败 | 检查路径大小写（GitHub Pages 大小写敏感），确认 WAV 文件已上传 |
| 问卷显示空白 | 确认 `questions.json`（或指定的 json 文件）在根目录且格式正确 |
