import { useState } from 'react';
import { FileSpreadsheet, FlaskConical, Loader2, Lock, Sparkles } from 'lucide-react';
import { useData } from '../state/DataContext';
import { ImportDropzone } from '../components/ImportDropzone';
import { FieldMappingEditor } from '../components/FieldMappingEditor';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Notice } from '../components/ui/Notice';
import styles from './ImportPage.module.css';

export function ImportPage() {
  const { beginImport, beginDemoImport, pending, commitImport, cancelImport, notify } = useData();
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);

  const handleFile = async (f: File) => {
    setBusy(true);
    try {
      await beginImport(f);
    } catch (e) {
      notify(e instanceof Error ? e.message : '文件读取失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  const handleDemo = () => {
    setDemoBusy(true);
    window.setTimeout(() => {
      beginDemoImport();
      setDemoBusy(false);
    }, 60);
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1>X Account Insight</h1>
        <p className={styles.tagline}>X 账号运营数据分析 · 真实数据 · 透明计算 · 可解释建议</p>
        <p className={styles.intro}>
          导入 X 分析页导出的 CSV，在浏览器本地计算曝光、互动、粉丝变化与发帖表现。
          不接入 X API、不读取 Cookie、不上传任何数据。
        </p>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <Sparkles size={16} />
          导入数据开始分析
        </div>
        <div className={styles.importGrid}>
          <ImportDropzone
            title="Content CSV — 单条帖子表现"
            desc="X 分析页「内容 Content」标签页导出的数据：每条帖子的曝光、点赞、回复、转发、收藏等"
            onFile={handleFile}
            busy={busy}
          />
          <ImportDropzone
            title="Overview CSV — 每日整体表现"
            desc="X 分析页「概览 Overview」标签页导出的数据：每日曝光、主页访问、新增/取消关注等"
            onFile={handleFile}
            busy={busy}
          />
        </div>
        <div className={styles.hints}>
          <span className="muted small">可只导入其中一类：</span>
          <span className="muted small">仅 Content 可分析单帖与曝光；仅 Overview 可分析每日汇总；两者都导入可获得完整结果。</span>
        </div>
        <div className={styles.demoRow}>
          <span className="muted small">想先体验功能？</span>
          <Button variant="outline" size="sm" onClick={handleDemo} disabled={demoBusy}>
            {demoBusy ? <Loader2 size={14} className={styles.spin} /> : <FlaskConical size={14} />}
            加载模拟演示数据
          </Button>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <FileSpreadsheet size={16} />
          如何获取数据文件
        </div>
        <ol className={styles.steps}>
          <li>登录 X 后打开 <strong>analytics.x.com</strong>（X 分析页）。</li>
          <li>在「内容 Content」标签页选择日期范围，点击「导出数据 Export data」，获得 Content CSV。</li>
          <li>在「概览 Overview」标签页选择相同日期范围，点击「导出数据 Export data」，获得 Overview CSV。</li>
          <li>把 CSV 文件拖入上方区域即可。导入后系统会识别字段；识别不准时可手动调整映射。</li>
        </ol>
        <div className={styles.fieldList}>
          <div>
            <strong>Content CSV 常见字段</strong>
            <p className="muted small">帖子 ID、帖子链接、帖子正文、时间、曝光量、点赞、回复、转发、引用、收藏、主页点击、新增关注等</p>
          </div>
          <div>
            <strong>Overview CSV 常见字段</strong>
            <p className="muted small">日期、曝光量、点赞、回复、转发、引用、主页访问、新增关注、取消关注、提及等</p>
          </div>
        </div>
      </div>

      <Notice tone="muted">
        <div className="small" style={{ display: 'flex', gap: 8 }}>
          <Lock size={14} style={{ flex: 'none', marginTop: 2 }} />
          <span>
            隐私保证：文件仅在当前浏览器中解析与计算，不上传、不发送给第三方；刷新或关闭后默认清除。本产品为独立第三方项目，
            与 X Corp. 无隶属关系，不代表 X 官方结论。
          </span>
        </div>
      </Notice>

      <Modal open={pending !== null} title="确认字段映射" onClose={cancelImport} wide>
        {pending ? (
          <FieldMappingEditor pending={pending} onCommit={commitImport} onCancel={cancelImport} />
        ) : null}
      </Modal>
    </div>
  );
}
