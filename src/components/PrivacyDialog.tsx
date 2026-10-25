import { Modal } from './ui/Modal';
import { Notice } from './ui/Notice';

export function PrivacyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title="隐私与数据说明" onClose={onClose} wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Notice tone="success">
          <strong>你的数据只在你自己的浏览器里。</strong> 本产品不依赖自有服务器，不使用数据库，所有计算均在本地完成。
        </Notice>
        <div className="prose">
          <h3>数据如何被处理</h3>
          <ul>
            <li>导入的 CSV 文件只在浏览器内解析与计算，<strong>不会上传到任何服务器</strong>。</li>
            <li>不会把数据发送给外部 AI、第三方分析平台，不使用追踪像素，不收集遥测。</li>
            <li>页面刷新或关闭后，默认清除本次会话中的原始数据。</li>
            <li>可在「数据管理」中一键<strong>清除所有数据</strong>，同时清理内存、图表缓存与本地保存。</li>
          </ul>
          <h3>可选的本地保存</h3>
          <ul>
            <li>仅在「数据管理」中<strong>主动开启</strong>后，分析数据才会保存在当前浏览器的 localStorage 中。</li>
            <li>数据只保存在当前浏览器，清除浏览器数据后可能无法恢复；清除本工具数据会一并删除。</li>
          </ul>
          <h3>安全边界</h3>
          <ul>
            <li>不会读取 Cookie，不要求 X 登录凭据，不读取 X 网站内部接口，不抓取 X 网页。</li>
            <li>不会把导入内容当作脚本或 HTML 执行，帖子正文始终以纯文本展示。</li>
            <li>不向公开代码仓库写入任何用户数据。</li>
          </ul>
          <h3>第三方声明</h3>
          <p>
            本产品为独立第三方项目，与 X Corp. 无隶属关系，不读取 X 非公开数据，也不代表 X 官方结论。
            本工具仅分析你主动导入的数据；所有提示基于统计规则，不构成对账号是否被限流、降权、封禁或列入风控的任何判定。
          </p>
        </div>
      </div>
    </Modal>
  );
}
