# DeepSeek 全面增强 Pro

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-v4.0+-orange)](https://www.tampermonkey.net/)

一个专为 [DeepSeek Chat](https://chat.deepseek.com/) 设计的 Tampermonkey 油猴脚本，提供专家模式锁定、侧边栏分组管理、聊天搜索等实用增强功能。

## 📸 功能概览

### 🧠 智能模式锁定
- **自动锁定专家模型**：可选择默认使用专家模型或快速模型，刷新页面后自动恢复
- **深度思考模式持久化**：可预设深度思考开关状态，无需每次手动开启
- **联网搜索状态保持**：一键设定联网搜索的默认开关状态
- **智能检测**：自动识别页面变化并重新应用设置，不怕页面动态更新

### 📂 侧边栏聊天分组管理
- **自定义分组**：内置「⭐ 重要」「💼 工作」「📚 学习」「📋 其他」四个分组，支持重命名
- **分组管理**：右键任意聊天即可将其移入指定分组或创建新分组
- **分组折叠**：点击分组标题可展开/折叠，保持侧边栏整洁
- **数据持久化**：所有分组信息自动保存，刷新或重启浏览器后依然存在
- **颜色标识**：每个分组配有独特的颜色标签，一目了然

### 🔍 聊天搜索
- **侧边栏内集成搜索框**：输入关键词实时筛选聊天记录
- **高亮动画**：匹配的聊天项会有脉冲高亮效果，快速定位
- **快捷键支持**：按 `Esc` 键一键清空搜索

### 🎨 界面优化
- **侧边栏默认收起**：新建聊天后侧边栏保持收起状态



## 🚀 快速安装

### 前提条件
1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
   - [Chrome 版本](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   
     

### 安装脚本

**方法一：一键安装（推荐）**

1. chrome-extension://dhdgffkkebhmkfjojejmpbldmpobfkfo/ask.html?aid=e40d7f6a-405f-44b8-b25f-5c1b6e4097a3

**方法二：手动安装**

1. 复制 `deepseek-enhance-pro.user.js` 的全部内容
2. 打开 Tampermonkey 管理面板
3. 点击「新建脚本」，粘贴内容并保存

## ⚙️ 自定义配置

在脚本开头的 `USER_CONFIG` 对象中，你可以修改以下设置：

```javascript
const USER_CONFIG = {
    deepThink: 0,        // 深度思考：0=关闭, 1=开启
    webSearch: 0,        // 联网搜索：0=关闭, 1=开启
    defaultModel: 0,     // 默认模型：0=专家模型, 1=快速模型
    groups: {            // 默认分组（可右键修改）
        important: '⭐ 重要',
        work: '💼 工作',
        study: '📚 学习',
        other: '📋 其他'
    }
};